# Human CLI Guide

## 适用对象

本指南面向直接在终端里使用 `RaySkillHub` 的人类用户。

如果你是 OpenClaw 等 agent 的操作者，请看：

- `docs/openclaw-agent-guide.md`
- `docs/command-contracts.md`

说明：当前包名是 `ray-skill-hub`，CLI 二进制名是 `rayskillhub`。本指南优先展示面向使用者的 `rayskillhub` 命令；如果你在源码仓库里开发，也可以改用 `node dist/cli/index.js`。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建

```bash
npm run build
```

### 3. 看看当前有哪些 skill

```bash
rayskillhub list
```

你会看到每个 skill 的：

- 有效性
- 安装覆盖率，例如 `installed: 1/2`
- 缺失 agent，例如 `missing: claude-code`

### 4. 看单个 skill 详情

```bash
rayskillhub inspect example-skill
```

### 5. 先做健康检查

```bash
rayskillhub doctor
```

### 6. 预览同步

```bash
rayskillhub sync --agent codex --dry-run
```

### 7. 真正同步

```bash
rayskillhub sync --agent codex
```

## 常见任务流

### 任务 1：确认一个 skill 当前状态

推荐顺序：

```bash
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor
```

适合场景：

- 你刚拉下仓库
- 你不确定某个 skill 是否有效
- 你想先看有没有缺失安装

### 任务 2：只同步一个 skill

```bash
rayskillhub sync --agent codex --skill example-skill --dry-run
rayskillhub sync --agent codex --skill example-skill
```

适合场景：

- 只想更新一个 skill
- 不想让整批 skill 一起动

### 任务 3：修复陈旧 install state 冲突

```bash
rayskillhub sync --agent codex --skill example-skill --repair-conflicts
```

说明：

- 当前只会自动修复安全场景
- 只处理 `installed_state` 来源的陈旧冲突
- 不会自动处理同批次重名冲突

如果你还不确定要不要真的修，可以先预览：

```bash
rayskillhub sync --agent codex --skill example-skill --repair-conflicts --dry-run
```

这时输出里会出现 `repaired:` 段，但 `mode` 会是 `preview`，表示只展示将要修什么，不会真的改 state。

### 任务 4：准备并执行一个 skill

先准备：

```bash
rayskillhub run example-skill --agent codex
```

如果你明确允许执行 `manifest.scripts.run`：

```bash
rayskillhub run example-skill --agent codex --exec
```

## 常用命令速查

### 查看列表

```bash
rayskillhub list
```

### 查看详情

```bash
rayskillhub inspect <skill>
```

### 工作区诊断

```bash
rayskillhub doctor
```

### 同步到指定 agent

```bash
rayskillhub sync --agent <agent>
```

### 预览同步

```bash
rayskillhub sync --agent <agent> --dry-run
```

### 只同步一个 skill

```bash
rayskillhub sync --agent <agent> --skill <skill>
```

### 初始化 skill

```bash
rayskillhub init-skill my-new-skill
```

### 运行 skill

```bash
rayskillhub run <skill> --agent <agent>
```

## 故障排查入口

### `doctor` 报错

先做：

```bash
rayskillhub doctor
```

看重点：

- `code`
- `message`
- `suggestion`

### `sync` 失败

优先顺序：

1. 先 `--dry-run`
2. 再看 `doctor`
3. 再看 `inspect <skill>`

### 目标路径冲突

如果是陈旧 install state：

```bash
rayskillhub sync --agent <agent> --skill <skill> --repair-conflicts
```

如果是同批次真实重名：

- 不要自动修
- 先改 skill 名称或清理设计冲突

### `inspect` 看起来信息不够

优先看这些字段：

- `compatible agents`
- `installed`
- `missing agents`
- `issues`
- `recent history`

如果你只是想知道“为什么没同步到某个 agent”，先 `inspect`，再 `doctor`，最后再 `sync --dry-run`。

## FAQ

### `list` 和 `inspect` 有什么区别？

- `list` 适合快速扫全局状态
- `inspect` 适合深挖单个 skill

如果你要看安装覆盖率和缺失 agent，两个都能看；但 `inspect` 会更细。

### 我什么时候该先跑 `doctor`？

建议这些场景都先跑：

- 第一次进仓库
- 刚改完 skill 结构
- `sync` 结果不符合预期
- 你怀疑 state 或目标目录已经漂移

### `--dry-run` 能解决什么问题？

它不会真正写入，但能提前告诉你：

- 会同步哪些 skill
- 目标路径是什么
- 会因为什么被跳过
- 是否存在兼容性或冲突问题

### `--repair-conflicts` 会不会把东西修坏？

当前设计是保守的：

- 只修复 `installed_state` 来源的陈旧冲突
- 只在冲突 skill 已不在当前 source 中时才动手
- 不会自动吞掉真实重名或同批次冲突

所以它不是“万能修复”，而是“有限且安全的自动清障”。

### `run --exec` 和 `sync` 有什么区别？

- `sync` 负责把 skill 准备到目标 agent 可消费的位置
- `run --exec` 会在准备之后执行 `manifest.scripts.run`

所以 `run --exec` 的风险比 `sync` 更高，默认不建议直接上。

### 什么时候该用 `--json`？

如果你是人类用户，通常不需要默认打开。

建议场景：

- 你在 shell 脚本里处理结果
- 你在给 OpenClaw 或其他 agent 喂结果
- 你想把输出存成机器可读记录

## 推荐排障顺序

当你遇到任何“不知道哪里坏了”的情况，建议固定按这个顺序：

1. `rayskillhub list`
2. `rayskillhub inspect <skill>`
3. `rayskillhub doctor`
4. `rayskillhub sync --agent <agent> --skill <skill> --dry-run`
5. 必要时才进入真实 `sync` / `--repair-conflicts` / `run --exec`

## 什么时候用 `--json`

如果你是人类用户，通常不需要默认加 `--json`。

只有在这些场景才建议用：

- 你在 shell 脚本里处理结果
- 你要把结果喂给 agent
- 你要做自动化检查

示例：

```bash
rayskillhub inspect example-skill --json
```

## 关联文档

- `README.md`
- `docs/openclaw-agent-guide.md`
- `docs/command-contracts.md`
- `docs/source-registry-state-boundaries.md`
- `docs/adapter-development.md`
- `CHANGELOG.md`

## 下一步看什么

- 想给 agent 用：`docs/openclaw-agent-guide.md`
- 想看 JSON 字段 contract：`docs/command-contracts.md`
- 想理解 source / registry / state：`docs/source-registry-state-boundaries.md`
