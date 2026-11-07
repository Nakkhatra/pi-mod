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
  `session-catch-up.ts`, `tokenhub.ts`, plus `subagent/` symlinked from pi's
  bundled examples)
- Subagents: `~/.pi/agent/agents/*.md` (current: `researcher` — web research
  before planning)
- Workflow prompts: `~/.pi/agent/prompts/*.md` (current: `research-and-plan`)
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
- `package/` — **portable package of ALL customizations** (see `package/README.md`);
  `install.sh` at repo root applies it to `~/.pi/agent/` (`--link` for symlinks,
  `--dry-run` to preview). Existing files are backed up to `~/.pi/agent/.backup-<ts>/`.
  Includes auth.json with PLACEHOLDER keys (installer never overwrites real keys),
  dual_review.yaml, docs/, npm manifests. Excludes models-store.json (generated),
  npm/node_modules (installed), bin/rg (binary).
- `AGENTS.md` — session start rules for work in this repo
- `PLAN-session-catch-up.md` — build plan for the session-catch-up extension
- `web-research/` — source of the `researcher` subagent and
  `/research-and-plan` workflow prompt (copied to live locations)
- `sessions/` — archived pi session transcripts that created/modified pi
  utilities (see `sessions/INDEX.md` for what each produced)
- `sessions/test-runs/` — throwaway sessions used to validate skills/extensions

## Conventions
- **STRICT — every feature lives in this repo**: any new/modified/deleted file
  under `~/.pi/agent/` (extension, skill, theme, agent, prompt, config, docs)
  MUST be mirrored in `package/` at the matching path and committed here in the
  same session. `package/` is the source of truth; `~/.pi/agent/` is just the
  installed copy. Sync with `./install.sh` or verify with `diff -r`. No feature
  is "done" until it's in `package/` and committed — this is what keeps
  `git clone && ./install.sh` plug-and-play on new devices.
- New skills follow the SKILL.md frontmatter format; new extensions follow the
  `ExtensionAPI` TypeScript pattern in pi's `examples/extensions/`.
- Subagent workflow prompts use the chain format with `{previous}`
  placeholders (see `web-research/prompts/`).
- Themes must validate against pi's theme JSON schema (broken themes cause
  startup "Theme conflicts" errors).
- Validate changes by launching a scratch pi session (e.g. `pi -p "Reply with
  exactly: ok"` in a `/tmp` dir) before touching live files.

## ADR Log
### 2026-11-08 — Package covers all of ~/.pi/agent except device-local/generated
Second pass added auth.json (placeholders only — installer replaces placeholder
auth.json but keeps files with real keys), dual_review.yaml, docs/, and
npm package manifests. models-store.json (pi-generated catalog cache),
npm/node_modules, and bin/rg are deliberately not packaged. Verified
package/ is byte-identical to live ~/.pi/agent via diff -r before commit.

### 2026-11-08 — Repo restructured as portable install package
All live `~/.pi/agent/` artifacts are mirrored in `package/` (extensions,
agents, prompts, skills, themes, settings/models/presets.json, global
AGENTS.md) with `install.sh` applying them on a new device (copy or symlink
mode, auto-backup of existing files). `package/` is the source of truth going
forward: edit there, run `./install.sh` to sync live. Note: `install.sh --dry-run`
initially MOVED live files into backup (bug) — fixed by checking DRY before
backup/move; never move files in dry mode.

### 2026-11-06 — Web research before planning via subagent extension + researcher agent
Planning on current best practice needs live web info; the agent has no
built-in web tooling. Adopted pi's bundled subagent extension (symlinked into
`~/.pi/agent/extensions/subagent/`) with a custom `researcher` agent that
researches via `bash`+`curl` against verified free endpoints (DuckDuckGo
Lite, HN Algolia, StackExchange API, GitHub API, arXiv API; Reddit only via
DDG `site:` queries since Reddit blocks bot UAs). Workflow prompt
`/research-and-plan` chains researcher → planner. Verified endpoints by live
curl tests on 2026-11-06; arXiv requires https, StackExchange requires
`--compressed`.

### 2026-11-06 — GitHub remote connected; main from pi-mod-archive
Remote `origin` = git@github.com:Nakkhatra/pi-mod.git. `main` on GitHub
tracks the archived project docs (pushed from `pi-mod-archive`); feature
branches carry ongoing work.
### 2026-11-06 — Session staleness solved via catch-up extension (A+B), handoffs as fallback
Decided that resuming old feature sessions needs built-in drift awareness:
one extension providing (A) an automatic stale-session notice on resume and
(B) an opt-in `/catch-up` command injecting a drift brief into context.
Handoff-per-session discipline stays as fallback (Option C), not a
requirement. Plan: PLAN-session-catch-up.md.

### 2026-11-06 — Mid-run course correction solved by backgrounding, not slash commands (reverses steer-now extension)
Initial approach: `steer-now.ts` extension with `/steer` (native queue) and
`/steer!` (abort + auto-resend). Live testing showed the root problem is
foreground tool calls themselves — they block the turn, so even native steer
only lands after the whole batch, and no injection point can beat that.
Reversed: extension removed; the rule "never run >10s commands in the
foreground — nohup background + report PID/log, poll later" now lives in
`~/.pi/agent/AGENTS.md` (global). Turn ends fast, queued messages are
consumed at the next LLM call, in-flight work keeps running.

### 2026-11-06 — Sessions stored in pi's session dir, symlinked here
Archived transcripts live in
`~/.pi/agent/sessions/--home-beast-work-personal_repos-pi-mod--/` (pi's cwd-key
dir) so `/resume` works when launching pi from this repo; `sessions/` holds
symlinks to them plus plain copies of the throwaway test runs.
