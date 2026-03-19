# GitHub Release Preflight (v0.1.0)

## 目标

这份文档用于把 `RaySkillHub` 从“本地可用状态”推进到“可在 GitHub 创建 Release”的前序准备状态。

适用版本：`ray-skill-hub@0.1.0`

## 当前事实快照

- 本地预检能力已就绪：`npm run build`、`npm test`、`npm run pre-release`
- 发布文档已存在：
  - `docs/release-checklist.md`
  - `docs/github-release-test-plan.md`
  - `docs/release-notes-template.md`
  - `docs/releases/v0.1.0.md`
  - `docs/acceptance-result.md`
- 当前目录不是 git 仓库（缺少 `.git`）
- `gh` CLI 已安装，但当前未登录

## 阶段 A：打通 GitHub 发布前置条件

### A1. 初始化/绑定 git 仓库

如果当前目录还不是 git 仓库：

```bash
git init
git add .
git commit -m "chore: prepare ray-skill-hub v0.1.0 release baseline"
```

如果你已有远端仓库：

```bash
git remote add origin <repo-url>
git branch -M main
git push -u origin main
```

门禁标准：

- `git status` 干净
- `git remote -v` 可见 `origin`
- `git rev-parse --is-inside-work-tree` 返回 `true`

### A2. 登录 GitHub CLI

```bash
gh auth login
gh auth status
```

门禁标准：

- `gh auth status` 显示已登录 host（通常是 `github.com`）

## 阶段 B：发布前本地质量门禁

在仓库根目录执行：

```bash
npm install
npm run build
npm test
npm run pre-release
```

门禁标准：

- 所有命令退出码为 0
- `pre-release` 内含 `doctor` 无阻断问题

## 阶段 C：手动 smoke 与验收闭环

最小 smoke：

```bash
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor --json
rayskillhub sync --agent codex --skill example-skill --dry-run --json
rayskillhub run demo-exec-skill --agent codex --exec --json
```

跨 agent 验收记录：

- 使用 `docs/acceptance-result.md` 作为放行参考
- OpenClaw 行为验收需用 fresh/isolated session，避免长会话旧快照

## 阶段 D：准备 tag 与 Release 文案

建议 tag：`v0.1.0`

发布文案来源：

- 首选：`docs/releases/v0.1.0.md`
- 模板：`docs/release-notes-template.md`
- 变更索引：`CHANGELOG.md`

门禁标准：

- 版本号一致（`package.json`、tag、release 标题）
- release notes 不包含仓库不存在的能力承诺

## 阶段 E：创建 GitHub Draft Release

### 命令方式

```bash
gh release create v0.1.0 \
  --title "RaySkillHub v0.1.0" \
  --notes-file docs/releases/v0.1.0.md \
  --draft
```

### 页面核对

- tag 指向正确 commit
- 标题、版本、文案一致
- source tar/zip 自动资产可见

## 阶段 F：发布后立即复检

```bash
gh release view v0.1.0
```

并检查：

- 页面可访问
- tag 与 commit 对应正确
- 文案排版正常

## 阻断项（任一命中即暂停发布）

- 不是 git 仓库，或没有可追溯目标 commit
- `gh auth status` 未登录
- `build`/`test`/`pre-release` 任一失败
- 验收记录与 release notes 结论冲突

## 关联文档

- `docs/release-checklist.md`
- `docs/github-release-test-plan.md`
- `docs/acceptance-result.md`
- `docs/releases/v0.1.0.md`
