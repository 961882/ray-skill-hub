# Release Notes Template

> 适用于 GitHub Release 文案草稿。
> 发布前请删除不适用的小节，避免保留空标题。

## Title

`RaySkillHub vX.Y.Z`

## Summary

- 本次版本的 1-3 个核心变化
- 对使用者最重要的升级点
- 是否包含 contract / CLI / sync / run 语义调整

## Highlights

### Human CLI

- 人类用户能直接感知的变化
- 例如：输出更清晰、错误提示更好、命令行为更稳定

### Agent / OpenClaw

- `--json` contract 的新增字段或语义调整
- `sync` / `run` / `doctor` 对 agent 决策的影响

### Docs

- 新增或更新了哪些关键文档

## Notable Changes

- `list`: <简述>
- `inspect`: <简述>
- `doctor`: <简述>
- `sync`: <简述>
- `run`: <简述>
- `docs`: <简述>

## Compatibility Notes

- 是否有 breaking changes
- 是否有新增字段但保持兼容
- 是否有推荐调用方式变化

建议模板：

- No breaking changes in documented `v0` command contracts.
- Added backward-compatible fields: `<field names>`.
- Agent consumers should prefer `<recommended fields>` over parsing `output` text.

## Validation

发布前已完成：

- [x] `npm run build`
- [x] `npm test`
- [x] `npm run pre-release`
- [x] 手动 smoke test

## Upgrade Guidance

如果你是人类 CLI 用户：

- 建议先跑 `node dist/cli/index.js doctor`
- 如涉及同步逻辑，先跑 `sync --dry-run`

如果你是 OpenClaw / agent 调用方：

- 继续优先消费 `data`
- 若本次版本新增字段，按需增量接入
- 不要依赖 `output` 文本做主决策

## Known Limitations

- 当前仓库仍未包含 GitHub Actions 发布流水线
- 当前仓库仍未包含 npm publish 流程
- 仅覆盖仓库内已声明 adapter 与本地控制面能力

## References

- `docs/command-contracts.md`
- `docs/openclaw-agent-guide.md`
- `docs/manual-testing.md`
- `docs/github-release-test-plan.md`
