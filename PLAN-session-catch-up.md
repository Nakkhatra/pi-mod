# Plan: `session-catch-up` Extension

Status: **implemented, tested, installed** (`~/.pi/agent/extensions/session-catch-up.ts`, 2026-11-06)
Decision: build **Option A + B as one extension**; keep **Option C (handoff discipline)** as fallback. (ADR 2026-11-06 in PROJECT.md)

## Problem

Resuming an older feature session gives no signal that the repo moved on since
that session ended — newer sessions may have changed things that affect the
old feature. The user resumes old sessions out of convenience and needs the
session to *know* what changed, whether or not a handoff was ever written.

## Design

One extension, two surfaces:

### A. Automatic drift notice (passive)

- Hook `pi.on("session_start", ...)` — act only when `event.reason === "resume"`.
  Ignore `"startup" | "reload" | "new" | "fork"`.
- Compute session end time: last entry timestamp via
  `ctx.sessionManager.getEntries()` (last entry's `timestamp`).
- Gather drift since that timestamp:
  1. **Newer sibling sessions** — list `~/.pi/agent/sessions/<encoded-cwd>/*.jsonl`
     (encoded-cwd = cwd with `/`→`-`, wrapped in `--`, per
     `session-manager.js:294`). For each file newer than session end: read the
     latest `session_info` name (`NN - label`). Summarize as
     "N newer sessions: 05 - …, 06 - …".
  2. **Git drift** — if ctx.cwd is a git repo: `git log --oneline --since=<end-ts>`
     and count of changed files (`git log --name-only --pretty=format: --since | sort -u | wc -l`).
     Skip silently if not a repo.
  3. **Newer handoffs** — files in `<cwd>/handoffs/` modified after session end;
     report newest checkpoint filename only.
- If anything found: `ctx.ui.notify(...)` — one line, e.g.
  `⚠ Stale session (ended 2026-10-24 06:39): 2 newer sessions, 3 commits (5 files), 1 newer handoff. Run /catch-up for a brief.`
- If nothing found: stay completely silent.

### B. `/catch-up` command (active)

- Register via `pi.registerCommand("catch-up", ...)`.
- Re-run the gathering from A, plus:
  - `git log --stat --since` (commits with touched files)
  - newest handoff's `Done`/`Left` sections (read only frontmatter + those sections)
- Inject a structured drift brief into the conversation:
  `pi.sendMessage({ customType: "session-catch-up", content: <brief>, display: true }, { triggerTurn: true })`
  so the model itself reads it before further work. Brief format: date range,
  newer sessions list, commit list, files-changed list, handoff summary,
  closing instruction: "Treat the above as changes your session predates;
  re-verify affected assumptions before editing."

## API references (pi docs: extensions.md)

- `session_start` event + `reason` values — extensions.md:473-490, 393
- `ctx.sessionManager.getEntries()` — extensions.md:1195-1210
- `pi.sendMessage` + `deliverAs`/`triggerTurn` — extensions.md:1625-1648
- `pi.registerCommand` — extensions.md:1735
- `ctx.ui.notify` — extensions.md:1165
- encoded session dir — dist/core/session-manager.js:294

## Structure

- Source of truth: `~/work/personal_repos/pi-mod/session-catch-up.ts`
- Installed copy: `~/.pi/agent/extensions/session-catch-up.ts`
  (copy after tests pass; live dir is what pi loads)

## Implementation steps

1. Scaffold extension (factory pattern per docs §Writing an Extension).
2. Implement drift gathering (pure functions, unit-testable by eye).
3. Implement `session_start` notice + `/catch-up` command.
4. Test (below), fix, copy to `~/.pi/agent/extensions/`.
5. Update PROJECT.md ADR + this file's status line.

## Test plan (scratch sessions in /tmp, never on real repos)

- Init a throwaway git repo `/tmp/cu-test` with 2 commits; create session A
  (`pi -p "…"`), add a newer commit + a newer session B; resume A interactively →
  expect the stale notice; run `/catch-up` → expect brief with commit B listed.
- Negative: resume a session with no newer activity → silence.
- Negative: non-git cwd → notice covers sessions/handoffs only, no errors.
- Edge: fork/reload/new reasons → no notice at all.

## Implementation notes (deviations from original design)
- CLI resume paths (`pi -c`, `-r`, `--session <file>`) fire `session_start` with
  `reason: "startup"`, not "resume" (only in-session `/resume` yields
  "resume"). The gate therefore treats `reason === "resume"` as a resume, and
  `reason === "startup"` as a resume when the session's oldest entry timestamp
  is older than 60s (fresh sessions have a "now" header; `getEntries()`
  excludes the `session` header entry itself — first entry is `model_change`).
  `reload`/`new`/`fork` stay excluded.
- Verified via RPC mode (`pi --mode rpc` surfaces `ctx.ui.notify` as an
  `extension_ui_request` on stdout); `/catch-up` verified by invoking the real
  factory's registered handler with a stubbed `pi` (print mode does not
  dispatch slash commands).

## Explicit non-goals

- No task classification, no LLM calls (mechanical data gathering only).
- Does not auto-inject the brief on resume — notice only; brief is opt-in
  via `/catch-up` (keeps context clean when you don't care).
- Not a replacement for handoffs (Option C stays the fallback habit).
