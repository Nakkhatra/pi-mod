---
date: 2026-11-06 20:52
lane: feature-steer-now
slug: steer-now-reversed-backgrounding-rule
status: complete
---
# Handoff: steer-now reversed — backgrounding rule for long commands

## Objective
Fast mid-run course correction: user's queued messages must reach the agent
quickly while long work is still running.

## Diagnosis
- Symptom: live TUI test — `/steer` message queued but delivery waited; the
  foreground `sleep` timer kept the whole turn blocked.
- Root cause: confirmed — foreground tool calls hold the turn open; the model
  is only consulted at LLM-call boundaries, so no injection point can beat
  the end of the current tool batch. The problem is the foreground call
  itself, not message delivery.

## Done
- Deleted `steer-now.ts` slash-command extension (repo via `git rm`, and
  `~/.pi/agent/extensions/steer-now.ts`). Commits `316be23` (built) then
  `ba95a0e` (removed) on `feature-steer-now`.
- Reversed decision logged in PROJECT.md ADR (2026-11-06 steer-now entry).
- New global rule in `~/.pi/agent/AGENTS.md` § "Long-running commands":
  never run >10s commands in foreground; `nohup <cmd> >log 2>&1 & echo PID`,
  report PID/log, poll later (`ps -p`, `tail`). Verified live: backgrounded
  120s cooldown returned instantly, turn freed for queued steering.

## Left
- [ ] Dogfood the backgrounding rule: next real long task, confirm agent
  auto-backgrounds without prompting and queued steer lands on next turn.
- [ ] Dogfood session-catch-up resume notice in TUI (carried from
  session-catch-up lane).

## Didn't work
- `/steer`+`/steer!` slash commands — correct mechanics (RPC-verified) but
  wrong layer: delivery timing is bounded by foreground tool calls either
  way. Don't rebuild unless pi adds mid-batch LLM boundaries.

## Key refs
- PROJECT.md § ADR Log — 2026-11-06 steer-now reversal entry
- handoffs/2026-11-06_2022_feature-steer-now_steer-now-two-variants-built.md
