---
date: 2026-11-06 20:22
lane: feature-steer-now
slug: steer-now-extension-two-variants-built
status: complete
---
# Handoff: steer-now extension — mid-run course correction

## Objective
Let the user course-correct pi mid-turn: get a message in fast during long
running turns without (or with) killing in-flight work.

## Diagnosis
- Symptom: native steering waits for the whole tool batch; Esc aborts and
  forces manual re-submit.
- Root cause: the model is only consulted at LLM-call boundaries, so without
  aborting the earliest injection point IS the end of the current tool batch
  (confirmed in `agent-loop.js` runLoop: steering polled only at loop start,
  after prepareNextTurn, and after each turn's tool batch).
- Ruled out: mid-tool-call delivery without abort — impossible by loop design.

## Done
- `steer-now.ts` (repo root, deployed to `~/.pi/agent/extensions/steer-now.ts`)
- `/steer <msg>`: safe non-abort queue (native steering) + notify about
  delivery timing.
- `/steer! <msg>`: `ctx.abort()` now, auto-resend via `pi.sendUserMessage` on
  `agent_settled` (`event` path uses `pendingInterrupt` state; partial context
  preserved — aborted tool results committed).
- Both paths validated via scripted RPC tests (`/tmp/pi-steer-test/rpc-test.mjs`,
  throwaway): safe = command kept running, message landed at tool-batch end;
  interrupt = 30s sleep killed at 5s, new turn auto-started, model replied.
- Committed `316be23` on `feature-steer-now` (PROJECT.md ADR + list updated).

## Left
- [ ] Dogfood in TUI: confirm `/steer`/`/steer!` notifications render and
  autocomplete offers both command names (RPC-verified only so far).
- [ ] From previous lane handoff: dogfood session-catch-up resume notice in TUI.

## Worked
- RPC mode (`pi --mode rpc` + node stdin/stdout JSON driver) to test mid-run
  behavior without tmux (unavailable on this machine).
- `ctx.abort()` in TUI routes through pi's abort handler (restores natively
  queued msgs to editor, aborts) — no direct session.abort needed.

## Key refs
- PROJECT.md § ADR Log — 2026-11-06 steer-now entry
- handoffs/2026-11-06_1950_feature-session-catch-up_session-catch-up-extension-built.md
