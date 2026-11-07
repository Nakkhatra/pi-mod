---
date: 2026-11-06 19:50
lane: feature-session-catch-up
slug: session-catch-up-extension-built
status: complete
---
# Handoff: session-catch-up extension built

## Objective
Build PLAN-session-catch-up.md: one extension giving (A) an automatic stale-session notice on resume and (B) an opt-in `/catch-up` drift brief. ADR 2026-11-06 in PROJECT.md.

## Done
- `session-catch-up.ts` — drift gathering (newer sibling sessions via mtime + session_info name, git log since last entry ts + name-only files, newest handoff in `handoffs/`), `session_start` notice gate, `/catch-up` command (`pi.sendMessage` `triggerTurn: true`, customType `session-catch-up`) — refs `session-catch-up.ts:400`
- Discovered CLI resume (`pi -c/-r/--session`) fires `session_start` with `reason: "startup"`, not `"resume"`; gate treats old-header startup as resume (60s threshold; `getEntries()` excludes the `session` header — first entry is `model_change`) — refs `session-catch-up.ts:407`
- Tested via RPC mode (`pi --mode rpc` surfaces notify as `extension_ui_request` on stdout); `/catch-up` verified by invoking the real factory's registered handler with a stubbed pi (print mode does not dispatch slash commands)
- All cases pass: git-resume notice, no-drift silence, non-git cwd, fresh session, `new_session` reason silent
- Installed to `~/.pi/agent/extensions/session-catch-up.ts`; loads cleanly with all other extensions
- PLAN status updated with deviations; PROJECT.md structure lists new extension
- Committed e1123ad on `feature-session-catch-up`

## Left
- [ ] Dogfood on a real repo: resume an old feature session via `/resume` in TUI and confirm the notice renders in the TUI (RPC-verified only so far)
- [ ] Optional: consider surfacing `/catch-up` brief as `deliverAs: "followUp"` instead of `steer` if steer ever interrupts an active turn awkwardly
- [ ] Optional polish: cap `--stat` block growth in pathological repos (already capped at 4000 chars)

## Key refs
- PLAN-session-catch-up.md § Implementation notes (deviations from original design)
- PROJECT.md § ADR Log — 2026-11-06 session staleness entries
