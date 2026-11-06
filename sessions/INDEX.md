# Session Index

Archived pi coding agent sessions that created/modified pi extensions, skills,
themes, or config. Each file is a raw `.jsonl` transcript.

## Main sessions

| Session file | What it produced |
|---|---|
| `2026-09-08T16-58-20-998Z_01a081f4-…a3e.jsonl` | Skills: `handoff-create`, `handoff-resume`, `project-md`; docs `~/.pi/agent/docs/pi-handoff-skills-README.md`; extension `handoff-effort-drop.ts`; `presets.json`; copied `preset.ts` example extension |
| `2026-09-08T17-34-45-574Z_01a08216-…1db.jsonl` | Created the `tokyo-night` theme; terminal setup (kitty/wezterm) and `models.json` edits |
| `2026-09-11T15-38-33-902Z_01a0911e-…3e.jsonl` | Extension `auto-session-name.ts` (chronologically-numbered session names) |
| `2026-10-24T00-33-16-346Z_01a16b53-…0a3.jsonl` | Repaired invalid themes (`neon-green`, `neon-green-light`, `omarchy`, `opencode`) against the pi JSON schema |
| `2026-10-26T14-48-56-006Z_01a178af-…055.jsonl` | Session housekeeping (moved session 17 to `bodw_optimization`); edited `auto-session-name.ts` and `settings.json` |
| `2026-11-06T12-17-26-154Z_01a1b0ca-…2d8.jsonl` | Reworked `tokyo-night` theme for a transparent terminal |

## test-runs/

Throwaway pi sessions spawned to verify the handoff/project-md skills
(`tmp-pmd-test-*`) and the `handoff-effort-drop` extension (`tmp-eff-test-*`).
Kept only as historical evidence of how the artifacts were validated.

## Note

`extensions/tokenhub.ts` in `~/.pi/agent/extensions/` has no originating
session in the archive (created outside a recorded session or the record was
deleted).
