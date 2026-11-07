---
name: handoff-resume
description: Resume work from a previous session's handoff checkpoint. Use when starting a session that continues prior work, or the user asks to resume, pick up, or continue from a handoff or checkpoint.
---

# Handoff Resume

Restore context from `PROJECT.md` + one checkpoint in `handoffs/`. Read exactly two files by default — do not graze the whole checkpoint history.

## Steps

1. Read `PROJECT.md` at the repo root. It is the source of truth for plan, structure, and ADR decisions when present. If it doesn't exist, say so and continue with whatever checkpoint history exists — checkpoints still work without it.
2. `ls handoffs/`:
   - **Missing or empty** → say so ("no checkpoints yet") and stop. Do not error.
   - **User gave a lane fragment** (e.g. "the auth one", "feature/auth-jwt") → sanitize it the same way handoff-create sanitizes filenames (replace `/` and whitespace with `-`, lowercase), substring-match against filenames, use the most recent match. Several matches → pick the newest and say which one you chose.
   - **No fragment, multiple lanes have recent checkpoints** → list them (lane name + latest checkpoint timestamp each) and ask which one. Don't guess.
   - **No fragment, one lane** → newest file by name; the `YYYY-MM-DD_HHMM` prefix sorts chronologically.
3. Read that one checkpoint only. Older checkpoints for that lane are read only if the user asks for more history.
4. Reply with a ≤10-line state summary, then continue working:
   - Objective + status (from frontmatter)
   - Key done items (1-2 lines)
   - Open diagnosis, if any: root cause confirmed/suspected + ruled-out hypotheses — flag these explicitly as "do not re-investigate"
   - Next task from `Left`
   - Pitfalls: don't-retry items from `Didn't work`
