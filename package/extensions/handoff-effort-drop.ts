/**
 * Handoff Effort Drop
 *
 * Explicitly invoking /skill:handoff-create or /skill:handoff-resume drops the
 * thinking level to the lowest the current model supports, for that agent run
 * only; the previous level is restored when the agent settles. Handoff skills
 * are mechanical summarization — see handoff-create SKILL.md ("lowest adequate
 * effort"). This extension is the mechanism behind that clause.
 *
 * Matching is exact skill-command text only (optionally followed by args after
 * a space, e.g. "/skill:handoff-resume feature/auth"). No task classification,
 * and deliberately not project-md: ADR logging involves judgment, so it keeps
 * full effort.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
const LEVEL_ORDER: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const SKILL_COMMANDS = ["/skill:handoff-create", "/skill:handoff-resume"];

export default function handoffEffortDrop(pi: ExtensionAPI) {
	let savedLevel: ThinkingLevel | undefined;

	function isHandoffSkillCommand(text: string): boolean {
		const t = text.trim();
		return SKILL_COMMANDS.some((cmd) => t === cmd || t.startsWith(cmd + " "));
	}

	/** Lowest thinking level the current model actually supports (holes in the map are skipped). */
	function lowestSupported(ctx: ExtensionContext): ThinkingLevel | undefined {
		const map = ctx.model?.thinkingLevelMap as Record<string, string | null | undefined> | undefined;
		if (map) {
			for (const lvl of LEVEL_ORDER) {
				if (map[lvl] != null) return lvl;
			}
			return undefined; // single-level always-reasoning model (e.g. kimi-k3): no drop possible
		}
		return "minimal"; // no map exposed: fall back and let pi clamp
	}

	pi.on("input", async (event, ctx) => {
		if (savedLevel !== undefined || !isHandoffSkillCommand(event.text)) return { action: "continue" as const };
		const current = pi.getThinkingLevel() as ThinkingLevel;
		const target = lowestSupported(ctx);
		if (!target || LEVEL_ORDER.indexOf(target) >= LEVEL_ORDER.indexOf(current)) {
			return { action: "continue" as const }; // never raise, only drop
		}
		savedLevel = current;
		pi.setThinkingLevel(target);
		if (ctx.hasUI) ctx.ui.notify(`handoff skill: thinking ${current} → ${target}, restores after`, "info");
		return { action: "continue" as const };
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (savedLevel === undefined) return;
		const restore = savedLevel;
		savedLevel = undefined;
		pi.setThinkingLevel(restore);
		if (ctx.hasUI) ctx.ui.notify(`handoff skill done: thinking restored to ${restore}`, "info");
	});
}
