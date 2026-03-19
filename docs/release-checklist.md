# Release Checklist

## 用途

这是发布维护者使用的超短放行清单。

如果你需要完整背景、风险说明和回退策略，请看：

- `docs/manual-testing.md`
- `docs/github-release-test-plan.md`
- `docs/github-release-prep.md`
- `docs/acceptance-result.md`

## 发布前

- [ ] 当前目录是 git 仓库（`git rev-parse --is-inside-work-tree` 为 `true`）
- [ ] 目标 commit 已确认
- [ ] 远端仓库已配置（`git remote -v` 可见 `origin`）
- [ ] 当前工作区没有未确认脏改动
- [ ] 本次发布范围已明确
- [ ] release notes 初稿已准备
- [ ] `gh auth status` 显示已登录

## 本地验证

- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run pre-release`

## 人工 smoke test

- [ ] `rayskillhub list`
- [ ] `rayskillhub inspect example-skill`
- [ ] `rayskillhub doctor --json`
- [ ] `rayskillhub sync --agent codex --skill example-skill --dry-run --json`
- [ ] `rayskillhub run demo-exec-skill --agent codex --exec --json`

## 关键语义确认

- [ ] `inspect.canExec` 符合预期
- [ ] `sync.noOp` 语义正确
- [ ] `run.execRequested/executed` 语义正确
- [ ] JSON envelope 无意外漂移

## 干净环境验证

- [ ] 新克隆目录中 `npm run build` 通过
- [ ] 新克隆目录中 `npm test` 通过
- [ ] 新克隆目录中 `npm run pre-release` 通过

## GitHub Release 页面

- [ ] tag 名称正确
- [ ] target commit 正确
- [ ] release 标题正确
- [ ] release notes 与实际变更一致
- [ ] source zip / tar.gz 可见

## 放行

- [ ] 没有 P0 / 阻断问题
- [ ] 审核者已确认（如适用）
- [ ] 可发布

## 发布后

- [ ] GitHub Release 页面可访问
- [ ] tag 指向正确 commit
- [ ] source archive 可下载
- [ ] 如有异常，已记录回退方案
