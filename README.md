# pi-mod

Customizations for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent) — extensions, skills, themes, agents, prompts, and config — packaged for one-command installation on any new device.

## Quick start (new device)

```bash
git clone git@github.com:Nakkhatra/pi-mod.git
cd pi-mod
./install.sh
# then fill in your API keys:
$EDITOR ~/.pi/agent/auth.json
# launch pi — done
```

## Install script

| Command | Behavior |
|---|---|
| `./install.sh` | Copy everything from `package/` into `~/.pi/agent/` |
| `./install.sh --link` | Symlink instead of copy — edit files in this repo, live in pi |
| `./install.sh --dry-run` | Preview only; changes nothing |

Safety behavior:

- Any existing file in `~/.pi/agent/` is backed up to `~/.pi/agent/.backup-<timestamp>/` before being replaced.
- **auth.json is never clobbered**: the packaged version contains `REPLACE_WITH_YOUR_*` placeholders, and the installer only overwrites an existing auth.json if it still contains placeholders. Real keys are always kept.
- The bundled `subagent` extension is symlinked from pi's installed examples (required by the `researcher` agent).
- npm packages (pi-clinepass-provider, catppuccin-pi-theme, pi-ask-side) are installed via `npm install` into `~/.pi/agent/npm/`.

## What's included

| Category | Items |
|---|---|
| Extensions | `auto-session-name` (chronological NN + LLM session names), `session-catch-up` (stale-session notice + `/catch-up`), `tokenhub` (LLM provider), `preset` (preset switching), `handoff-effort-drop` |
| Agent | `researcher` — web research subagent (DuckDuckGo, Hacker News, StackExchange, GitHub, arXiv; Reddit via DDG `site:` queries) |
| Prompt | `/research-and-plan` — researcher → planner chain |
| Skills | `handoff-create`, `handoff-resume` (session checkpoints), `project-md` (living plan + ADR log) |
| Themes | tokyo-night, neon-green, neon-green-light, omarchy, opencode (+ catppuccin via npm package) |
| Config | `settings.json`, `models.json`, `presets.json` (plan/execute/review), `auth.json` (placeholders), `dual_review.yaml`, global `AGENTS.md` rules |
| Docs | `package/docs/` — setup guides and workflow prompts |
| npm | dependency manifests for settings-declared packages |

See `package/README.md` for the full file-by-file manifest.

**Not packaged** (regenerated on device): `models-store.json` (pi's model catalog cache), `npm/node_modules/`, `bin/rg` (binary), `sessions/`, real API keys.

## Repo layout

```
pi-mod/
├── package/          ← source of truth: all customizations, mirrored to ~/.pi/agent/
│   ├── extensions/  agents/  prompts/  skills/  themes/
│   ├── settings.json  models.json  presets.json  auth.json
│   ├── AGENTS-global.md  dual_review.yaml
│   ├── docs/  npm/
│   └── README.md     ← file-by-file manifest
├── install.sh        ← applies package/ to ~/.pi/agent/
├── PROJECT.md        ← plan, structure, ADR decision log (read first)
├── AGENTS.md         ← session rules for agents working in this repo
├── PLAN-*.md         ← build plans for individual features
├── web-research/     ← source of the researcher agent + workflow prompt
├── sessions/         ← archived pi session transcripts (INDEX.md)
└── handoffs/         ← session handoff checkpoints
```

## Workflow for future features

**Every feature added to `~/.pi/agent/` must leave a copy in this repo — `package/` is the single source of truth.** The strict rule:

1. Build the feature (extension / skill / theme / agent / prompt / config change).
2. Put (or update) the file in `package/` at the path matching its live location under `~/.pi/agent/` — e.g. a new extension goes to `package/extensions/<name>.ts`.
3. Update `package/README.md` (manifest table) and `PROJECT.md` (ADR entry if it's a decision).
4. Run `./install.sh` to sync, or verify with `diff -r package/extensions ~/.pi/agent/extensions`.
5. Commit. Deleting a feature = remove it from `package/` too.

This keeps installs plug-and-play forever: `git clone && ./install.sh` always reproduces the full setup.
