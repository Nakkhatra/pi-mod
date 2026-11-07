---
name: handoff-create
description: Create a timestamped session handoff checkpoint in handoffs/ so work can continue in a new chat session. Use when the user asks to handoff, checkpoint, wrap up, save session context, or continue this work later in a new chat.
---

# Handoff Create

Write a checkpoint file to `handoffs/` in the repo root so a fresh session can resume with full context. Checkpoints are append-only — never overwrite an existing one.

Triggers are **explicit signals only**: the user says handoff / checkpoint / wrap up / continue later, or explicitly signals the task/session is complete. Do not fire on inferred endings (idle time, context compaction).

## Steps

1. **Write from current session context only** — do not re-read source files. The only pre-write read is the carry-forward check below.
2. **Derive lane** = current git branch / worktree name (`git branch --show-current`). Do not maintain a separate lane registry. If the directory is not a git repo, omit the lane segment from the filename and drop the `lane:` frontmatter field entirely.
3. **Carry-forward**: read the newest existing checkpoint **for this same lane** (in a lane-less repo: the newest lane-less checkpoint) and fold still-unresolved `Left` items into your new list. Don't let backlog silently drop across handoffs.
4. **Filename**: `handoffs/YYYY-MM-DD_HHMM_<lane>_<slug>.md`
   - slug = 4-5 lowercase hyphenated words summarizing the session.
   - Sanitize lane for the **filename only**: replace `/` and whitespace with `-`, lowercase, cap ~30 chars (`feature/auth-jwt` → `feature-auth-jwt`). Frontmatter keeps the raw branch name.
   - Same-minute collision → append `-2`, `-3`.
5. **Content rules**:
   - Terse bullets, no prose paragraphs. Max 10 bullets per section.
   - File refs as `path:line`. No code blocks over 3 lines.
   - Reference PROJECT.md sections instead of restating project structure. No PROJECT.md → still write the checkpoint, just omit `§` Key-refs lines.
   - **Omit any section with no content — never write "None" or stub headers.** No debugging → no `Diagnosis` section.
   - Exclude explanation-only Q&A (user asked to understand something; nothing changed).
6. **After writing**, reply in ≤3 lines: file path, status, next task. If `Diagnosis` or `Done` contains a reversed or significant architectural decision, add one line: "Consider logging this as an ADR in PROJECT.md" — don't write the ADR yourself; that's `project-md`'s job.
7. **Single-model, single-shot.** Never spawn a sub-agent or fan out to help write the handoff — it's mechanical summarization, not problem-solving. If the harness exposes per-call model/reasoning-effort routing, follow its convention for this task class (lowest adequate effort); otherwise leave the session's current model/effort as-is.

## Template

````markdown
---
date: YYYY-MM-DD HH:MM
lane: <raw-branch-or-worktree-name>
slug: <same-as-filename-slug>
status: in-progress | blocked | complete
---
# Handoff: <title>

## Objective
<1–2 lines, current goal>

## Diagnosis
- Symptom: <observed behavior>
- Root cause: <cause> — confirmed | suspected
- Ruled out: <hypothesis> — <why, e.g. "reproduced without it">

## Done
- <what changed>, refs like `src/auth/token.ts:42`

## Left
- [ ] <carried-forward + new items, priority ordered>

## Worked
- <approach> — <why it worked>

## Didn't work
- <approach> — <reason> — don't retry unless <condition>

## Key refs
- PROJECT.md § <relevant section>
- handoffs/<previous-checkpoint-filename>.md  (only if one exists for this lane)
````

Section order matters: `Diagnosis` sits right after `Objective` because it drove the session's actions — a resumed session must see which hypotheses are already dead before it sees solution attempts.
