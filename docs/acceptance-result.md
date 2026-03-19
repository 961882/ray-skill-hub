# RaySkillHub Cross-Agent Acceptance Result

Date: 2026-03-19
Tester: OpenCode + Ray
Candidate: `ray-skill-hub@0.1.0` local workspace snapshot (`npm run pre-release` passed on 2026-03-19)
Commit SHA: n/a (non-git workspace)

## Acceptance Skill

- Skill name: `acceptance-check-skill`
- Trigger phrase: `ACCEPTANCE-CHECK-2026`
- Expected response: `ACCEPTANCE-CHECK-2026-CONFIRMED`

---

## 1. Claude Code

### Install Check

- [x] `rayskillhub sync --agent claude-code --skill acceptance-check-skill --dry-run --json`
- [x] `rayskillhub sync --agent claude-code --skill acceptance-check-skill`
- [x] Target exists: `~/.claude/skills/acceptance-check-skill`

### Behavior Check

- [x] Sent: `ACCEPTANCE-CHECK-2026`
- [x] Got exact response: `ACCEPTANCE-CHECK-2026-CONFIRMED`

### Notes

- Skill is loaded correctly after frontmatter-compatible sync.
- If interactive session still shows old behavior, reopen a fresh session.

---

## 2. Codex

### Install Check

- [x] `rayskillhub sync --agent codex --skill acceptance-check-skill --dry-run --json`
- [x] `rayskillhub sync --agent codex --skill acceptance-check-skill`
- [x] Target exists: `~/.codex/skills/acceptance-check-skill`

### Behavior Check

- [x] Sent: `ACCEPTANCE-CHECK-2026`
- [x] Got exact response: `ACCEPTANCE-CHECK-2026-CONFIRMED`

### Notes

- Codex runtime acceptance is verified as pass with YAML frontmatter format.
- Old duplicate copies under `~/.agents/skills` may cause loader noise and should be cleaned.

---

## 3. OpenClaw

### Install Check

- [x] `rayskillhub sync --agent openclaw --skill acceptance-check-skill --dry-run --json`
- [x] `rayskillhub sync --agent openclaw --skill acceptance-check-skill`
- [x] Target exists: `~/.openclaw/skills/acceptance-check-skill`

### Behavior Check

- [x] Sent: `ACCEPTANCE-CHECK-2026`
- [x] Got exact response: `ACCEPTANCE-CHECK-2026-CONFIRMED`

### Notes

- `openclaw skills info acceptance-check-skill` reports `Ready`.
- If default agent keeps stale snapshot, run with a fresh/isolated agent session.

---

## 4. OpenCode

### Install Check

- [x] `rayskillhub sync --agent opencode --skill acceptance-check-skill --dry-run --json`
- [x] `rayskillhub sync --agent opencode --skill acceptance-check-skill`
- [x] Target exists: `~/.config/opencode/skills/acceptance-check-skill`

### Behavior Check

- [x] Sent: `ACCEPTANCE-CHECK-2026`
- [x] Got exact response: `ACCEPTANCE-CHECK-2026-CONFIRMED`

### Notes

- Install phase reports stable no-op semantics when source hash is unchanged.
- Runtime behavior check is pass.

---

## Final Verdict

### Install Acceptance

- [x] All in-scope target agents installed successfully

### Behavior Acceptance

- [x] Claude Code passed
- [x] Codex passed
- [x] OpenClaw passed (fresh/isolated session)
- [x] OpenCode passed

### Overall

- [x] Accepted with limitations

### Summary

- Passed agents: `claude-code`, `codex`, `openclaw`, `opencode`
- Failed agents: none
- Known limitations: OpenClaw default long-lived session may keep old skill snapshot; use fresh/isolated session after sync.
- Next action: Keep this checklist for each release candidate and attach command outputs when re-validating.
