# PROJECT.md

## Goal
Home for all work that extends, customizes, or maintains the pi coding agent
(extensions, skills, themes, presets, session utilities) on this machine, plus
the archived sessions that produced the existing ones. Future pi-mod work
starts from this directory.

## Architecture
- Live artifacts stay in `~/.pi/agent/` — that is what pi loads at runtime.
- This repo holds the history (`sessions/`) and is the working directory for
  new extension/skill/theme work; finished files get copied/edited into the
  live locations below.

### Reference directories (live locations pi actually uses)
- Extensions: `~/.pi/agent/extensions/` — TypeScript files loaded at startup
  (current: `auto-session-name.ts`, `handoff-effort-drop.ts`, `preset.ts`,
  `session-catch-up.ts`, `steer-now.ts`, `tokenhub.ts`)
- Skills: `~/.pi/agent/skills/<name>/SKILL.md` (current: `handoff-create`,
  `handoff-resume`, `project-md`)
- Themes: `~/.pi/agent/themes/*.json` (current: `tokyo-night`, `neon-green`,
  `neon-green-light`, `omarchy`, `opencode`)
- Config: `~/.pi/agent/settings.json`, `models.json`, `presets.json`
- Official pi docs (read-only):
  `~/.local/share/pi-node/node-v22.23.2-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/`
  and `examples/` (extension/skill/theme templates live in `examples/`)

## Structure
- `PROJECT.md` — this file
- `AGENTS.md` — session start rules for work in this repo
- `PLAN-session-catch-up.md` — build plan for the session-catch-up extension
- `sessions/` — archived pi session transcripts that created/modified pi
  utilities (see `sessions/INDEX.md` for what each produced)
- `sessions/test-runs/` — throwaway sessions used to validate skills/extensions

## Conventions
- New skills follow the SKILL.md frontmatter format; new extensions follow the
  `ExtensionAPI` TypeScript pattern in pi's `examples/extensions/`.
- Themes must validate against pi's theme JSON schema (broken themes cause
  startup "Theme conflicts" errors).
- Validate changes by launching a scratch pi session (e.g. `pi -p "Reply with
  exactly: ok"` in a `/tmp` dir) before touching live files.

## ADR Log
### 2026-11-06 — Session staleness solved via catch-up extension (A+B), handoffs as fallback
Decided that resuming old feature sessions needs built-in drift awareness:
one extension providing (A) an automatic stale-session notice on resume and
(B) an opt-in `/catch-up` command injecting a drift brief into context.
Handoff-per-session discipline stays as fallback (Option C), not a
requirement. Plan: PLAN-session-catch-up.md.

### 2026-11-06 — Mid-run course correction via steer-now extension (two variants)
The model is only consulted at LLM-call boundaries, so without aborting, the
earliest a queued message can reach the agent is the end of the current tool
batch (native steering already does this). Extension `steer-now.ts` adds
`/steer <msg>` (safe: queue natively, nothing interrupted) and `/steer! <msg>`
(interrupt: abort now, auto-resend the message on settle — fuses Esc +
re-submit; partial context is preserved). Validated via RPC-mode scripted
tests for both paths.

### 2026-11-06 — Sessions stored in pi's session dir, symlinked here
Archived transcripts live in
`~/.pi/agent/sessions/--home-beast-work-personal_repos-pi-mod--/` (pi's cwd-key
dir) so `/resume` works when launching pi from this repo; `sessions/` holds
symlinks to them plus plain copies of the throwaway test runs.
