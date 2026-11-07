# Prompt: project-md init should wire up its own AGENTS.md auto-read line

Paste into the same Pi session.

---

Add one behavior to `~/.pi/agent/skills/project-md/SKILL.md`: when it **initializes** a new `PROJECT.md` (the explicit-request init path from the last update — not the update/ADR path), it should also ensure that repo's own local `AGENTS.md` tells future sessions to read `PROJECT.md` automatically. This makes the per-repo opt-in from our last conversation automatic instead of something I have to remember to do by hand.

## Behavior to add, at the end of the init step

After writing the new `PROJECT.md`:

1. Check whether an `AGENTS.md` exists at the repo root (same directory as the new `PROJECT.md`).
2. If it exists, check whether it already contains an instruction to read `PROJECT.md`. If not, append this block:
   ```markdown

   ## Project plan

   Read `PROJECT.md` at session start; treat it as source of truth for structure, architecture, and decisions. Run `handoff-create` at the end of a session or after a significant change.
   ```
   Append, don't rewrite the rest of the file — this is someone else's file with its own content, treat it the same append-only way `project-md` treats `PROJECT.md` itself.
3. If no `AGENTS.md` exists at the repo root, create one containing just that block.
4. If an equivalent instruction already exists (any wording that already tells sessions to read `PROJECT.md`), skip silently — don't duplicate it.
5. Mention what you did in the init's confirmation message to the user (e.g. "Created PROJECT.md and added a read-it-at-start rule to this repo's AGENTS.md").

## Explicitly not in scope

- Don't touch the *global* `~/.pi/agent/AGENTS.md` — this is a per-repo, opt-in-by-using-the-skill addition, which is the whole point (repos that never run `project-md` never pay for this).
- Don't add this to the update/ADR-logging path — only the init (first-creation) path triggers it. Updating an existing `PROJECT.md` shouldn't re-check or re-write `AGENTS.md` every time.
- Don't touch `handoff-create` or `handoff-resume` — this change is scoped to `project-md` only.

## Report back

Confirm the diff to `project-md/SKILL.md`, and note whether you tested it against a repo with an existing `AGENTS.md` (append case) vs. one without (create case) — or flag if you only reasoned through it without testing.
