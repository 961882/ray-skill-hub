# Source / Registry / State 边界说明

## Canonical Source

`skills/` 是唯一源事实。

- 所有 skill 内容都以 `skills/<name>/` 为准
- `SKILL.md`、`manifest.json`、可选资源文件都属于 source
- 任何同步结果都不能反向覆盖 source

## Registry

`registry/` 表达“系统当前识别到了什么”。

- `registry/index.json` 由 canonical source 扫描和校验后生成
- `registry/agents.json` 定义支持的 Agent 与 adapter 配置
- registry 可以从 source 重建

## State

`state/` 表达“运行后发生了什么”。

- `state/installs.json` 记录 skill-agent 安装状态
- `state/sync-history.json` 记录同步历史
- state 不能决定 source 是否存在，也不能替代 registry

## 恢复原则

- source 丢失时，registry 和 state 都不能完整恢复业务事实
- registry 丢失时，可以通过重新扫描 source 恢复
- state 丢失时，可以重新同步，但会失去历史记录

## 设计结论

- source 是唯一源事实
- registry 是可重建的派生索引
- state 是运行结果，不是配置事实
