---
name: project-md
description: Create and maintain PROJECT.md, the project's living plan, structure, and ADR decision log. Use when starting a new project, initializing PROJECT.md, recording or reversing an architecture decision, logging an ADR, or updating the project plan/structure.
---

# Project MD

`PROJECT.md` lives at the repo root and is committed to git. It is **append/strike-only**: content is never deleted, so decision history survives.

Two workflows: **Init** (once, on explicit request) and **ADR update** (ongoing).

## Init

Initialize **only on explicit request**. If invoked to update or log an ADR and no `PROJECT.md` exists, say so and ask whether to initialize first — never silently create one, never silently skip.

1. Derive the goal and plan from the current conversation. Ask the user only if genuinely ambiguous.
2. Scan the repo shallowly if one exists: root `ls`, README, package manifest. Do not deep-read source files.
3. Write `PROJECT.md` from the template below. Keep it ≤60 lines — a map, not a manual.
4. **Wire up auto-read** in the repo's own `AGENTS.md` (repo root, same directory as the new `PROJECT.md`; init path only — ADR updates never touch it; never the global `~/.pi/agent/AGENTS.md`):
   - Already tells sessions to read `PROJECT.md` (any wording) → skip silently; don't duplicate.
   - Exists but has no such instruction → append the block below. Append-only: it's someone else's file with its own content — treat it the same append-only way as `PROJECT.md` itself.
   - Doesn't exist → create it containing just the block (no leading blank line).
   ````markdown

   ## Project plan

   Read `PROJECT.md` at session start; treat it as source of truth for structure, architecture, and decisions. Run `handoff-create` at the end of a session or after a significant change.
   ````
   (The leading blank line is only needed when appending to an existing file.)
5. Tell the user what happened in the confirmation, e.g. "Created PROJECT.md and added a read-it-at-start rule to this repo's AGENTS.md" (or "AGENTS.md already covered it, left as-is").

## ADR update

Trigger: a decision with lasting impact is made or reversed (architecture, data model, tooling, conventions) — including when `handoff-create` flags "Consider logging this as an ADR". Do **not** log implementation details; those belong in `handoffs/` checkpoints.

1. **Strike, don't delete.** Superseded text gets `~~strikethrough~~` with the replacement inline, tagged with the ADR date:
   ```markdown
   - ~~Auth via server sessions~~ → Auth via JWT access tokens (ADR 2026-09-10)
   ```
2. **Append** a dated entry to the ADR Log: what was decided, why, what it supersedes. A few lines, not a paragraph.
3. **Surgical edits only** — targeted edits on the affected lines; never rewrite the whole file.
4. **Fixed sections.** Never rename or reorder the template sections — handoff checkpoints reference them as `PROJECT.md § <section>`.
5. **Concurrent worktrees** (tool-agnostic — detect via git: `git worktree list`, `git branch`): if other worktrees or branches are concurrently active on this repo, go append-only — skip strikethrough, just add dated entries at the end. Let git merge reconcile; do not attempt in-file locking.

The ADR Log grows append-only; the other sections stay near their original size, updated in place with strikethrough rather than growing indefinitely.

## Template

````markdown
# PROJECT.md

## Goal
<1–3 lines: what this project is and why>

## Architecture
<key components and how they fit together, terse>

## Structure
<directory layout, one line per notable path>

## Conventions
<naming, style, testing, or workflow rules specific to this repo>

## ADR Log
### YYYY-MM-DD — <decision title>
<1–3 lines: what was decided and why>
````
