# GitHub Release Test Plan

## 目标

本计划用于在创建和发布 GitHub Release 之前，确认 `RaySkillHub` 的当前版本满足“可发布、可回退、可解释”的最低标准。

重点不是自动化覆盖率，而是回答三个问题：

1. 这个版本是否真的能在仓库当前形态下工作？
2. GitHub Release 页面提供的信息是否足够让使用者理解版本内容？
3. 如果发布后发现问题，维护者是否能快速定位和回退？

## 当前仓库事实基线

当前仓库已经具备的发布前能力：

- `npm run build`
- `npm test`
- `npm run pre-release`

当前仓库未显式具备：

- GitHub Actions 发布流水线
- npm publish 脚本
- GitHub Release asset 打包脚本

因此，本计划按“源码仓库发布到 GitHub Release 页面”的现实方式编写，不假设存在额外自动化。

## 角色与责任

### 发布负责人

负责：

- 选择发布 commit/tag
- 执行发布前验证
- 起草 release notes
- 创建并发布 GitHub Release

### 审核者（可选但推荐）

负责：

- 复核版本说明是否准确
- 从干净环境做一轮 smoke test
- 对阻断项给出 go / no-go 结论

## 进入条件

满足以下条件才能进入 GitHub Release 测试阶段：

- 目标分支已合并预期改动
- 当前工作区没有未确认的本地脏改动
- 版本说明范围已明确
- 至少一名维护者确认本次发布目的

## 退出条件

满足以下条件才允许发布：

- 所有 P0 / 阻断问题关闭或明确接受
- `build` / `test` / `pre-release` 全通过
- 手动 smoke test 通过
- release notes 与实际变更一致
- tag 与 release 指向正确 commit

## 测试阶段

### 阶段 1：本地发布前验证

执行：

```bash
npm install
npm run build
npm test
npm run pre-release
```

必须检查：

- TypeScript 构建成功
- 全部测试通过
- `pre-release` 中的 `doctor`/`list` 通过
- 无意外 warning 或非预期输出

### 阶段 2：手动 smoke test

参考：`docs/manual-testing.md`

建议最小集合：

```bash
rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor --json
rayskillhub sync --agent codex --skill example-skill --dry-run --json
rayskillhub run demo-exec-skill --agent codex --exec --json
```

重点确认：

- 人类 CLI 文本输出仍可读
- JSON contract 没有意外漂移
- `sync.noOp`、`inspect.canExec`、`run.execRequested/executed` 语义正确

### 阶段 3：干净克隆验证

目标：排除“只在作者机器上可用”的情况。

建议在新的临时目录中执行：

```bash
git clone <repo-url> ray-skill-hub-release-check
cd ray-skill-hub-release-check
npm install
npm run build
npm test
npm run pre-release
```

通过标准：

- 不依赖本地隐藏文件或缓存
- 构建与测试在干净克隆中仍通过

### 阶段 4：Release notes 审核

发布前至少检查：

- 标题是否对应实际版本/tag
- 变更摘要是否覆盖关键能力
- 是否明确列出破坏性变化（如有）
- 是否避免承诺仓库当前不存在的能力

建议 release notes 最少包含：

- 本次重点改动
- 对 human CLI 的影响
- 对 OpenClaw / agent contract 的影响
- 升级注意事项

### 阶段 5：GitHub Release 页面检查

在 GitHub Draft Release 页面确认：

- tag 名称正确
- target branch / commit 正确
- 标题与 tag 一致
- 描述内容完整
- 自动生成 source zip / tar.gz 可见

如果后续增加 release assets，再补充：

- asset 文件名
- 校验值
- 平台说明

### 阶段 6：发布后 smoke check

Release 发布后立即复查：

- GitHub Release 页面可正常访问
- tag 可从仓库中解析到正确 commit
- source zip / tar.gz 可下载
- release notes 排版正常

如果团队依赖该版本继续开发，建议再做一次：

```bash
git checkout <release-tag>
npm install
npm run build
npm test
```

## 测试矩阵

### 必测

- 当前发布 commit 的本地验证
- 干净克隆验证
- 文本人类输出 smoke test
- JSON contract smoke test
- GitHub Release 页面检查

### 条件必测

以下情况出现时，必须扩大测试：

- 改动 `src/cli/`
- 改动 `docs/command-contracts.md`
- 改动 `sync` / `run` / `doctor` 语义
- 改动 `scripts/pre-release-check.mjs`
- 改动示例 skill 或 adapter

### 可选

- 不同本机目录下重复验证
- 第二位维护者复跑 smoke test

## 阻断规则

以下任何一项出现都应阻止发布：

- `npm run build` 失败
- `npm test` 失败
- `npm run pre-release` 失败
- CLI 顶层命令无法运行
- JSON contract 关键字段缺失
- release notes 与实际行为明显不符
- tag 指向错误 commit

## 风险记录模板

建议在发布 issue 或 release checklist 里记录：

- 发布版本 / tag
- commit SHA
- 测试执行人
- 测试时间
- 通过项
- 阻断项
- 放行结论

## 建议执行顺序

```text
1. 确认目标 commit
2. 本地 build/test/pre-release
3. 手动 smoke test
4. 干净克隆验证
5. 起草并审核 release notes
6. 创建 GitHub Draft Release
7. 检查 tag / source archive / 页面文案
8. 发布
9. 发布后立即 smoke check
```

## 回退建议

如果发布后发现阻断问题：

- 先在 release 页面标记问题
- 明确受影响范围
- 评估是：
  - 直接删除/撤回 release
  - 重新发一个修复版 tag/release
- 不要静默修改既有 release 描述来掩盖行为变化

## 关联文档

- `docs/manual-testing.md`
- `docs/command-contracts.md`
- `docs/openclaw-agent-guide.md`
- `README.md`
