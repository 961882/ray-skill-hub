---
stepsCompleted: []
inputDocuments:
  - conversation-2026-03-17-github-skills-and-skillhub.md
  - prd.md
workflowType: 'architecture'
project_name: 'skill-hub'
user_name: 'Ray'
date: '2026-03-17'
status: draft
---

# skill-hub 技术架构文档

## 架构目标

skill-hub 的架构目标是把“本地已安装或本地维护的 skill”统一成一个可发现、可校验、可同步、可扩展的本地能力层。该系统不负责替代各 Agent 的执行模型，也不在 MVP 阶段承担远程调用职责。它的责任是提供：

- 一份 canonical skill 源
- 一套稳定的 metadata 与 registry 模型
- 一组可扩展的 Agent adapter
- 一个低成本、本地优先的 CLI 控制面

架构必须满足四个核心约束：

- 本地优先，不依赖网络与后台服务
- adapter-first，新 Agent 接入不破坏核心模型
- 状态可追踪，sync 结果可重放、可排障
- 模块边界明确，便于后续增加 run、MCP 或发布能力

## 关键架构决策

### 决策 1：采用单一 canonical skill 源目录

系统以统一的 `skills/` 目录作为唯一事实来源。所有纳管的 skill 都以目录形式存在，并包含 `SKILL.md`、`manifest.json`、可选的 `scripts/` 与 `resources/`。

这样设计的原因：

- 避免每个 Agent 各自维护一份 skill 副本
- 把“内容管理”和“目标 Agent 适配”解耦
- 使 registry 和状态文件可从同一源稳定推导

### 决策 2：用 `manifest.json` 承担机器可读 metadata

`SKILL.md` 继续面向 Agent 或人类阅读，`manifest.json` 负责结构化信息，例如 skill 名称、版本、入口、标签、触发词、兼容 Agent、依赖声明和分发策略。

这样设计的原因：

- 避免从自由文本中推断结构化信息
- 支持 CLI、registry、adapter 进行稳定解析
- 为未来新增兼容性校验、模板生成和发布流程打基础

### 决策 3：registry 与 state 分离

系统把“技能目录事实”和“运行时同步状态”拆成两层：

- `registry/` 保存受管 skill 索引与 agent 配置
- `state/` 保存安装状态与同步历史

这样设计的原因：

- registry 可以表达“应该有什么”
- state 可以表达“已经同步成什么样”
- 两者分离后更容易实现重建、排错和幂等同步

### 决策 4：adapter 是唯一的 Agent 差异吸收层

Codex、OpenClaw、Claude Code 等工具在路径、目录布局、元数据要求和导入方式上存在差异。所有差异都必须收敛在 adapter 层，而不能扩散到 core 逻辑。

这样设计的原因：

- 降低新增 Agent 的改动范围
- 保持 core 模块不被条件分支污染
- 让 CLI 面向统一抽象，而不是面向具体工具细节

### 决策 5：MVP 使用 CLI-first shared control plane

MVP 不引入 MCP、daemon、HTTP API 或其他远程控制层。所有能力通过本地 CLI 触发，但这层 CLI 不只服务 human terminal user，也服务 OpenClaw 这类本地 operator agent。

这样设计的原因：

- 更省 token 与运行成本
- 更易调试
- 更适合当前“本地技能互通”的产品目标
- 给未来远程接口留出明确可封装的底层能力

### 决策 6：Human renderer 与 JSON contract 共用同一套 command result

CLI 层必须把“文本显示”和“结构化返回”分开。human 看到的是 renderer 产物，agent 消费的是稳定的 JSON envelope，但两者都必须来自同一套 core result。

这样设计的原因：

- 避免 human path 与 agent path 逻辑分叉
- 让 OpenClaw 可以稳定消费 `--json`
- 让未来 HTTP API / daemon 可以直接复用 command contracts

## 系统上下文

### 系统边界

skill-hub 位于“本地 skill 资产”与“两类消费者”之间：

- 上游输入：用户维护的本地 canonical skills
- 中间层：registry、validation、adapter、sync、state、command contracts
- 下游目标 A：Codex、OpenClaw 等 Agent 的 skill 消费目录
- 下游目标 B：Human CLI user 与 OpenClaw operator agent

系统外部依赖主要是：

- 本地文件系统
- 各 Agent 的 skill 加载规则
- 用户命令行环境

MVP 不依赖：

- 云端数据库
- 后台常驻进程
- 远程执行协议

## 高层架构

```text
                +-------------------------+
                |      Canonical Skills   |
                |       skills/<name>/    |
                +------------+------------+
                             |
                             v
                +-------------------------+
                |   Discovery + Validator |
                |   manifest / entry check|
                +------------+------------+
                             |
                             v
                +-------------------------+
                |        Registry         |
                | index.json / agents.json|
                +------+-----------+------+
                       |           |
                       |           v
                       |   +---------------+
                       |   | Install State |
                       |   | installs/history
                       |   +-------+-------+
                       |           |
                       v           v
                +-------------------------+
                | Core Services / Sync    |
                | list inspect doctor run |
                +------------+------------+
                             |
                             v
                +-------------------------+
                |    Command Contracts    |
                | status/exitCode/data    |
                +------+-----------+------+
                       |           |
             +---------+           +---------+
             v                               v
    +----------------+              +--------------------+
    | Human Renderer |              | JSON Renderer      |
    | terminal text  |              | OpenClaw / scripts |
    +--------+-------+              +---------+----------+
             |                                |
             v                                v
    +----------------+              +--------------------+
    | Human CLI User |              | Operator Agent     |
    +----------------+              +--------------------+
```

## 控制面分层

### Human path

- 面向终端阅读
- 按任务流组织文档
- 优先给出可执行文本与 suggestion

### Agent path

- 默认通过 `--json` 调用
- 依赖稳定 envelope：`status / exitCode / output / data`
- 依赖 machine-readable `reasonCode` / `suggestion`
- 不应依赖自由文本解析

## 模块划分

### 1. CLI 层

职责：

- 解析命令参数
- 调用应用服务
- 选择 human renderer 或 JSON renderer
- 设定退出码

MVP 命令：

- `skillhub list`
- `skillhub inspect <skill>`
- `skillhub sync --agent <agent>`
- `skillhub doctor`

约束：

- CLI 不能直接操作文件系统业务逻辑
- CLI 不能知道具体 Agent 的安装细节
- CLI 只依赖 application/core 暴露的服务接口

### 1.1 Command contract 层

职责：

- 定义统一的命令结果 envelope
- 为 human renderer 和 JSON renderer 提供共享输入
- 为 OpenClaw operator agent 提供稳定消费面

建议结构：

```ts
interface CommandResult<T = unknown> {
  output: string;
  exitCode: number;
  data?: T;
}
```

JSON envelope 建议结构：

```json
{
  "status": "success | warning | error",
  "exitCode": 0,
  "output": "human-readable summary",
  "data": {}
}
```

### 2. Core / Application 层

职责：

- 扫描 skills 目录
- 加载与校验 manifest
- 构建 registry
- 选择 adapter
- 调用 sync 服务
- 更新 state

建议子模块：

- `manifest.ts`：manifest schema 与校验逻辑
- `registry.ts`：索引生成与查询
- `sync.ts`：同步编排
- `install-state.ts`：安装状态持久化
- `paths.ts`：路径解析与工作区定位

### 3. Adapter 层

职责：

- 描述目标 Agent 的安装位置
- 定义同步方式
- 处理必要的转换逻辑
- 提供目标 Agent 的兼容性判断

MVP adapter：

- `codex.ts`
- `openclaw.ts`

统一接口建议：

```ts
interface AgentAdapter {
  name: string;
  supports(skill: SkillManifest): AdapterSupportResult;
  resolveTargetPaths(context: AdapterContext): TargetPaths;
  sync(input: SyncInput): Promise<SyncResult>;
  inspect?(context: AdapterContext): Promise<AdapterInspection>;
}
```

约束：

- adapter 不负责 registry 生成
- adapter 不直接解析 CLI 参数
- adapter 只能处理目标 Agent 特有差异

### 4. Registry 层

职责：

- 保存受管 skill 索引
- 保存支持的 Agent 定义
- 暴露技能查询能力

建议文件：

- `registry/index.json`
- `registry/agents.json`

`index.json` 建议字段：

- `name`
- `version`
- `path`
- `entry`
- `tags`
- `triggers`
- `compatibleAgents`
- `manifestHash`

`agents.json` 建议字段：

- `agentName`
- `adapterName`
- `defaultInstallPath`
- `syncMode`
- `supportsTransform`

### 5. State 层

职责：

- 记录某个 skill 是否已经同步到某个 Agent
- 记录同步时间、目标路径、源版本/hash
- 为 doctor 与二次同步提供依据

建议文件：

- `state/installs.json`
- `state/sync-history.json`

设计原则：

- state 是运行结果，不是源事实
- state 可以删除并通过重新扫描与重新同步恢复
- state 更新必须尽量原子，避免半写入状态

## 数据模型

### SkillManifest

建议最小字段：

```json
{
  "name": "github-repo-search",
  "version": "0.1.0",
  "entry": "SKILL.md",
  "tags": ["github", "search"],
  "triggers": ["找 GitHub 项目", "repo search"],
  "compatibleAgents": ["codex", "openclaw"]
}
```

建议扩展字段：

- `description`
- `scripts`
- `resources`
- `installHints`
- `adapterOverrides`
- `dependencies`
- `visibility`

### InstallRecord

建议字段：

- `skillName`
- `agentName`
- `sourcePath`
- `targetPath`
- `version`
- `sourceHash`
- `installedAt`
- `lastSyncedAt`
- `status`
- `syncMode`

### SyncHistoryRecord

建议字段：

- `id`
- `skillName`
- `agentName`
- `startedAt`
- `finishedAt`
- `result`
- `changedFiles`
- `errorMessage`

## 关键运行流程

### 流程 1：`skillhub list`

1. 读取 canonical `skills/` 目录
2. 扫描 skill 文件夹
3. 加载并校验 `manifest.json`
4. 结合 registry / installs state 输出列表

输出重点：

- skill 名称
- 版本
- tags
- 兼容 Agent
- 当前同步状态

### 流程 2：`skillhub inspect <skill>`

1. 从 registry 中查找 skill
2. 加载 manifest 与入口信息
3. 读取当前安装状态
4. 输出详细信息与潜在问题

输出重点：

- skill 路径
- entry
- triggers
- compatibleAgents
- 已同步目标
- 缺失项或警告

### 流程 3：`skillhub sync --agent <agent>`

1. 解析 agent 名称
2. 选择对应 adapter
3. 筛选兼容该 Agent 的 skills
4. 对每个 skill 执行 preflight 校验
5. 调用 adapter `sync`
6. 更新 installs state 与 sync history
7. 输出成功、跳过、失败汇总

### 流程 4：`skillhub doctor`

1. 检查工作区结构是否完整
2. 检查 `skills/` 下 manifest 与 entry 是否有效
3. 检查 registry 与 state 是否可读
4. 检查 agent 配置是否合法
5. 检查目标路径权限与冲突情况
6. 输出 actionable diagnostics

### 流程 5：OpenClaw agent 调用本地控制面

1. 调用 `skillhub doctor --json` 判断工作区是否适合执行写操作
2. 调用 `skillhub inspect <skill> --json` 获取结构化 metadata
3. 必要时调用 `skillhub sync --agent <agent> --skill <skill> --dry-run --json`
4. 仅在显式允许时才执行真实写操作或 `run --exec`

这个流程要求：

- 默认非交互
- 默认先读后写
- 高风险操作显式 opt-in
- 所有关键失败都带 `reasonCode` 和 `suggestion`

## 目录结构建议

```text
skill-hub/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── cli/
│   │   └── index.ts
│   ├── commands/
│   │   ├── list.ts
│   │   ├── inspect.ts
│   │   ├── sync.ts
│   │   └── doctor.ts
│   ├── core/
│   │   ├── registry.ts
│   │   ├── manifest.ts
│   │   ├── sync.ts
│   │   ├── install-state.ts
│   │   └── paths.ts
│   ├── adapters/
│   │   ├── base.ts
│   │   ├── codex.ts
│   │   ├── openclaw.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── skill.ts
│   │   └── agent.ts
│   └── utils/
│       ├── fs.ts
│       ├── hash.ts
│       └── logger.ts
├── skills/
├── registry/
│   ├── index.json
│   └── agents.json
├── state/
│   ├── installs.json
│   └── sync-history.json
└── templates/
    └── manifest.json
```

## 错误处理与恢复策略

### 校验阶段失败

如果 manifest、entry 或目录结构不合法：

- 该 skill 不进入可同步集合
- `doctor` 和 `inspect` 必须报告明确错误
- 不应影响其他 skill 的 list / sync

### 同步阶段失败

如果 adapter 同步某个 skill 失败：

- 记录失败结果到 sync history
- 不破坏 canonical source
- 尽可能保留目标目录当前稳定状态
- 继续处理其他独立 skill，并在汇总中显示失败项

### 状态写入失败

如果 state 更新失败：

- CLI 必须报告“同步结果与状态记录可能不一致”
- 下次运行 `doctor` 时应能识别该不一致
- 状态文件写入应使用临时文件替换策略减少损坏风险

## 安全与边界控制

MVP 的安全目标不是建立复杂权限系统，而是避免本地工具把事情做坏。

必须保证：

- `list`、`inspect`、validation 不执行任意脚本
- 文件操作只在允许路径内发生
- adapter 不得无界访问用户主目录
- 错误输出避免误导用户删除 canonical source

暂不处理：

- 远程身份认证
- 多用户协作权限模型
- 远程代码执行安全模型

## 可扩展性设计

未来扩展主要沿三个方向展开：

### 1. 新 Agent Adapter

通过新增 adapter 文件和 agent 配置接入 OpenCode、Claude Code、Kiro 等。前提是 adapter contract 保持稳定。

### 2. 执行能力

未来增加 `skillhub run` 时，应建立在已有 registry、manifest 和 adapter 体系之上，而不是引入第二套 skill 发现模型。

### 3. 远程接口

未来如需 MCP、HTTP API 或 daemon，应把 command contracts / core services 作为底层能力封装出去，而不是跳过现有控制面直接耦合 core。

## 架构风险与应对

### 风险 1：adapter 抽象不稳定

如果 adapter contract 设计过早过细，会导致新增 Agent 时频繁改接口。

应对：

- 先围绕 Codex 和 OpenClaw 两个 adapter 提炼最小公共接口
- 不把未来 Agent 的特殊需求提前抽象进 MVP

### 风险 2：manifest 设计过轻或过重

如果字段太少，CLI 与 adapter 无法稳定工作；如果字段太多，用户维护成本变高。

应对：

- MVP 只保留最小必填字段
- 把实验性字段放入可选扩展区域

### 风险 3：registry 与 state 漂移

如果 registry、state、canonical source 三者更新顺序不清晰，会导致显示结果和真实安装状态不一致。

应对：

- 明确以 canonical source 为源事实
- registry 可重建
- state 记录结果但不能反向定义源事实

## MVP 实施顺序建议

### 阶段 1：模型与扫描

- 定义 `SkillManifest` schema
- 实现 `skills/` 扫描
- 实现 registry 生成

### 阶段 2：CLI 与诊断

- 完成 `list`
- 完成 `inspect`
- 完成 `doctor`

### 阶段 3：同步能力

- 定义 adapter contract
- 完成 `codex` adapter
- 完成 `openclaw` adapter
- 实现 state / history 持久化

### 阶段 4：稳定性增强

- 增加幂等校验
- 增加路径冲突检查
- 增加 dry-run 或更清晰的 sync 汇总

## 与 PRD 的追踪关系

本架构直接对应 PRD 中的关键需求：

- PRD 的“统一 canonical source” → 架构中的 `skills/` 源目录
- PRD 的“metadata/registry” → 架构中的 manifest + registry 分层
- PRD 的“adapter-first” → 架构中的 adapter contract 与 per-agent 实现
- PRD 的“CLI 控制面” → 架构中的 commands + application services
- PRD 的“install state / sync history” → 架构中的 state 层
- PRD 的“未来可扩展到更多 Agent / run / MCP” → 架构中的扩展性设计

## 结论

skill-hub 的最佳 MVP 架构不是通用多 Agent 平台，也不是协议桥，而是一个本地优先、adapter-first 的 skill 包管理与同步系统。它用 canonical source、manifest、registry、adapter、CLI、state 六个核心构件，把“本地 skills 在多个 Agent 中复用”这个问题压缩成清晰、可实现、可扩展的工程结构。

在这个架构下，MVP 可以先稳定服务 Codex 与 OpenClaw，再逐步扩展到更多 Agent 和更高层能力，而不需要推翻最初的设计基础。
