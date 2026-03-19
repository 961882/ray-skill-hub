# RaySkillHub

`RaySkillHub` is a local-first skill control plane for AI agent tools.

This public-core snapshot keeps only the essential source code, canonical skills, and adapter logic needed to build and understand the project. Extended docs, test sources, planning assets, release artifacts, and local machine state are intentionally excluded from the tracked GitHub repository.

## What It Does

- discovers canonical skills under `skills/`
- validates `manifest.json` metadata and entry files
- syncs skills into supported agent directories
- checks install drift and target conflicts
- exposes a human CLI and stable `--json` responses for agents

## Supported Agents

- `codex`
- `claude-code`
- `openclaw`
- `opencode`

## Key Commands

```bash
npm install
npm run build

rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor
rayskillhub sync --agent codex --dry-run
rayskillhub run demo-exec-skill --agent codex --exec
```

During local development you can also run the built CLI directly:

```bash
node dist/cli/index.js list
```

## Repository Layout

- `src/` - TypeScript implementation
- `skills/` - canonical example skills
- `templates/manifest.json` - scaffold template for `init-skill`
- `registry/agents.json` - supported agent definitions
- `scripts/pre-release-check.mjs` - lightweight build/health preflight

## Scope Of This Public Snapshot

Included:

- core CLI source
- adapters
- canonical skills
- minimal build and preflight scripts

Excluded from tracked GitHub contents:

- extended documentation
- test source files
- release planning and release-note artifacts
- BMAD internal assets
- local state and generated indexes

## Notes

- `codex` and `claude-code` targets render `SKILL.md` with YAML frontmatter.
- `openclaw` may require a fresh session after sync if an old session cached a stale skill snapshot.
- This package remains local-first; it is not a remote orchestration service.
