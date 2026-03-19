# Docs Index

`RaySkillHub` 文档按使用者角色组织，先选角色，再进入对应路径。

## 人类 CLI 使用者

- `docs/human-cli-guide.md`：安装、常用命令、故障排查
- `docs/manual-testing.md`：人工回归、smoke test、发布前手测清单
- `docs/source-registry-state-boundaries.md`：source/registry/state 边界
- `docs/adapter-development.md`：新增 adapter 的接入流程

## Agent / OpenClaw 操作员

- `docs/openclaw-agent-guide.md`：调用顺序、安全边界、推荐流程
- `docs/command-contracts.md`：JSON envelope、退出码、risk、operation/writeIntent

## 规划与架构

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics-and-user-stories.md`
- `_bmad-output/planning-artifacts/implementation-tasks.md`

## 测试与发布

- `docs/manual-testing.md`：当前 CLI/JSON contract 的人工测试手册
- `docs/acceptance-result.md`：跨 agent 验收结果基线与限制说明
- `docs/github-release-test-plan.md`：GitHub Release 前后验证计划
- `docs/github-release-prep.md`：GitHub 发布前序准备与执行命令
- `docs/release-checklist.md`：发布维护者用的超短放行清单
- `docs/release-notes-template.md`：GitHub Release 文案模板
- `docs/releases/v0.1.0.md`：当前版本的 release notes 草稿
- `CHANGELOG.md`：版本变更历史

## 推荐阅读顺序

- Human CLI：`README.md` -> `docs/index.md` -> `docs/human-cli-guide.md`
- OpenClaw Agent：`README.md` -> `docs/index.md` -> `docs/openclaw-agent-guide.md` -> `docs/command-contracts.md`
- Release Maintainer：`README.md` -> `docs/index.md` -> `docs/manual-testing.md` -> `docs/github-release-test-plan.md`
- Release Maintainer（含验收闭环）：`README.md` -> `docs/index.md` -> `docs/manual-testing.md` -> `docs/acceptance-result.md` -> `docs/github-release-test-plan.md`
- Release Prep：`README.md` -> `docs/index.md` -> `docs/github-release-prep.md` -> `docs/release-checklist.md`
- Release Maintainer（短路径，前提：已满足 git/gh 前置条件）：`README.md` -> `docs/index.md` -> `docs/release-checklist.md` -> `docs/release-notes-template.md`
- Current Release Draft：`README.md` -> `docs/index.md` -> `docs/releases/v0.1.0.md`
