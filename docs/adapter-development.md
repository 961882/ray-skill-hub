# Adapter 开发指南

## 目标

本指南定义新增 Agent adapter 的最小接入流程，保证新 adapter 可以复用现有 `RaySkillHub` 的 source、registry、state 和 sync 编排能力。

## 最小接入步骤

### 1. 在 `src/adapters/` 下新增 adapter 文件

实现 `AgentAdapter` 接口：

- `supports()`
- `resolveTargetPaths()`
- `sync()`

## 2. 在 `registry/agents.json` 中增加 agent 定义

至少包含：

- `agentName`
- `adapterName`
- `defaultInstallPath`
- `syncMode`

## 3. 在 `src/adapters/index.ts` 注册 adapter

确保 `getAdapter()` 可以通过 `adapterName` 找到你的实现。

## 4. 明确目标路径规则

需要定义：

- 根安装目录
- 单个 skill 的目标目录命名方式
- copy / symlink / transform 方式

说明：并不是所有 adapter 都是“目录到目录”的映射。未来如需新增 transform 类 adapter，可以把目标产物映射为单文件或其他目标特定结构。

例如 `codex` 和 `claude-code` 虽然仍使用目录同步，但目标 `SKILL.md` 需要被重写为 agent-native 格式：顶部带 `---` 包裹的 YAML frontmatter，并至少包含 `name` / `description`。

相反，像 Codex、Claude Code 这类更接近用户级 skills 目录的系统，则更适合 `copy` 模式。

## 5. 明确兼容性判断规则

`supports()` 至少要判断：

- skill 是否有效
- skill 是否声明兼容该 agent

## 6. 补测试

新增 adapter 至少应补：

- preflight 可通过
- sync 能写入目标目录
- install state / sync history 会更新
- 异常路径下不会破坏 canonical source

## 设计原则

- 新 adapter 不能修改 canonical skill 结构
- target-specific 差异必须留在 adapter 内部
- core sync orchestration 不应因为新增 adapter 而改动业务流程
