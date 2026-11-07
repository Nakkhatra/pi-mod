# pi-mod package

Portable package of all pi coding agent customizations. Apply on a new device
with `../install.sh` from the repo root.

## Contents

| Path | Installs to | What it is |
|---|---|---|
| `extensions/auto-session-name.ts` | `~/.pi/agent/extensions/` | Auto-names sessions `NN - label` (chronological index + LLM summary); `/auto-name` command |
| `extensions/session-catch-up.ts` | `~/.pi/agent/extensions/` | Stale-session notice on resume + opt-in `/catch-up` drift brief |
| `extensions/tokenhub.ts` | `~/.pi/agent/extensions/` | TokenHub LLM provider |
| `extensions/preset.ts` | `~/.pi/agent/extensions/` | Preset switching extension |
| `extensions/handoff-effort-drop.ts` | `~/.pi/agent/extensions/` | Drops thinking effort when loading handoffs |
| `agents/researcher.md` | `~/.pi/agent/agents/` | Web-research subagent (curl: DDG Lite, HN Algolia, StackExchange, GitHub, arXiv; Reddit via DDG `site:`) |
| `prompts/research-and-plan.md` | `~/.pi/agent/prompts/` | `/research-and-plan` — researcher → planner chain |
| `skills/handoff-create/` | `~/.pi/agent/skills/` | Session handoff checkpoints into `handoffs/` |
| `skills/handoff-resume/` | `~/.pi/agent/skills/` | Resume from a handoff checkpoint |
| `skills/project-md/` | `~/.pi/agent/skills/` | Create/maintain PROJECT.md (plan + ADR log) |
| `themes/*.json` | `~/.pi/agent/themes/` | tokyo-night, neon-green, neon-green-light, omarchy, opencode |
| `settings.json` | `~/.pi/agent/settings.json` | Packages (pi-clinepass-provider, catppuccin-pi-theme, pi-ask-side), default theme/model |
| `models.json` | `~/.pi/agent/models.json` | Provider model overrides |
| `presets.json` | `~/.pi/agent/presets.json` | plan / execute / review presets |
| `AGENTS-global.md` | `~/.pi/agent/AGENTS.md` | Global rules: background long commands, git commit discipline |

## Notes

- The `subagent` extension is pi's bundled example, symlinked into
  `extensions/` by the installer (required by the researcher agent).
- Settings reference npm packages; pi installs them on first launch.
- After installing, run `pi` once and check for "Theme conflicts" errors to
  confirm themes validate.
