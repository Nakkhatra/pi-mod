# Prompt: Simplify handoff skills — drop FirstMate-specific pieces, note Treehouse as optional

Paste this into the same Pi session that built the current skills.

---

We're not using FirstMate/Herdr — that workspace doesn't exist on this machine and isn't planned. Strip out everything that only makes sense in that context, keep the skills as plain, general-purpose tools for any git repo, and add a short note about Treehouse (which we *might* use, purely as an optional local worktree convenience — not part of the token-hungry coordinator stuff).

Current state (per your last summary) — modify in place, don't rebuild from scratch:
- `~/.pi/agent/skills/{project-md,handoff-create,handoff-resume}/SKILL.md`
- `~/.pi/agent/AGENTS.md` — has a global "always read/follow PROJECT.md" line
- `~/.pi/agent/docs/pi-handoff-skills-README.md` — has a "FirstMate workspace addendum" section

## 1. Remove the global AGENTS.md line

Delete the "always read/follow PROJECT.md" instruction from `~/.pi/agent/AGENTS.md` entirely. Don't replace it with anything global. Reasoning: this machine has other, unrelated repos (e.g. `~/work/pi-extensions`) that will never have a `PROJECT.md` — a global blanket instruction pays a small token tax in every session in every repo, forever, for no benefit outside repos that actually use these skills. The skills' own descriptions already handle triggering when relevant, and `handoff-resume`/`project-md` can be invoked explicitly (`/skill:project-md` etc.) or auto-trigger when their description matches what's happening in a repo that has a `PROJECT.md`/`handoffs/` present. No standing global instruction needed.

## 2. Strip FirstMate-specific behavior from `handoff-create`

Remove:
- The `quota-axi` check step entirely (checking remaining quota before writing, the "quota low" note). Not applicable outside a FirstMate coordinator session.
- The trigger "a Treehouse crewmate finishes its task and hands control back to the FirstMate coordinator." Remove this trigger; keep the other two (user says handoff/checkpoint/wrap up, and an explicit completion signal).

Keep everything else as-is: lane derivation from `git branch --show-current`, sanitization for filenames, carry-forward of unresolved `Left` items, the Diagnosis/Done/Left/Worked/Didn't-work/Key-refs template, single-shot no-fan-out rule, omit-empty-sections rule.

## 3. Generalize (don't remove) the multi-worktree handling in `project-md`

The append-only-instead-of-strikethrough behavior when multiple worktrees are concurrently active is still useful for two plain `git worktree` branches, not just Treehouse-managed ones. Reword it to be tool-agnostic: detect concurrent activity via git (other active branches/worktrees touching this repo), not via any FirstMate/Treehouse-specific check. Keep the mechanism, drop the FirstMate framing.

## 4. Replace the README's FirstMate addendum with a short Treehouse note

Delete the "FirstMate workspace addendum" section entirely (the AGENTS.md snippet and environment-check bullets in it are no longer relevant). Replace it with a few lines, not a full section:

```markdown
## Treehouse (optional)

Treehouse is a local git-worktree helper — it just automates `git worktree add` with naming/cleanup. It's not required: plain `git worktree add` gives identical isolation. Nothing here changes if you use it — lane derivation already reads `git branch --show-current`, which works the same whether the worktree was created by hand or by Treehouse.
```

## 5. Report back

Confirm the diffs for all three files (skills, AGENTS.md, README). Flag anything you think should stay that I asked to remove, rather than silently keeping it.
