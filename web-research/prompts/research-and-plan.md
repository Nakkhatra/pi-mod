---
description: Researcher searches the web for latest/SOTA first, then planner produces the implementation plan (no implementation)
---
Use the subagent tool with the chain parameter to execute this workflow:

1. First, use the "researcher" agent to search the web (DuckDuckGo, Reddit
   via site: queries, Stack Overflow, Hacker News, GitHub, and arXiv papers
   if relevant) for the latest and state-of-the-art approaches to: $@
2. Then, use the "planner" agent to create an implementation plan for "$@"
   using the research findings (pass them via the {previous} placeholder)

Execute this as a chain, passing output between steps via {previous}.
Do NOT implement — just research and return the plan.
