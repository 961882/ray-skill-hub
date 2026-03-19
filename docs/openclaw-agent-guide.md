# OpenClaw Agent Guide

## 目标

本指南面向“把 `RaySkillHub` 当作本地控制面来调用的 OpenClaw agent”，而不是面向在终端里手动敲命令的人类用户。

这里关注的是：

- 什么命令适合 agent 调
- 哪些命令只读，哪些会改状态
- 默认调用顺序是什么
- JSON 输出该怎么理解

说明：当前包名是 `ray-skill-hub`，CLI 二进制名是 `rayskillhub`。文档中的命令示例继续使用 `node dist/cli/index.js`，因为这是仓库内最稳定的开发调用方式。

## 一句话原则

- 默认加 `--json`
- 默认先读后写
- 默认先 `--dry-run`
- 高风险操作显式 opt-in

## 推荐调用顺序

### 1. 发现

```bash
node dist/cli/index.js list --json
```

用途：

- 列出当前托管 skills
- 查看安装覆盖率
- 查看缺失 agent

### 2. 理解单个 skill

```bash
node dist/cli/index.js inspect example-skill --json
```

用途：

- 获取入口、版本、兼容 agent、安装状态、最近同步历史
- 读取执行能力位：`hasRunScript` / `canExec`

### 3. 判断工作区是否健康

```bash
node dist/cli/index.js doctor --json
```

用途：

- 判断是否存在缺失目录、坏链接、漂移目标、未知 agent 等问题
- 消费 `suggestion`
- 读取 `summary.riskLevel` 作为是否继续写操作的第一道判断

### 4. 预览写操作

```bash
node dist/cli/index.js sync --agent openclaw --skill example-skill --dry-run --json
```

用途：

- 预览目标路径
- 检查兼容性失败
- 判断是否存在冲突

### 5. 执行写操作

```bash
node dist/cli/index.js sync --agent openclaw --skill example-skill --json
```

只在以下条件满足时建议执行：

- `doctor --json` 没有阻断性错误
- `sync --dry-run --json` 结果符合预期

补充：如果你要立刻验证 skill 的运行时行为，建议在 `sync` 后使用 fresh/isolated agent session，避免默认长期会话复用旧 skill 快照。

### 6. 冲突修复（显式允许时）

```bash
node dist/cli/index.js sync --agent openclaw --skill example-skill --repair-conflicts --json
```

当前只会自动修复：

- `installed_state` 来源的冲突
- 且冲突 skill 已不在当前 source 中

不会自动修复：

- 同批次重名冲突
- 需要删除 canonical source 的场景
- 不明确是否安全的目标目录残留

如果只想预览可修复项：

```bash
node dist/cli/index.js sync --agent openclaw --skill example-skill --repair-conflicts --dry-run --json
```

这时 `data.repaired` 会包含 `mode: "preview"` 的修复项，但不会真的改状态。

### 7. 准备并执行

```bash
node dist/cli/index.js run example-skill --agent openclaw --exec --json
```

只在以下条件满足时建议执行：

- skill 已被确认有效
- 兼容目标 agent
- 允许执行 `manifest.scripts.run`

## 风险分级

### 只读命令

- `list`
- `inspect`
- `doctor`

### 状态变更命令

- `sync`
- `init-skill`

### 执行型命令

- `run --exec`

## Agent 决策建议

### 当 `doctor` 返回 `error`

- 先停
- 先看 `summary.riskLevel`
- 看 `reasonCode`
- 看 `suggestion`
- 如果是可安全修复项，再决定是否继续

### 当 `sync --dry-run` 返回 `warning`

- 读取 `skipped` / `failed`
- 优先看每项的 `riskLevel`
- 若是兼容性问题，回到 `inspect`
- 若是冲突问题，只有在显式授权时才使用 `--repair-conflicts`

### 当 `sync --dry-run` 返回 `success` 且 `data.noOp=true`

- 这表示本次是“无变更 no-op”，常见于 `no_source_changes`
- 可直接跳过实际写入 `sync`
- 继续后续只读或准备流程即可

### 当 `run --exec` 被请求

- 必须确认这是允许的写/执行动作
- 优先先看 `inspect --json` 返回的 `canExec`，避免无效执行请求
- 必须消费 `execution.exitCode` / `stdout` / `stderr`
- 同时消费 `execRequested` / `executed`：
  - `execRequested=true && executed=true`：执行成功完成
  - `execRequested=true && executed=false`：请求过执行但未成功形成执行结果（查看 `error`）

## 决策伪代码（可直接实现）

```text
input: skillName, agentName, allowExec(bool), allowRepair(bool)

1) inspect = inspect(skillName, --json)
   if inspect.exitCode != 0: stop(inspect)

2) if allowExec == true and inspect.data.canExec != true:
     stop("canExec=false, skip run --exec")

3) doctor = doctor(--json)
   if doctor.exitCode == 2:
     stop(doctor)  // 阻断性错误

4) preview = sync(--agent agentName --skill skillName --dry-run --json)
   if preview.exitCode == 2:
     if allowRepair == true:
       repairPreview = sync(--agent agentName --skill skillName --repair-conflicts --dry-run --json)
       if repairPreview.exitCode == 2: stop(repairPreview)
     else:
       stop(preview)

5) if preview.data.noOp == true:
     // 健康无变更，跳过真实 sync
     goto step 7

6) apply = sync(--agent agentName --skill skillName --json)
   if apply.exitCode != 0: stop(apply)

7) if allowExec == true:
     runResult = run(skillName --agent agentName --exec --json)
     if runResult.data.execRequested == true and runResult.data.executed == false:
       stop(runResult)
     done(runResult)
   else:
     ready = run(skillName --agent agentName --json)
     done(ready)
```

实现要点：

- 仅以 `exitCode/status/data` 做决策，不依赖 `output` 文本。
- `sync` 的 `noOp=true` 表示安全可跳过真实写入。
- `run` 场景统一看 `execRequested/executed/error`，避免“是否真的执行了”歧义。

## 不要做的事

- 不要解析 human-only 文本来做决策，优先用 `data`
- 不要在未 dry-run 的情况下直接写入
- 不要默认使用 `--repair-conflicts`
- 不要在没有显式许可时调用 `run --exec`

## 关联文档

- `docs/command-contracts.md`
- `docs/human-cli-guide.md`
- `docs/source-registry-state-boundaries.md`
- `README.md`
