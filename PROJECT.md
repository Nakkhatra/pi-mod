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
  `tokenhub.ts`)
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
### 2026-11-06 — Consolidate pi-mod work under one repo
Archived all pi-extension/skill/theme sessions from `~/.pi/agent/sessions/`
into `sessions/` here so future pi customization work has a single home with
its history attached.
