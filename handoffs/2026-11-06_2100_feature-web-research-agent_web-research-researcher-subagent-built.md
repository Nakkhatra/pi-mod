---
date: 2026-11-06 21:00
lane: feature-web-research-agent
slug: web-research-researcher-subagent-built
status: complete
---
# Handoff: researcher subagent + GitHub main branch

## Objective
Connect repo to GitHub remote and push; build a web-research subagent that runs before planning for latest/SOTA tech.

## Done
- Added remote `origin` = git@github.com:Nakkhatra/pi-mod.git; pushed all branches; created `main` from `pi-mod-archive`
- Installed pi's bundled subagent extension: symlinks at `~/.pi/agent/extensions/subagent/{index.ts,agents.ts}`
- Created `researcher` subagent: `web-research/agents/researcher.md` → copied to `~/.pi/agent/agents/researcher.md` (tools: bash; curl recipes for DDG Lite, HN Algolia, StackExchange, GitHub API, arXiv)
- Created `/research-and-plan` chain prompt: `web-research/prompts/research-and-plan.md` → `~/.pi/agent/prompts/research-and-plan.md` (researcher → planner)
- PROJECT.md updated (structure, conventions, 2 ADR entries); committed `94c773b`, pushed branch

## Worked
- Verified every search endpoint with live curl BEFORE writing the agent prompt — caught 3 failures up front
- Smoke test (bg PID 87349): `pi -p "Use the researcher subagent..."` returned live GitHub star counts — full chain works

## Didn't work
- Reddit `.json` API (both www and old.reddit) — 302/bot-block for script UAs — use DDG `site:reddit.com` queries instead
- Google News RSS, arXiv over plain http — empty/blocked; arXiv works over https
- StackExchange API without `--compressed` — gzip garbage; always pass the flag

## Left
- [ ] Optional: rerun smoke test after next pi upgrade (extension is symlinked to installed version — upgrades could change its API)

## Key refs
- PROJECT.md § ADR Log (2026-11-06 web-research + remote entries)
- handoffs/2026-11-06_2052_feature-steer-now_steer-now-reversed-backgrounding-rule.md
