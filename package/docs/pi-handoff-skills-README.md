# Session Handoff System for pi

Persistent project memory across chat sessions: a living `PROJECT.md` per repo + timestamped handoff checkpoints, so a fresh session resumes with minimal re-reading. Also covers the two supporting pieces of global setup: the git-commit rule and phase-based model routing.

## Components

| Piece | Location | Role |
|---|---|---|
| `project-md` skill | `~/.pi/agent/skills/project-md/SKILL.md` | Create `PROJECT.md`; log ADRs with strike-through history; wire repo `AGENTS.md` auto-read on init |
| `handoff-create` skill | `~/.pi/agent/skills/handoff-create/SKILL.md` | Write a session checkpoint to `handoffs/` |
| `handoff-resume` skill | `~/.pi/agent/skills/handoff-resume/SKILL.md` | Restore context in a new chat from PROJECT.md + one checkpoint |
| Global rule | `~/.pi/agent/AGENTS.md` | Git commit discipline — kebab-case feature branches, never push; branch name = handoff lane |
| `preset` extension | `~/.pi/agent/extensions/preset.ts` + `~/.pi/agent/presets.json` | Phase profiles: plan / execute / review (model + effort + tools + instructions) |
| `handoff-effort-drop` extension | `~/.pi/agent/extensions/handoff-effort-drop.ts` | Drops thinking to lowest-supported level during handoff skills, restores after |
| Data (per repo) | `<repo>/PROJECT.md`, `<repo>/handoffs/*.md` | Committable project memory |

## Lifecycle

```
work ──────────► decision made/reversed? ─► project-md: ~~strike~~ + dated ADR entry
      │
feature done ──► commit on kebab-case branch (global rule; branch name = lane)
      │
wrap up ───────► handoff-create ─► handoffs/YYYY-MM-DD_HHMM_<lane>_<slug>.md
      │
new chat ──────► handoff-resume ─► reads PROJECT.md + 1 checkpoint ─► work continues
```

## Git commit discipline (global rule)

`~/.pi/agent/AGENTS.md` applies to every repo: after a significant, working change (never mid-task/WIP), the agent commits on a kebab-case feature branch — never directly on `main`/`master`, never `git push` (pushing is manual, user-only).

Free integration: the branch name becomes the next handoff's **lane** automatically (`handoff-create` reads `git branch --show-current`), and kebab-case names make the filename-sanitize step a no-op.

## Model routing

Phase-based model/effort split — manual `/preset` switches by design; the only automation is a deterministic drop for the handoff skills. No task classification.

| Preset | Model | Effort | Tools | Use for |
|---|---|---|---|---|
| `plan` | `cline-pass/glm-5.3` | high | read-only (`read`, `grep`, `find`, `ls`) | design, ADRs, diagnosis |
| `execute` | `cline-pass/glm-5.2` | medium | full | routine coding, handoffs |
| `review` | `cline-pass/glm-5.3` | high | full + adversarial instructions | pre-commit edge-case scrutiny |

Switch with `/preset plan|execute|review`, the `/preset` selector, Ctrl+Shift+U, or `--preset <name>` at launch. Profiles: `~/.pi/agent/presets.json`. Extension: `~/.pi/agent/extensions/preset.ts`.

**Auto effort drop** (`~/.pi/agent/extensions/handoff-effort-drop.ts`): invoking `/skill:handoff-create` or `/skill:handoff-resume` drops thinking to the lowest level the current model supports for that run, then restores the previous level when the agent settles. Lowest-supported is per-model: GLM 5.2 → `off`, GLM 5.3 → `low`, Kimi K3 → no-op (max is its only level). Only drops, never raises. `project-md` is deliberately excluded — ADR logging is judgment, not mechanics.

**Model constraints** (from the clinepass provider definitions): Kimi K3 supports *only* max effort at 2× input / 3.4× output cost vs GLM — that's why plan/review default to GLM 5.3. K3-vs-5.3 reasoning strength is untested; to try K3, change the `model` line in the `plan`/`review` presets. If GLM 5.2 execution needs frequent retries, prefer 5.3 at medium over dropping a model class.

## File formats

### PROJECT.md (repo root, ≤60 lines, fixed section names)

```markdown
# PROJECT.md

## Goal
## Architecture
## Structure
## Conventions
## ADR Log
### YYYY-MM-DD — <decision title>
```

Update rules: never delete; superseded text gets `~~strikethrough~~ → replacement (ADR <date>)`; ADR entries are dated, ≤3 lines, append-only. Sections are never renamed/reordered — checkpoints reference them as `PROJECT.md § <section>`.

### Handoff checkpoint

Filename: `handoffs/YYYY-MM-DD_HHMM_<lane>_<4-5-word-slug>.md`
- `lane` = git branch / worktree, sanitized for the filename (`/`→`-`, lowercase, ≤30 chars); raw name kept in frontmatter. Omitted entirely in non-git dirs.
- Same-minute collision → append `-2`, `-3`.

Sections (in order, **empty sections omitted entirely**): `Objective` → `Diagnosis` (only if debugging: symptom / root cause confirmed|suspected / ruled-out + why) → `Done` (bullets with `path:line` refs) → `Left` (checkboxes, carried forward from previous checkpoint + new) → `Worked` → `Didn't work` (with "don't retry unless X") → `Key refs` (PROJECT.md §, previous checkpoint).

Frontmatter: `date`, `lane`, `slug`, `status: in-progress | blocked | complete`.

## Usage

Skills auto-trigger from natural language, or force with `/skill:<name>` (requires `enableSkillCommands` in settings):

| You say / do | What runs |
|---|---|
| "start a project", "init PROJECT.md" | `project-md` init |
| "log that decision", "add an ADR", "update PROJECT.md" | `project-md` update |
| "handoff", "checkpoint", "wrap up", "continue later" | `handoff-create` |
| "resume", "pick up", "continue from the auth one" | `handoff-resume` |
| `/skill:handoff-resume feature/auth` | resume, lane-fragment filter |

## Demo: `taskflow-api`

Express + Postgres API. Day 1, branch `main`.

### 1. Init — "Start a project: REST API for team task management, Express + Postgres + Redis queue"

`project-md` writes `PROJECT.md` and appends a read-it-at-start rule to the repo's own `AGENTS.md` (creates it if missing, skips if already covered):

```markdown
# PROJECT.md

## Goal
taskflow-api — REST API for team task management. MVP: auth, projects, tasks, webhooks.

## Architecture
- Express 5, layered: routes → services → repos
- Auth via server sessions (cookie)
- Postgres via Drizzle ORM; BullMQ for async jobs

## Structure
- `src/routes/` — HTTP handlers, one file per resource
- `src/services/` — business logic
- `src/repos/` — Drizzle queries
- `tests/` — vitest integration suites

## Conventions
- pnpm; `pnpm dev` / `pnpm test`
- zod validation at route boundary

## ADR Log
```

### 2. Mid-session decision — "Sessions won't survive multi-instance deploys. Switch to JWT. Log it."

`project-md` makes a surgical edit — no rewrite:

```markdown
- ~~Auth via server sessions (cookie)~~ → Auth via JWT access (15m) + refresh (7d, rotating) (ADR 2026-09-10)
```

and appends:

```markdown
### 2026-09-10 — JWT instead of server sessions
Cookie sessions need sticky LB across instances. JWT access + rotating refresh chosen. Supersedes: cookie-session plan.
```

### 3. Wrap up — "handoff this session"

A refresh-token bug was diagnosed during the session. `handoff-create` writes `handoffs/2026-09-10_2215_main_jwt-auth-diagnosis.md`:

```markdown
---
date: 2026-09-10 22:15
lane: main
slug: jwt-auth-diagnosis
status: in-progress
---
# Handoff: JWT auth + expiry bug

## Objective
Ship JWT auth (register/login/refresh); fix refresh-expiry bug found mid-way.

## Diagnosis
- Symptom: refresh tokens rejected after ~1h despite 7d TTL
- Root cause: `expiresIn` passed in ms, jsonwebtoken expects seconds — confirmed via unit repro
- Ruled out: Redis TTL on refresh store — reproduced with store mocked

## Done
- Auth routes — `src/routes/auth.ts:12-58`
- JWT sign/verify + refresh rotation with reuse detection — `src/services/token.ts:7-52`

## Left
- [ ] Fix expiresIn units (`src/services/token.ts:18`) + regression test
- [ ] Wire authMiddleware onto /projects routes
- [ ] Rate-limit /auth/login

## Worked
- Unit repro before touching app code — isolated cause in ~10 min

## Didn't work
- Verifying with `ignoreExpiration` to "debug" — masks the bug; don't retry unless checking signature only

## Key refs
- PROJECT.md § Architecture
```

### 4. New chat — "resume"

`handoff-resume` reads exactly two files (`PROJECT.md` + that checkpoint) and replies:

```
Resumed: handoffs/2026-09-10_2215_main_jwt-auth-diagnosis.md (in-progress)
Objective: ship JWT auth; fix refresh-expiry bug.
Done: auth routes + token service + rotation.
Diagnosis (do not re-investigate): cause confirmed — expiresIn in ms not s (token.ts:18). Ruled out: Redis TTL.
Next: fix units + regression test, then authMiddleware on /projects.
Don't retry: ignoreExpiration debugging.
```

Work continues with zero re-diagnosis.

### 5. Lanes — parallel work

```
git checkout -b feature/rate-limiting   # or the agent creates it itself, per the global commit rule
... work ...  "handoff"
→ handoffs/2026-09-10_2240_feature-rate-limiting_login-throttle.md
```

New chat, "resume from feature/rate-limiting" → fragment is sanitized (`feature-rate-limiting`) and substring-matched against filenames. With multiple lanes and no fragment, resume lists lanes + latest timestamps and asks — it never guesses.

## Edge cases

| Situation | Behavior |
|---|---|
| Resume, no `PROJECT.md` | Says so, continues from checkpoints if any exist |
| `handoffs/` missing/empty | Says so, works from `PROJECT.md` alone — no error |
| ADR requested, no `PROJECT.md` | Asks whether to initialize (no silent create, no silent skip) |
| Not a git repo | Lane omitted from filename and frontmatter; lane-less checkpoints carry forward among themselves |
| Same-minute collision | `-2`, `-3` suffix |
| Multiple lanes, no fragment | Lists lanes, asks which |
| Multiple worktrees on same repo | `project-md` goes append-only (no strikethrough); git merge reconciles |

## Why it's token-efficient

- **Progressive disclosure**: only skill descriptions sit in the system prompt; full SKILL.md loads on trigger.
- **Reference, don't duplicate**: checkpoints cite `PROJECT.md §` sections; `PROJECT.md` never restates checkpoint detail.
- **Resume reads 2 files** by default, not the checkpoint history.
- **Create reads 0 files**: written from session context (plus the carry-forward peek at one previous checkpoint).
- **Hard caps**: ≤10 bullets/section, no empty-section stubs, no prose paragraphs, PROJECT.md ≤60 lines with a stable-size top and append-only log.
- **Phase routing**: strong model + high effort only where errors compound (plan/review); medium for execution; handoff mechanics auto-drop to the lowest supported thinking level.

## Ops

- **After editing any SKILL.md or AGENTS.md: restart pi** — skills and context files load at startup.
- Extensions in `~/.pi/agent/extensions/` hot-reload with `/reload`; preset profiles live in `~/.pi/agent/presets.json`.
- Skill auto-triggering is best-effort; if the model doesn't load the skill, say "use the handoff-create skill" or run `/skill:handoff-create`.
- Never install the same skill name in two locations — pi keeps the first found and shadows the rest.
- Commit `PROJECT.md` and `handoffs/` for team-visible history, or gitignore `handoffs/` if checkpoints are private.

## Treehouse (optional)

Treehouse is a local git-worktree helper — it just automates `git worktree add` with naming/cleanup. It's not required: plain `git worktree add` gives identical isolation. Nothing here changes if you use it — lane derivation already reads `git branch --show-current`, which works the same whether the worktree was created by hand or by Treehouse.
