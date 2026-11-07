# Prompt: Model-routing presets (plan / execute / review) + low-effort auto-drop for handoff skills

Paste into the same Pi session.

---

Build Tier 1 from your scoping report — the preset extension — plus the narrow slice of Tier 2 that's safe (deterministic skill-invocation matching, not task classification). Skip broad plan/execute/review auto-routing entirely; that stays a manual `/preset` switch.

## 1. Adopt the preset extension

Copy `examples/extensions/preset.ts` to `~/.pi/agent/extensions/preset.ts`. If `examples/extensions/plan-mode/` has a read-only tool-restriction helper worth reusing for the `plan` profile below, borrow it; otherwise skip — don't build tool restriction from scratch if it adds real complexity for a "nice to have."

## 2. Write three profiles to `~/.pi/agent/presets.json`

Use exact model IDs from `models-store.json`, not the shorthand below — confirm the real IDs before writing.

- **`plan`** — Kimi K3 or GLM 5.3 (whichever you confirm is the stronger reasoner per Step 0 of the original build — if that was never actually tested, flag it here rather than guessing), thinking level high. Read-only tools if the plan-mode restriction is easy to reuse; otherwise full tools with an instruction not to edit yet.
- **`execute`** — GLM 5.2, thinking level medium. Full tools, no restriction.
- **`review`** — same model as `plan`, thinking level high, full tools. Bake adversarial-review instructions into the preset's `instructions` field — the point is edge-case scrutiny before a commit, echoing Kun's "No Mistakes" pass. A few lines is enough: look for unhandled edge cases, incorrect assumptions, missed error paths; don't rewrite, just flag.

Switch via `/preset plan`, `/preset execute`, `/preset review` — confirm this matches how the example extension actually registers the command; adjust naming if it doesn't.

## 3. Narrow auto-effort drop for the handoff skills only

On the `input` hook, detect when the raw text is exactly `/skill:handoff-create` or `/skill:handoff-resume` (or whatever the actual invocation syntax is — confirm against how skills are actually triggered, don't assume the slash-colon form is right without checking). When matched, call `pi.setThinkingLevel()` to the lowest available level for the *current* model before the skill runs, then restore whatever level was active beforehand once the skill completes (session-scoped, so this shouldn't leak into the next turn).

This activates the "lowest effort adequate" clause already written into `handoff-create`'s spec, which has had no actual mechanism behind it until now. Do not extend this pattern to `project-md` — its ADR-logging path can involve real judgment calls, not pure mechanical writing, so it doesn't get the auto-drop.

Do **not** build any hook that tries to classify plain user text (no skill invocation) into plan/execute/review — that's the part we're deliberately keeping manual.

## 4. Report back

- Confirm actual model IDs used in `presets.json`.
- Confirm whether Step 0's original "which of Kimi K3 / GLM 5.3 is the stronger reasoner" question ever got answered — if not, flag it as unresolved rather than picking one arbitrarily for the `plan`/`review` profiles.
- Confirm the exact skill-invocation string(s) the `input` hook is matching against, and that thinking-level restore-after-skill actually works as expected (test it once if you can).
- Note anything from `plan-mode`'s tool restriction you did or didn't reuse, and why.
