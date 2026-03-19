# Command Contracts

## 目标

本文件定义 `RaySkillHub` 作为 shared control plane 时，命令返回结构的稳定约定。

读者主要包括：

- OpenClaw agent
- 其他本地脚本调用者
- 未来可能接入的 daemon / HTTP API 层

## 通用约定

### Contract version

当前文档描述的是 `v0` 阶段的本地 command contracts。

这意味着：

- 结构已经可供 OpenClaw 等 agent 稳定消费
- 但仍允许在保持兼容的前提下继续增量扩展
- 未来如果出现真正的 breaking change，应提升 contract version，并在文档里显式标出

### 全局 JSON 模式

所有主要命令都支持：

```bash
node dist/cli/index.js <command> --json
```

说明：当前 npm/package 标识为 `ray-skill-hub`，CLI 二进制名为 `rayskillhub`。本文件中的示例优先使用 `node dist/cli/index.js`，以便直接在源码仓库中执行。

### JSON envelope

```json
{
  "contractVersion": "v0",
  "command": "sync",
  "status": "success | warning | error",
  "operation": "read | write",
  "writeIntent": "none | dry_run | conditional_mutating | mutating",
  "exitCode": 0,
  "output": "human-readable summary",
  "data": {}
}
```

说明：

- `status`：给 agent 的粗粒度状态
- `exitCode`：系统退出码
- `output`：面向人类的摘要，可记录但不建议作为主解析对象
- `data`：面向 agent 的主消费对象
- `contractVersion`：当前命令 contract 版本
- `command`：当前结果对应的命令名
- `operation`：命令意图（只读或可能写入）
- `writeIntent`：写入强度（不写 / dry-run / 条件写入 / 明确写入）

权威性约定：

- 顶层 envelope 的 `operation` / `writeIntent` 是主协议字段。
- `data.executionIntent` 是命令数据内部的镜像便利字段；在 `v0` 中应与顶层保持一致。

### 退出码

- `0`：success
- `1`：warning
- `2`：error

## 命令级 contract

### operation/writeIntent 语义基线

- `list` / `inspect` / `doctor`：`operation=read`，`writeIntent=none`
- `sync --dry-run`：`operation=write`，`writeIntent=dry_run`
- `sync`（无 dry-run）：`operation=write`，`writeIntent=mutating`
- `run`（无 `--exec`）：`operation=write`，`writeIntent=conditional_mutating`
- `run --exec`：`operation=write`，`writeIntent=mutating`
- `init-skill`：`operation=write`，`writeIntent=mutating`

解释：

- `operation/writeIntent` 表示“可能副作用的前瞻上界”，不等于“本次一定发生写入”。
- 实际是否发生写入，应结合具体结果字段判断（例如 `sync.dryRun`、`sync.success/skipped/failed`、`run.installStatus`）。

### `list --json`

`data` 是数组，每个元素至少包含：

- `name`
- `version`
- `compatibleAgents`
- `compatibleCount`
- `installedCount`
- `missingAgents`
- `missingCount`
- `hasRunScript`
- `canExec`
- `installStatuses`

### `inspect <skill> --json`

`data` 至少包含：

- `name`
- `directoryName`
- `skillPath`
- `manifestPath`
- `entryPath`
- `compatibleAgents`
- `compatibleCount`
- `installedCount`
- `missingAgents`
- `missingCount`
- `hasRunScript`
- `canExec`
- `issues`
- `installs`
- `recentHistory`

### `doctor --json`

`data` 是对象，至少包含：

- `summary`
- `results`

`summary` 至少包含：

- `discoveredSkills`
- `configuredAgents`
- `installRecordCount`
- `historyRecordCount`
- `issueCounts`
- `codeGroups`
- `topRiskCodes`
- `riskLevel`

`summary.codeGroups` 每项至少包含：

- `code`
- `count`
- `highestSeverity`
- `riskLevel`

`summary.topRiskCodes` 与 `codeGroups` 使用相同结构，默认返回风险和频次综合排序后的前 3 项。

排序与消费建议：

- `codeGroups` 和 `topRiskCodes` 的数组顺序不属于稳定协议，不建议按索引位置做业务判断。
- agent 应按 `code` 建索引消费。
- `topRiskCodes` 是 triage 视图（非穷尽），完整判断应基于 `codeGroups` 或 `results`。

`results` 中的每项至少包含：

- `severity`
- `code`
- `message`
- `riskLevel`
- `suggestion`（如可用）
- `path`（如可用）

### `sync --json`

`data` 至少包含：

- `agentName`
- `dryRun`
- `noOp`
- `executionIntent`
- `repaired`
- `success`
- `skipped`
- `failed`

其中：

- `success` 用于成功同步结果
- `skipped` / `failed` 可能包含：
  - `reasonCode`
  - `reason`
  - `riskLevel`
  - `suggestion`
  - `details`
- `repaired` 用于记录自动修复或预览了哪些 stale install-state 冲突

`noOp` 语义：

- 当且仅当本次 `sync` 没有成功写入、没有失败、没有修复动作，且 `skipped` 全部为 `no_source_changes` 时为 `true`。
- `noOp=true` 表示“健康无变更”，对应 `status=success`（非 warning）。

`executionIntent` 至少包含：

- `operation`
- `writeIntent`

`repaired` 项至少包含：

- `skillName`
- `targetPath`
- `removedInstallFor`
- `reason`
- `mode`（`preview` 或 `performed`）

### `run --json`

`data` 至少包含：

- `skillName`
- `agentName`
- `targetPath`
- `entryPath`
- `installStatus`
- `executionIntent`
- `execRequested`
- `executed`
- `execution`（仅在 `--exec` 时出现）

错误路径：

- `run` 在错误路径也会返回结构化 `data`，至少包含：
  - `executionIntent`
  - `execRequested`
  - `executed`（固定为 `false`）
  - `error`
  - `skillName` / `agentName`（如可用）

`execution` 说明：

- `execution` 仅在 `--exec` 且命令成功产出执行结果时出现。
- 在错误路径下，即使请求了 `--exec`，也可能没有 `data.execution`；调用方应先依据顶层 `exitCode/status` 处理。
- `execRequested=true && executed=false` 明确表示“请求了执行，但未形成成功执行结果”。

`execution` 至少包含：

- `command`
- `exitCode`
- `stdout`
- `stderr`

成功示例（`run --exec --json`）：

```json
{
  "contractVersion": "v0",
  "command": "run",
  "status": "success",
  "operation": "write",
  "writeIntent": "mutating",
  "exitCode": 0,
  "output": "...",
  "data": {
    "skillName": "example-skill",
    "agentName": "openclaw",
    "targetPath": "/Users/ray/.openclaw/skills/example-skill",
    "entryPath": "/Users/ray/.../skills/example-skill/SKILL.md",
    "installStatus": "already-installed",
    "executionIntent": {
      "operation": "write",
      "writeIntent": "mutating"
    },
    "execRequested": true,
    "executed": true,
    "execution": {
      "command": "node -e \"process.stdout.write('OK')\"",
      "exitCode": 0,
      "stdout": "OK",
      "stderr": ""
    }
  }
}
```

失败示例（`run --exec --json`，脚本退出非 0）：

```json
{
  "contractVersion": "v0",
  "command": "run",
  "status": "error",
  "operation": "write",
  "writeIntent": "mutating",
  "exitCode": 2,
  "output": "scripts.run failed with exit code 1: ...",
  "data": {
    "skillName": "example-skill",
    "agentName": "openclaw",
    "executionIntent": {
      "operation": "write",
      "writeIntent": "mutating"
    },
    "execRequested": true,
    "executed": false,
    "error": "scripts.run failed with exit code 1: ..."
  }
}
```

## 稳定性约定

### 向后兼容策略

默认兼容策略如下：

- 新增字段：允许，agent 应忽略自己不认识的字段
- 新增 `details` 子字段：允许，视为向后兼容扩展
- 新增 `reasonCode` / `doctor code`：允许，只要旧 code 不变
- 调整 `output` 文本措辞：允许，agent 不应依赖文本做主解析
- 删除已文档化字段：不允许，除非提升 contract version
- 改变已文档化字段语义：不允许，除非提升 contract version

### 兼容性策略

agent 调用方应遵循：

- 依赖顶层 envelope 与已文档化 `data` 字段
- 容忍字段新增
- 不依赖字段顺序
- 不依赖 `output` 的具体行文
- 在看到未知 `reasonCode` 时，保留日志并回退到 `status + exitCode + message` 级别处理

### 变更分级

#### Patch 级变更

- 补测试
- 文本 `output` 优化
- 新增 `suggestion`
- 新增非关键 `details`

#### Minor 级变更

- 给现有 `data` 增加新字段
- 给现有命令增加新的可选模式
- 增加新的 `reasonCode` / `doctor code`

#### Major 级变更

- 删除已文档化字段
- 修改 `exitCode` 语义
- 修改 envelope 结构
- 修改已存在字段的含义

### 可依赖

- envelope 的顶层字段名
- 退出码语义
- 高频 `reasonCode` / `doctor code`
- 已写入测试的关键字段

### 可能继续扩展

- `data` 中新增字段
- `details` 中新增子字段
- `output` 文本样式

### 不建议 agent 依赖

- 文本 `output` 的行文细节
- 列表字段顺序
- 未文档化的临时字段
- 尚未声明版本策略的实验性字段

## 推荐消费方式

- 先看 `exitCode`
- 再看 `status`
- 主解析 `data`
- 把 `suggestion` 用于下一步决策
- 把 `output` 作为日志，而不是作为主协议

## 关联文档

- `docs/openclaw-agent-guide.md`
- `README.md`
