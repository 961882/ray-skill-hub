# RaySkillHub

`RaySkillHub` 是 `RayHub` 的 skill 互通子项目。它是一个本地优先的 skill control plane，用来把同一份 canonical skill 在多个 AI Agent 工具之间发现、校验、同步、诊断和复用。

当前 npm/package 标识为 `ray-skill-hub`，CLI 二进制名为 `rayskillhub`。面向使用者的示例优先使用 `rayskillhub`；在仓库开发阶段，你也可以继续直接使用 `node dist/cli/index.js`。

它现在同时服务两类使用者：

- Human CLI user：人在终端里查看、排障、同步、初始化 skill
- Agent operator user：Agent（优先是 OpenClaw）通过 `--json` 调用同一套本地控制面

## 你是哪个使用者？

### 我是人

从这里开始：

- 构建：`npm run build`
- 查看技能：`rayskillhub list`
- 检查健康：`rayskillhub doctor`
- 预览同步：`rayskillhub sync --agent codex --dry-run`
- 准备并执行：`rayskillhub run example-skill --agent codex --exec`

当前 `list` 会显示安装覆盖率和缺失 agent，例如：

- `installed: 1/2`
- `missing: claude-code`

如果你只想看设计边界或 adapter 开发方式：

- `docs/human-cli-guide.md`
- `docs/source-registry-state-boundaries.md`
- `docs/adapter-development.md`

### 我是 OpenClaw Agent

从这里开始：

- 所有调用默认加 `--json`
- 默认先走只读命令：`list` -> `inspect` -> `doctor`
- 写操作默认先 `--dry-run`
- 只有在明确允许时才使用：
  - `sync`
  - `sync --repair-conflicts`
  - `run --exec`

推荐先看：

- `docs/index.md`
- `docs/openclaw-agent-guide.md`
- `docs/command-contracts.md`

## 当前范围

当前仓库已支持：

- canonical `skills/` 源目录
- `manifest.json` 元数据校验
- discovery / registry / state
- `list / inspect / doctor / sync / init-skill / run`
- `codex` / `openclaw` / `claude-code` / `opencode` adapter
- 幂等 sync、冲突检查、`--dry-run`
- 全局 `--json`

说明：`codex` adapter 的安装与运行时行为均已完成验收，已验证可从本地 skills 目录加载并触发验收技能。

当前实现说明：`codex` adapter 会把目标 `SKILL.md` 渲染成带 YAML frontmatter 的 Codex-native 格式（至少包含 `name` 和 `description`），以满足 Codex skill loader 的最小要求。

同样地，`claude-code` adapter 现在也会把目标 `SKILL.md` 渲染成 Claude Code skills 文档要求的 frontmatter 形式，以支持自动加载和 `/skill-name` 调用。

OpenClaw 运行时补充：在默认长期会话中可能出现旧 skill 快照缓存；完成 `sync` 后，建议用 fresh/isolated agent session 做最终行为验收。

## 快速示例

### Human CLI

```bash
npm run build
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor
rayskillhub sync --agent codex --dry-run
rayskillhub sync --agent codex --skill example-skill
rayskillhub run example-skill --agent codex --exec
```

### Agent / OpenClaw

```bash
rayskillhub list --json
rayskillhub inspect example-skill --json
rayskillhub doctor --json
rayskillhub sync --agent codex --skill example-skill --dry-run --json
```

## 文档地图

- 总入口：`docs/index.md`

### 面向使用

- `docs/human-cli-guide.md`：人类用户的 quickstart、任务流和故障排查入口
- `docs/manual-testing.md`：人工测试手册、发布前 smoke test 清单
- `docs/acceptance-result.md`：跨 agent 验收结果（当前基线）
- `docs/openclaw-agent-guide.md`：OpenClaw agent 如何安全调用 RaySkillHub
- `docs/command-contracts.md`：命令 contract、JSON envelope、退出码、风险分级

### 推荐阅读顺序

- 你是人类用户：`README.md` -> `docs/index.md` -> `docs/human-cli-guide.md` -> `docs/source-registry-state-boundaries.md`
- 你是 OpenClaw agent / agent 开发者：`README.md` -> `docs/index.md` -> `docs/openclaw-agent-guide.md` -> `docs/command-contracts.md`
- 你是发布维护者：`README.md` -> `docs/index.md` -> `docs/manual-testing.md` -> `docs/github-release-test-plan.md`
- 你是发布维护者（含验收闭环）：`README.md` -> `docs/index.md` -> `docs/manual-testing.md` -> `docs/acceptance-result.md` -> `docs/github-release-test-plan.md`
- 你要开始准备 GitHub 发布：`README.md` -> `docs/index.md` -> `docs/github-release-prep.md` -> `docs/release-checklist.md`
- 你想快速放行一个版本（前提：已满足 git/gh 前置条件）：`README.md` -> `docs/index.md` -> `docs/release-checklist.md` -> `docs/release-notes-template.md`
- 你想直接拿当前版本 release notes：`README.md` -> `docs/index.md` -> `docs/releases/v0.1.0.md`

### 面向边界与扩展

- `docs/source-registry-state-boundaries.md`：source / registry / state 边界
- `docs/adapter-development.md`：新增 adapter 的最小接入流程

### 面向测试与发布

- `docs/manual-testing.md`：手动回归与发布前人工测试手册
- `docs/acceptance-result.md`：跨 agent 验收结果与已知限制
- `docs/github-release-test-plan.md`：GitHub Release 测试计划与放行标准
- `docs/github-release-prep.md`：GitHub 发布前序准备（从本地到 Draft Release）
- `docs/release-checklist.md`：发布维护者的超短检查清单
- `docs/release-notes-template.md`：GitHub Release notes 模板
- `docs/releases/v0.1.0.md`：当前版本 release notes 草稿
- `CHANGELOG.md`：版本变更历史

### 面向产品与架构

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics-and-user-stories.md`
- `_bmad-output/planning-artifacts/implementation-tasks.md`

## 设计结论

`RaySkillHub` 不是新的 Agent，也不是远程编排平台。

它是一个本地 shared control plane：

- 对 human，提供可读 CLI
- 对 agent，提供稳定 JSON contract
- 对 adapter，提供统一的同步与状态模型

后续如果扩展 MCP、daemon、HTTP API，也应建立在这套本地控制面之上，而不是绕过它。
