# Changelog

All notable changes to `RaySkillHub` will be documented in this file.

The format follows Keep a Changelog principles and uses semantic versioning intent.

## [0.1.0] - 2026-03-17

### Added

- `RaySkillHub` 明确定位为 `RayHub` 的 skill 互通子项目
- Canonical `skills/` source model with `manifest.json` validation
- Skill discovery, entry validation, registry generation, and state/history persistence
- CLI commands: `list`, `inspect`, `doctor`, `sync`, `init-skill`, `run`
- Adapters for `codex`, `openclaw`, `claude-code`, and `opencode`
- Stable `--json` envelope with `contractVersion`, `command`, `status`, `operation`, `writeIntent`, `exitCode`, `output`, and `data`
- Structured `doctor` summary fields including `issueCounts`, `codeGroups`, `topRiskCodes`, and `riskLevel`
- `sync` additions: targeted sync, `executionIntent`, `noOp`, and conflict repair preview/execution metadata
- `run` additions: `--exec`, `execRequested`, `executed`, and structured error-path `data.error`
- Capability fields for `list` / `inspect`: `hasRunScript` and `canExec`
- `codex` adapter now renders target `SKILL.md` with Codex-compatible YAML frontmatter
- `claude-code` adapter now renders target `SKILL.md` with Claude Code-compatible YAML frontmatter
- `init-skill` enhancements: `--agents`, `--with-run-script`
- Registry auto-refresh before common commands
- Documentation set: README, Human CLI guide, OpenClaw guide, command contracts, manual testing handbook, GitHub release test plan, release checklist, release notes template
- Release draft document: `docs/releases/v0.1.0.md`

### Changed

- Package name changed to `ray-skill-hub`
- CLI binary name changed to `rayskillhub`
- User-facing docs now prefer `rayskillhub` command examples while still documenting source-repo execution via `node dist/cli/index.js`
- `doctor` now checks stale install records, missing targets, broken symlinks, install drift, and exposes clearer risk-oriented summaries
- `sync` now treats `no_source_changes`-only dry runs as successful `noOp` results instead of warnings
- `run` now prepares skills into a ready-to-run state for a target agent and exposes explicit execution-state fields

### Notes

- `claude-code` currently maps to user-level `~/.claude/skills/<skill>/`
- `codex` currently maps to `~/.codex/skills/<skill>/`, and runtime acceptance has been verified with Codex-native frontmatter format
- if `~/.agents/skills` contains old-format duplicate skills, Codex may still emit loader noise; clean stale duplicates before final verification
- No breaking changes in documented `v0` command contracts beyond the package/bin rename at the branding layer
