---
stepsCompleted: []
inputDocuments:
  - prd.md
  - architecture.md
workflowType: 'epics-and-stories'
project_name: 'skill-hub'
user_name: 'Ray'
date: '2026-03-17'
status: draft
---

# skill-hub Epics 与 User Stories

## 说明

本文档基于 `_bmad-output/planning-artifacts/prd.md` 与 `_bmad-output/planning-artifacts/architecture.md` 拆解出适合 MVP 推进的 Epic 与 User Story。拆解原则如下：

- 先覆盖 MVP 必须能力，再覆盖增强与扩展能力
- 每个 Epic 按用户价值或可交付主题组织，而不是按技术分层组织
- 每条 Story 尽量保持“可独立开发、可验收、可追踪”
- 每条 Story 都可回溯到 PRD 的成功标准、功能需求或架构模块

## 拆解总览

### Epic 1：统一 Skill 源与 Metadata 基础设施

目标：建立 canonical `skills/` 源目录、manifest 解析与基础校验能力，为后续 registry、adapter 和 CLI 提供稳定输入。

### Epic 2：Registry 与工作区状态管理

目标：建立受管 skills 的索引、agent 配置与安装状态追踪模型，使系统知道“有哪些 skill”“支持哪些 agent”“当前同步到了哪里”。

### Epic 3：CLI 查询与诊断体验

目标：让用户可以通过 `list`、`inspect`、`doctor` 直接使用 skill-hub 的基础价值，并在不执行 sync 的情况下发现问题。

### Epic 4：Adapter 框架与 Codex / OpenClaw 同步

目标：建立 adapter contract 和同步编排能力，完成 MVP 的两个首发目标 Agent：Codex 与 OpenClaw。

### Epic 5：同步可靠性与可扩展性增强

目标：补足幂等同步、错误恢复、dry-run 思路、扩展新 adapter 的可维护机制，为后续 Phase 2 打底。

## Epic 1：统一 Skill 源与 Metadata 基础设施

### Epic 目标

用户能够把本地 skill 按统一目录结构纳管，并通过结构化 manifest 获得稳定、可解析、可校验的 skill 描述。

### Story 1.1：定义 canonical skill 目录规范

**作为** skill-hub 的维护者  
**我希望** 系统明确规定 canonical skill 的目录结构  
**从而** 所有后续模块都能基于一致输入工作。

**验收标准：**

- 明确定义 skill 目录至少包含 `SKILL.md` 和 `manifest.json`
- 允许存在可选的 `scripts/` 与 `resources/`
- 系统能够区分合法 skill 目录与普通文件夹
- 目录规范被文档化并能被后续模块直接消费

**依赖：** 无

### Story 1.2：定义 `SkillManifest` 最小字段集合

**作为** skill-hub 的维护者  
**我希望** 为每个 skill 定义最小可用 metadata schema  
**从而** CLI、registry 与 adapter 不需要从自由文本中猜测结构化信息。

**验收标准：**

- manifest 至少包含 `name`、`version`、`entry`、`tags`、`triggers`、`compatibleAgents`
- schema 可以检测字段缺失、字段类型错误和空值问题
- schema 支持保留可选扩展字段但不影响 MVP 校验
- schema 被封装为可复用的 core 模块

**依赖：** Story 1.1

### Story 1.3：实现 skill 扫描能力

**作为** skill-hub 用户  
**我希望** 系统可以扫描 `skills/` 目录并发现所有候选 skill 目录  
**从而** 我不必手工注册每个 skill 的基础路径。

**验收标准：**

- 系统可以扫描指定 `skills/` 根目录
- 系统可以返回全部候选 skill 目录列表
- 非法目录不会导致整个扫描流程失败
- 扫描结果可被 registry 生成逻辑复用

**依赖：** Story 1.1

### Story 1.4：实现 manifest 加载与校验

**作为** skill-hub 用户  
**我希望** 系统在扫描后自动校验每个 skill 的 manifest  
**从而** 我能尽早发现 metadata 问题。

**验收标准：**

- 系统可以加载每个候选 skill 的 `manifest.json`
- 系统可以识别缺失 entry、缺失必填字段和 JSON 格式错误
- 校验失败的 skill 会被标记为无效，但不会阻断其他 skill 处理
- 校验结果包含可读的错误原因

**依赖：** Story 1.2、Story 1.3

### Story 1.5：生成 skill 源摘要模型

**作为** skill-hub 内部模块  
**我希望** 在扫描和校验后得到统一的 skill 源摘要对象  
**从而** registry、CLI 和 adapter 不需要重复解析目录结构。

**验收标准：**

- 系统生成统一的 skill descriptor 或类似摘要模型
- 摘要模型至少包含路径、entry、manifest 核心字段和校验状态
- 该模型可以序列化给 registry 层使用
- 该模型不包含 Agent 特定逻辑

**依赖：** Story 1.4

## Epic 2：Registry 与工作区状态管理

### Epic 目标

系统能够维护受管 skill 索引、agent 定义和同步状态，清楚表达“源事实”和“同步结果”的区别。

### Story 2.1：实现 registry 索引生成

**作为** skill-hub 用户  
**我希望** 系统把有效 skills 生成结构化索引  
**从而** 后续查询与同步可以直接基于 registry 工作。

**验收标准：**

- 系统能够从有效 skill 摘要生成 `registry/index.json`
- 索引至少包含 `name`、`version`、`path`、`entry`、`tags`、`triggers`、`compatibleAgents`
- 索引生成过程可重复执行且结果稳定
- 重建索引不会依赖旧状态文件

**依赖：** Epic 1 完成

### Story 2.2：定义 agent 配置模型

**作为** skill-hub 维护者  
**我希望** 系统以结构化方式保存支持的 Agent 定义  
**从而** adapter 与 CLI 可以按统一方法获取目标 Agent 信息。

**验收标准：**

- 系统存在 `registry/agents.json` 或等价配置文件
- 每个 agent 至少包含 `agentName`、`adapterName`、`defaultInstallPath`、`syncMode`
- 配置可扩展到未来 Agent，而不影响已有 agent
- CLI 和 sync 服务可以读取该配置

**依赖：** Story 2.1

### Story 2.3：实现 install state 持久化

**作为** skill-hub 用户  
**我希望** 系统记录 skill 与 agent 的安装状态  
**从而** 我可以知道哪些 skill 已同步、同步到哪里、源版本是什么。

**验收标准：**

- 系统可写入 `state/installs.json`
- 每条记录至少包含 `skillName`、`agentName`、`sourcePath`、`targetPath`、`version`、`sourceHash`、`status`
- 状态文件更新不会覆盖无关记录
- 状态文件可被 `inspect` 与 `doctor` 读取

**依赖：** Story 2.2

### Story 2.4：实现 sync history 持久化

**作为** skill-hub 用户  
**我希望** 系统保留同步历史  
**从而** 当同步失败时我能回溯问题。

**验收标准：**

- 系统可写入 `state/sync-history.json`
- 每条记录至少包含开始时间、结束时间、目标 agent、结果和错误信息
- 成功与失败的同步都可被记录
- 历史记录不会破坏当前 install state

**依赖：** Story 2.3

### Story 2.5：实现 registry 与 state 的重建边界

**作为** skill-hub 维护者  
**我希望** 系统明确 canonical source、registry 与 state 的关系  
**从而** 在状态损坏时可以安全恢复。

**验收标准：**

- 系统以 canonical source 作为唯一源事实
- registry 可由 source 重新生成
- state 删除后不会导致 source 信息丢失
- 文档或实现中明确禁止 state 反向定义源事实

**依赖：** Story 2.1、Story 2.3

## Epic 3：CLI 查询与诊断体验

### Epic 目标

用户在不执行同步之前，也能通过 CLI 获得完整可见性：我有哪些 skills、它们是否有效、目前状态如何、哪里有问题。

### Story 3.1：实现 `skillhub list`

**作为** skill-hub 用户  
**我希望** 通过一条命令看到全部托管 skills  
**从而** 快速确认系统识别结果。

**验收标准：**

- `skillhub list` 可以列出全部受管 skills
- 输出至少包含名称、版本、兼容 Agent、校验状态、同步状态
- 非法 skill 也会以可识别方式显示，而不是完全消失
- 命令在典型本地工作区内满足 PRD 规定的性能目标

**依赖：** Epic 1、Epic 2

### Story 3.2：实现 `skillhub inspect <skill>`

**作为** skill-hub 用户  
**我希望** 能查看单个 skill 的详细信息  
**从而** 明确它为什么可用、不可用或未同步。

**验收标准：**

- 命令可以按 skill 名称定位目标 skill
- 输出至少包含路径、entry、tags、triggers、compatibleAgents、当前安装状态
- 如果 skill 无效，输出必须明确原因
- 如果 skill 不存在，返回明确错误与退出码

**依赖：** Story 3.1

### Story 3.3：实现 `skillhub doctor`

**作为** skill-hub 用户  
**我希望** 系统能主动检查工作区健康度  
**从而** 在 sync 之前发现路径、manifest 和配置问题。

**验收标准：**

- doctor 会检查 `skills/`、registry、state、agent 配置和目标路径
- doctor 能发现 manifest 错误、entry 缺失、adapter 缺失、路径冲突和权限问题
- doctor 输出为 actionable diagnostics，而不是笼统提示
- doctor 不执行任何破坏性操作

**依赖：** Epic 1、Epic 2

### Story 3.4：统一 CLI 输出与退出码规范

**作为** skill-hub 用户  
**我希望** 各命令输出风格和退出码一致  
**从而** 我能稳定地理解命令结果，也能在脚本中复用这些命令。

**验收标准：**

- 成功、警告、失败状态有清晰区分
- 非零退出码只用于失败或不可忽略的问题
- 输出风格在 list、inspect、doctor、sync 之间保持一致
- 错误消息必须指出 failing skill、failing agent 或 failing path

**依赖：** Story 3.1、Story 3.2、Story 3.3

## Epic 4：Adapter 框架与 Codex / OpenClaw 同步

### Epic 目标

系统能够通过统一 adapter contract，把兼容的 canonical skills 安全同步到 Codex 和 OpenClaw。

### Story 4.1：定义 adapter contract

**作为** skill-hub 架构维护者  
**我希望** 所有 Agent adapter 都基于同一套最小接口实现  
**从而** 新 Agent 接入不需要修改 core 同步编排逻辑。

**验收标准：**

- adapter contract 至少覆盖 supports、resolveTargetPaths、sync 三类能力
- core sync 服务可以只依赖该接口而不关心 Agent 细节
- contract 足以支持首批 Codex 和 OpenClaw 两个 adapter
- contract 不提前抽象未来未知 Agent 的特殊能力

**依赖：** Epic 2 完成

### Story 4.2：实现 sync 服务编排逻辑

**作为** skill-hub 用户  
**我希望** 系统统一编排 sync 流程  
**从而** 不同 adapter 的同步行为都能走一致的 preflight、执行和状态更新流程。

**验收标准：**

- sync 服务可以解析目标 agent 并选择 adapter
- sync 服务会先检查 skill 是否兼容该 agent
- sync 服务会执行 preflight 校验再调用 adapter
- sync 结果会写入 install state 与 sync history

**依赖：** Story 4.1

### Story 4.3：实现 Codex adapter

**作为** 使用 Codex 的用户  
**我希望** 可以把兼容 skill 同步到 Codex 目录  
**从而** 直接在 Codex 环境中使用这些 skill。

**验收标准：**

- Codex adapter 能解析默认安装路径
- Codex adapter 支持 MVP 所需的同步方式
- 同步完成后能在目标目录形成可消费的 skill 结构
- 失败时不会破坏 canonical source

**依赖：** Story 4.2

### Story 4.4：实现 OpenClaw adapter

**作为** 使用 OpenClaw 的用户  
**我希望** 可以把兼容 skill 同步到 OpenClaw 目录  
**从而** 在 OpenClaw 中复用相同 skill 能力。

**验收标准：**

- OpenClaw adapter 能解析默认安装路径
- OpenClaw adapter 支持 MVP 所需的同步方式
- 同步完成后能在目标目录形成可消费的 skill 结构
- 失败时不会破坏 canonical source

**依赖：** Story 4.2

### Story 4.5：实现 `skillhub sync --agent <agent>`

**作为** skill-hub 用户  
**我希望** 用一条命令把 skills 同步到指定 Agent  
**从而** 不必自己执行一系列复制、转换和记录动作。

**验收标准：**

- 命令能接受合法 agent 参数并触发对应 adapter
- 命令会跳过不兼容的 skill，并明确说明原因
- 命令输出成功、跳过、失败汇总
- 命令成功后更新 install state 与 sync history

**依赖：** Story 4.3、Story 4.4

## Epic 5：同步可靠性与可扩展性增强

### Epic 目标

在 MVP 主链路跑通后，增强同步过程的稳定性、排障能力和后续扩展空间。

### Story 5.1：实现同步幂等性检查

**作为** skill-hub 用户  
**我希望** 对未变化的 source 重复执行 sync 时不会产生不必要改动  
**从而** 同步结果可预测、可重复。

**验收标准：**

- 系统能基于 sourceHash 或等价机制识别未变化技能
- 未变化 skill 的重复同步不会重复写入无意义内容
- install state 会保留最近一次成功同步信息
- sync 汇总会区分“已同步且无需变更”与“本次有变更”

**依赖：** Epic 4 完成

### Story 5.2：增强路径冲突与目标目录安全检查

**作为** skill-hub 用户  
**我希望** 在同步前发现目标路径冲突或危险覆盖行为  
**从而** 避免误伤已有 Agent 目录内容。

**验收标准：**

- 系统可以识别目标路径不存在、不可写、已被其他 skill 占用等情况
- 冲突在真正写入前就被发现
- 错误信息明确指出冲突路径与受影响 skill
- 冲突不会导致 canonical source 被更改

**依赖：** Story 4.5

### Story 5.3：为 sync 增加 dry-run 或等价预览能力

**作为** skill-hub 用户  
**我希望** 在真正同步前预览将要发生的变更  
**从而** 我可以更安心地执行跨 Agent 分发。

**验收标准：**

- 用户可以查看将被同步、跳过和失败的 skill 列表
- 预览输出包含目标 agent 与目标路径信息
- dry-run 不产生任何实际文件写入
- 预览逻辑与真实 sync 的 preflight 结果一致

**依赖：** Story 4.5

### Story 5.4：为新 adapter 接入定义最小开发流程

**作为** 后续 adapter 开发者  
**我希望** 有一套最小接入流程与模板  
**从而** 新 Agent 的接入可以低风险复制现有模式。

**验收标准：**

- 文档化新增 adapter 所需的最小步骤
- 至少覆盖 adapter 文件、agent 配置、目标路径定义和兼容性声明
- 新 adapter 不需要修改已有 canonical skill 结构
- 开发流程能复用 Codex/OpenClaw 的已有经验

**依赖：** Story 4.1、Story 4.5

## 依赖关系总览

- Epic 1 是基础 Epic，所有后续 Epic 都依赖它
- Epic 2 依赖 Epic 1，提供 registry 与 state 能力
- Epic 3 依赖 Epic 1 与 Epic 2
- Epic 4 依赖 Epic 2，并通过 Epic 1 的 manifest/schema 输入工作
- Epic 5 依赖 Epic 4

推荐实施顺序：

1. Epic 1：统一 Skill 源与 Metadata 基础设施
2. Epic 2：Registry 与工作区状态管理
3. Epic 3：CLI 查询与诊断体验
4. Epic 4：Adapter 框架与 Codex / OpenClaw 同步
5. Epic 5：同步可靠性与可扩展性增强

## Story 与 PRD / 架构追踪关系

- Epic 1 对应 PRD 中的 `FR1`-`FR6`，以及架构中的 canonical source / manifest 模块
- Epic 2 对应 PRD 中的 `FR7`-`FR9`、`FR21`-`FR22`，以及架构中的 registry / state 模块
- Epic 3 对应 PRD 中的 `FR16`-`FR20` 与性能、可维护性相关 NFR
- Epic 4 对应 PRD 中的 `FR10`-`FR15`，以及架构中的 adapter contract / sync service
- Epic 5 对应 PRD 中的幂等、安全、可扩展性相关 NFR，以及架构中的错误恢复、路径边界和扩展机制

## 建议的 MVP 截止线

如果只以“可交付 MVP”为目标，建议以以下故事集作为第一版交付边界：

- Epic 1 全部故事
- Epic 2 全部故事
- Epic 3 中 Story 3.1、3.2、3.3、3.4
- Epic 4 中 Story 4.1、4.2、4.3、4.4、4.5

Epic 5 可作为 MVP 后半段或 v0.2 增强项，其中：

- Story 5.1 和 5.2 建议优先
- Story 5.3 和 5.4 可后置

## 结论

这版 Epic 与 User Story 拆解的核心价值，是把 `skill-hub` 从“概念正确、架构清晰”推进到“可以直接排顺序实现”。它把 canonical source、metadata、registry、CLI、adapter、state 六大能力拆成了可追踪、可开发、可验收的执行单元，能够直接作为后续技术实现或进一步拆任务的基础。
