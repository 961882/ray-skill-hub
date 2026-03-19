# Manual Testing Handbook

## 目标

本手册用于在不依赖自动化之外，人工确认 `RaySkillHub` 的核心工作流是否仍然可用。

适用场景：

- 合并较大改动之后的人肉回归
- 发布前 smoke test
- 排查“自动化绿了，但真实使用手感不对”的问题

## 测试范围

本手册覆盖当前仓库已经实现的本地控制面能力：

- `list`
- `inspect`
- `doctor`
- `sync`
- `sync --repair-conflicts`
- `init-skill`
- `run`
- `run --exec`
- 全局 `--json` contract

不覆盖：

- 远程 CI
- GitHub Actions
- npm publish
- 非仓库内声明的 adapter

额外说明：`codex` 用例已完成安装与运行时双重验收，当前基线可视为通过；详细记录见 `docs/acceptance-result.md`。

补充说明：如果 `Codex` 报 `missing YAML frontmatter delimited by ---`，说明目标 `SKILL.md` 不是 Codex-native 格式，或其他目录（例如 `~/.agents/skills`）里还残留旧格式 skill。

对于 `claude-code`，官方 skills 文档同样要求 `SKILL.md` 带 YAML frontmatter。若交互会话未体现新 skill，优先重开新会话，或重新同步后用 `claude -p` 做一次最小验证。

## 测试前准备

### 环境

- 可用的 Node.js + npm 环境
- 仓库依赖已安装
- 当前工作区可写

### 初始化

```bash
npm install
npm run build
```

建议先确认基础健康：

```bash
npm test
npm run pre-release
```

### 建议测试数据

仓库内默认可利用：

- `skills/example-skill`
- `skills/demo-exec-skill`

如果需要验证初始化流程，可临时创建：

```bash
rayskillhub init-skill manual-test-skill --agents codex,openclaw --with-run-script
```

测试完成后如需清理，再手动删除对应目录。

## 快速 smoke test

按下面顺序跑一遍，可以快速确认仓库没有明显退化：

```bash
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor
rayskillhub sync --agent codex --skill example-skill --dry-run
rayskillhub run example-skill --agent codex
```

通过标准：

- 所有命令都能正常返回
- 文本输出字段齐全且可理解
- 没有明显崩溃、栈追踪或空字段

## 详细测试用例

### 1. 列表视图

命令：

```bash
rayskillhub list
rayskillhub list --json
```

检查点：

- 文本输出包含 `installed:`、`agents:`、`installs:`、`exec:`
- JSON 输出包含：
  - `contractVersion`
  - `command=list`
  - `operation=read`
  - `writeIntent=none`
  - `data[*].hasRunScript`
  - `data[*].canExec`

### 2. 单个 skill 详情

命令：

```bash
rayskillhub inspect example-skill
rayskillhub inspect example-skill --json
```

检查点：

- 文本输出包含：
  - `compatible agents`
  - `installed coverage`
  - `missing agents`
  - `has run script`
  - `can exec`
- JSON 输出包含：
  - `hasRunScript`
  - `canExec`
  - `installs`
  - `recentHistory`

异常检查：

```bash
rayskillhub inspect not-a-skill --json
```

预期：

- `exitCode=2`
- `status=error`
- 仍保持稳定 envelope

### 3. 工作区健康诊断

命令：

```bash
rayskillhub doctor
rayskillhub doctor --json
```

检查点：

- 文本输出首行有 summary
- JSON 输出包含：
  - `summary.issueCounts`
  - `summary.codeGroups`
  - `summary.topRiskCodes`
  - `summary.riskLevel`

### 4. dry-run 同步

命令：

```bash
rayskillhub sync --agent codex --skill example-skill --dry-run
rayskillhub sync --agent codex --skill example-skill --dry-run --json
```

检查点：

- 文本输出包含：
  - `agent:`
  - `dry-run: yes`
  - `no-op:`
- JSON 输出包含：
  - `executionIntent`
  - `noOp`
  - `success/skipped/failed`

重点语义：

- 如果只是 `no_source_changes`，应表现为 `status=success` 且 `data.noOp=true`
- 如果是兼容性跳过，预期 `status=warning`

### 5. 真正同步

命令：

```bash
rayskillhub sync --agent codex --skill example-skill
```

检查点：

- 目标路径被正确准备
- 再次执行相同命令后，不应出现异常重复写入行为
- 再跑一次 dry-run 时，常见情况应进入 `noOp=true`

### 6. repair-conflicts

命令：

```bash
rayskillhub sync --agent codex --skill example-skill --repair-conflicts --dry-run --json
```

检查点：

- 若存在可修复冲突，`data.repaired[*].mode` 应为 `preview`
- 不应在 dry-run 下真实修改 state

说明：

- 当前只验证安全自动修复场景
- 不要求人工构造高风险冲突，除非本次改动明确涉及 conflict 逻辑

### 7. 初始化新 skill

命令：

```bash
rayskillhub init-skill manual-test-skill --agents codex,openclaw --with-run-script
```

检查点：

- 创建新目录
- 生成 `manifest.json`
- 生成 `SKILL.md`
- `manifest.json` 中包含 `compatibleAgents`
- 带 `--with-run-script` 时存在 `scripts.run`

错误路径：

```bash
rayskillhub init-skill --json
```

预期：

- `exitCode=2`
- `command=init-skill`
- `status=error`

### 8. 准备运行

命令：

```bash
rayskillhub run example-skill --agent codex
rayskillhub run example-skill --agent codex --json
```

检查点：

- 文本输出包含：
  - `ready: yes`
  - `exec_requested: no`
  - `executed: no`
- JSON 输出包含：
  - `executionIntent`
  - `execRequested=false`
  - `executed=false`

### 9. 实际执行 `scripts.run`

命令：

```bash
rayskillhub run demo-exec-skill --agent codex --exec
rayskillhub run demo-exec-skill --agent codex --exec --json
```

检查点：

- 文本输出包含：
  - `exec_requested: yes`
  - `executed: yes`
- JSON 输出包含：
  - `execRequested=true`
  - `executed=true`
  - `execution.command`
  - `execution.exitCode`
  - `execution.stdout/stderr`

### 10. `run --exec` 失败路径

如果本次改动涉及执行逻辑，建议额外验证一个失败脚本。

预期：

- 顶层 `status=error`
- `data` 仍存在
- `data.execRequested=true`
- `data.executed=false`
- `data.error` 可直接用于 agent 决策

## 发布前最小人工回归

在准备发版前，至少跑下面这组：

```bash
npm run build
npm test
npm run pre-release
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor --json
rayskillhub sync --agent codex --skill example-skill --dry-run --json
rayskillhub run demo-exec-skill --agent codex --exec --json
```

说明：这组命令用于发布前最小 smoke test；跨 agent 的正式验收闭环以 `docs/acceptance-result.md` 为准。

## 缺陷记录建议

每次人工测试建议记录：

- 测试日期
- 测试人
- commit SHA
- 执行环境
- 失败命令
- 实际输出
- 预期输出
- 是否阻断发布

## 通过标准

- 核心命令可执行
- `--json` envelope 稳定
- `run`/`sync` 的关键状态位语义正确
- 文本输出能支持人类排障
- 无阻断性 bug

## 关联文档

- `docs/human-cli-guide.md`
- `docs/openclaw-agent-guide.md`
- `docs/command-contracts.md`
- `docs/github-release-test-plan.md`
- `CHANGELOG.md`
