/**
 * session-catch-up.ts
 *
 * Drift awareness for resumed sessions. When you resume an older session,
 * newer sessions / commits / handoffs may have changed things that affect
 * the old feature — this extension makes the session *know* what changed.
 *
 * Two surfaces:
 *  - (A) Automatic notice on `session_start` when the session is a resume of
 *    a pre-existing session (in-session /resume reports reason "resume"; CLI
 *    pi -c/-r/--session report "startup" with an old session header) — one
 *    `ctx.ui.notify` line summarizing drift since the session's last
 *    activity. Stays completely silent when there is no drift, and does
 *    nothing on reload / new / fork or fresh sessions.
 *  - (B) `/catch-up` command — re-gathers drift (plus git --stat and the
 *    newest handoff's Done/Left sections) and injects a structured brief
 *    into the conversation via `pi.sendMessage(..., { triggerTurn: true })`
 *    so the model reads it before further work.
 *
 * Mechanical data gathering only — no LLM calls, no task classification.
 * Handoff-per-session discipline (Option C) remains the fallback habit.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Max newer-session names shown in the one-line notice. */
const NOTICE_MAX_SESSION_NAMES = 3;

/** Max commits listed in the /catch-up brief. */
const BRIEF_MAX_COMMITS = 20;

/** Max changed-file paths listed in the /catch-up brief. */
const BRIEF_MAX_FILES = 30;

/** Max chars of handoff Done/Left content included in the brief. */
const BRIEF_MAX_HANDOFF_CHARS = 2000;

/** Timeout for git subprocesses. */
const GIT_TIMEOUT_MS = 10_000;

/** Custom message type used for the injected catch-up brief. */
const BRIEF_CUSTOM_TYPE = "session-catch-up";

/** CLI resume paths (pi -c/-r/--session) report reason "startup", same as a
 *  brand-new session. A session whose header is older than this is treated
 *  as a resumed session; a fresh one is younger and stays silent. */
const STARTUP_RESUME_MIN_AGE_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Drift {
	/** Epoch ms of the resumed session's last activity. */
	endedAtMs: number;
	/** ISO timestamp of the resumed session's last activity, if known. */
	endedAtIso: string | undefined;
	/** Newer sibling sessions: display names (session_info name or filename). */
	newerSessions: string[];
	/** New commits since end (git log --oneline lines). */
	commits: string[];
	/** Distinct files touched by those commits. */
	filesChanged: string[];
	/** Filename of the newest handoff modified after session end. */
	newestHandoff: string | undefined;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable by eye)
// ---------------------------------------------------------------------------

/** Epoch ms of the last session entry's timestamp, or NaN if unavailable. */
export function sessionEndMs(entries: { timestamp?: string }[]): number {
	for (let i = entries.length - 1; i >= 0; i--) {
		const ts = entries[i]?.timestamp;
		if (ts) {
			const ms = Date.parse(ts);
			if (!Number.isNaN(ms)) return ms;
		}
	}
	return Number.NaN;
}

/** Format an epoch-ms as a compact local timestamp: YYYY-MM-DD HH:MM. */
export function formatLocal(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
		`${pad(d.getHours())}:${pad(d.getMinutes())}`
	);
}

/** Human-readable age ("3h ago", "2d ago", "just now"). */
export function formatAge(ms: number, now: number = Date.now()): string {
	const s = Math.max(0, Math.floor((now - ms) / 1000));
	if (s < 90) return "just now";
	const m = Math.floor(s / 60);
	if (m < 90) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 36) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}

/**
 * Read a session .jsonl file and return its latest session_info display
 * name ("NN - label"), falling back to the filename's timestamp prefix.
 */
export function readSessionDisplayName(file: string): string {
	try {
		const raw = fs.readFileSync(file, "utf8");
		const lines = raw.split("\n");
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (!line.startsWith("{")) continue;
			try {
				const obj = JSON.parse(line) as { type?: string; name?: unknown };
				if (obj.type === "session_info" && typeof obj.name === "string" && obj.name) {
					return obj.name;
				}
			} catch {
				// not JSON on this line — keep scanning
			}
		}
	} catch {
		// unreadable — fall through to filename
	}
	const base = path.basename(file);
	const m = base.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
	return m ? `session ${m[1]}` : base;
}

/** Extract `## Done` and `## Left` section bodies (plus YAML frontmatter). */
export function extractHandoffSummary(content: string): string {
	const lines = content.split("\n");
	const out: string[] = [];

	// YAML frontmatter (between leading --- fences)
	if (lines[0]?.trim() === "---") {
		const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
		if (end > 0) out.push(lines.slice(0, end + 1).join("\n"));
	}

	for (const section of ["## Done", "## Left"]) {
		const start = lines.findIndex((l) => l.trim() === section);
		if (start === -1) continue;
		let end = lines.length;
		for (let i = start + 1; i < lines.length; i++) {
			if (/^##\s/.test(lines[i].trim())) {
				end = i;
				break;
			}
		}
		out.push(lines.slice(start, end).join("\n").trimEnd());
	}

	let summary = out.join("\n\n").trim();
	if (summary.length > BRIEF_MAX_HANDOFF_CHARS) {
		summary = summary.slice(0, BRIEF_MAX_HANDOFF_CHARS - 1).trimEnd() + "…";
	}
	return summary;
}

/** Build the one-line stale-session notice. Returns undefined if no drift. */
export function buildNotice(drift: Drift): string | undefined {
	const parts: string[] = [];
	if (drift.newerSessions.length > 0) {
		const names = drift.newerSessions.slice(0, NOTICE_MAX_SESSION_NAMES).join(", ");
		const more =
			drift.newerSessions.length > NOTICE_MAX_SESSION_NAMES
				? `, +${drift.newerSessions.length - NOTICE_MAX_SESSION_NAMES} more`
				: "";
		parts.push(`${drift.newerSessions.length} newer session${drift.newerSessions.length === 1 ? "" : "s"} (${names}${more})`);
	}
	if (drift.commits.length > 0) {
		parts.push(`${drift.commits.length} commit${drift.commits.length === 1 ? "" : "s"} (${drift.filesChanged.length} file${drift.filesChanged.length === 1 ? "" : "s"})`);
	}
	if (drift.newestHandoff) {
		parts.push("1 newer handoff");
	}
	if (parts.length === 0) return undefined;
	return `⚠ Stale session (ended ${formatLocal(drift.endedAtMs)}): ${parts.join(", ")}. Run /catch-up for a brief.`;
}

// ---------------------------------------------------------------------------
// Drift gathering
// ---------------------------------------------------------------------------

interface GatherCtx {
	cwd: string;
	sessionDir: string | undefined;
	sessionFile: string | undefined;
}

async function runGit(
	pi: ExtensionAPI,
	args: string[],
	cwd: string,
): Promise<{ stdout: string; ok: boolean }> {
	try {
		const res = await pi.exec("git", args, { cwd, timeout: GIT_TIMEOUT_MS });
		return { stdout: res.stdout ?? "", ok: res.code === 0 };
	} catch {
		return { stdout: "", ok: false };
	}
}

async function isGitRepo(pi: ExtensionAPI, cwd: string): Promise<boolean> {
	const res = await runGit(pi, ["rev-parse", "--is-inside-work-tree"], cwd);
	return res.ok && res.stdout.trim() === "true";
}

/** Newer sibling sessions in this project's session dir (excludes the current file). */
export function collectNewerSessions(
	sessionDir: string | undefined,
	sessionFile: string | undefined,
	sinceMs: number,
): string[] {
	if (!sessionDir) return [];
	let names: string[];
	try {
		names = fs.readdirSync(sessionDir).filter((n) => n.endsWith(".jsonl"));
	} catch {
		return [];
	}
	const currentBase = sessionFile ? path.basename(sessionFile) : undefined;
	const newer: { file: string; mtime: number }[] = [];
	for (const name of names) {
		if (name === currentBase) continue;
		const file = path.join(sessionDir, name);
		try {
			const mtime = fs.statSync(file).mtimeMs;
			if (mtime > sinceMs) newer.push({ file, mtime });
		} catch {
			// stat failed — skip
		}
	}
	newer.sort((a, b) => a.mtime - b.mtime);
	return newer.map((n) => readSessionDisplayName(n.file));
}

/** Newest file in <cwd>/handoffs/ modified after sinceMs, if any. */
export function collectNewestHandoff(cwd: string, sinceMs: number): string | undefined {
	const dir = path.join(cwd, "handoffs");
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return undefined;
	}
	let newest: { name: string; mtime: number } | undefined;
	for (const e of entries) {
		if (!e.isFile()) continue;
		try {
			const mtime = fs.statSync(path.join(dir, e.name)).mtimeMs;
			if (mtime > sinceMs && (!newest || mtime > newest.mtime)) {
				newest = { name: e.name, mtime };
			}
		} catch {
			// stat failed — skip
		}
	}
	return newest?.name;
}

/**
 * Gather all drift since `sinceMs`. Never throws: individual sources
 * degrade silently (non-git cwd → no git data, no handoffs dir → none).
 */
export async function collectDrift(
	pi: ExtensionAPI,
	ctx: GatherCtx,
	sinceMs: number,
	endedAtIso: string | undefined,
): Promise<Drift> {
	const sinceIso = new Date(sinceMs).toISOString();

	const drift: Drift = {
		endedAtMs: sinceMs,
		endedAtIso,
		newerSessions: collectNewerSessions(ctx.sessionDir, ctx.sessionFile, sinceMs),
		commits: [],
		filesChanged: [],
		newestHandoff: collectNewestHandoff(ctx.cwd, sinceMs),
	};

	if (await isGitRepo(pi, ctx.cwd)) {
		const log = await runGit(
			pi,
			["log", "--oneline", "--no-color", `--since=${sinceIso}`],
			ctx.cwd,
		);
		if (log.ok) {
			drift.commits = log.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
		}
		const files = await runGit(
			pi,
			["log", "--name-only", "--pretty=format:", "--no-color", `--since=${sinceIso}`],
			ctx.cwd,
		);
		if (files.ok) {
			drift.filesChanged = [
				...new Set(files.stdout.split("\n").map((l) => l.trim()).filter(Boolean)),
			].sort();
		}
	}

	return drift;
}

/** Build the multi-section /catch-up brief. Returns undefined if no drift. */
export async function buildBrief(
	pi: ExtensionAPI,
	ctx: GatherCtx,
	drift: Drift,
): Promise<string | undefined> {
	if (
		drift.newerSessions.length === 0 &&
		drift.commits.length === 0 &&
		!drift.newestHandoff
	) {
		return undefined;
	}

	const sections: string[] = [];
	sections.push(
		`# Session catch-up brief`,
		``,
		`This session's last activity: ${formatLocal(drift.endedAtMs)} (${formatAge(drift.endedAtMs)}).`,
		`Changes made after it ended:`,
	);

	if (drift.newerSessions.length > 0) {
		sections.push(
			``,
			`## Newer sessions in this project`,
			...drift.newerSessions.map((s) => `- ${s}`),
		);
	}

	if (drift.commits.length > 0) {
		sections.push(``, `## Commits since then (${drift.commits.length})`);
		sections.push(...drift.commits.slice(0, BRIEF_MAX_COMMITS).map((c) => `- ${c}`));
		if (drift.commits.length > BRIEF_MAX_COMMITS) {
			sections.push(`- … and ${drift.commits.length - BRIEF_MAX_COMMITS} more`);
		}
		// Per-commit touched files
		const stat = await runGit(
			pi,
			["log", "--stat", "--oneline", "--no-color", `--since=${new Date(drift.endedAtMs).toISOString()}`],
			ctx.cwd,
		);
		if (stat.ok && stat.stdout.trim()) {
			let statOut = stat.stdout.trim();
			if (statOut.length > 4000) statOut = statOut.slice(0, 3999) + "…";
			sections.push(``, `### Commit details (--stat)`, "```", statOut, "```");
		}
		if (drift.filesChanged.length > 0) {
			sections.push(``, `### Files touched (${drift.filesChanged.length})`);
			sections.push(
				...drift.filesChanged.slice(0, BRIEF_MAX_FILES).map((f) => `- ${f}`),
			);
			if (drift.filesChanged.length > BRIEF_MAX_FILES) {
				sections.push(`- … and ${drift.filesChanged.length - BRIEF_MAX_FILES} more`);
			}
		}
	}

	if (drift.newestHandoff) {
		sections.push(
			``,
			`## Newest handoff: handoffs/${drift.newestHandoff}`,
		);
		try {
			const content = fs.readFileSync(path.join(ctx.cwd, "handoffs", drift.newestHandoff), "utf8");
			const summary = extractHandoffSummary(content);
			if (summary) sections.push(summary);
		} catch {
			sections.push(`(unreadable)`);
		}
	}

	sections.push(
		``,
		`---`,
		`Treat the above as changes your session predates; re-verify affected assumptions before editing.`,
	);

	return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	/** Decide whether this session_start is a resume of a pre-existing
	 *  session. In-session switching (/resume) reports reason "resume";
	 *  CLI resumption (pi -c/-r/--session) reports "startup" — distinguish
	 *  it from a brand-new session by the session header's age. */
	function isResumedSession(
		event: { reason: string },
		entries: { type?: string; timestamp?: string }[],
	): boolean {
		if (event.reason === "resume") return true;
		if (event.reason !== "startup") return false; // ignore reload/new/fork
		const first = entries[0];
		if (!first?.timestamp) return false;
		const createdMs = Date.parse(first.timestamp);
		if (Number.isNaN(createdMs)) return false;
		return Date.now() - createdMs > STARTUP_RESUME_MIN_AGE_MS;
	}

	/** Gather drift for the currently-bound session. */
	async function gather(
		ctx: GatherCtx & { sessionManager: { getEntries(): { timestamp?: string }[] } },
	): Promise<Drift | undefined> {
		const entries = ctx.sessionManager.getEntries();
		const endMs = sessionEndMs(entries);
		if (Number.isNaN(endMs)) return undefined;
		const endedAtIso = [...entries].reverse().find((e) => e.timestamp)?.timestamp;
		return collectDrift(pi, ctx, endMs, endedAtIso);
	}

	// --- A. Automatic drift notice on resume --------------------------------

	pi.on("session_start", async (event, ctx) => {
		try {
			if (!isResumedSession(event, ctx.sessionManager.getEntries())) return;
			const sessionDir = ctx.sessionManager.getSessionDir();
			const drift = await gather({
				cwd: ctx.cwd,
				sessionDir,
				sessionFile: ctx.sessionManager.getSessionFile(),
				sessionManager: ctx.sessionManager,
			});
			if (!drift) return;
			const notice = buildNotice(drift);
			if (notice && ctx.hasUI) {
				ctx.ui.notify(notice, "warn");
			}
		} catch {
			// Never break session startup over a notice.
		}
	});

	// --- B. /catch-up command ----------------------------------------------

	pi.registerCommand("catch-up", {
		description:
			"Inject a drift brief (newer sessions, commits, handoffs since this session ended) into context",
		handler: async (_args, ctx) => {
			try {
				const drift = await gather({
					cwd: ctx.cwd,
					sessionDir: ctx.sessionManager.getSessionDir(),
					sessionFile: ctx.sessionManager.getSessionFile(),
					sessionManager: ctx.sessionManager,
				});
				if (!drift) {
					ctx.ui.notify("No session history to compare against.", "warn");
					return;
				}
				const brief = await buildBrief(pi, { cwd: ctx.cwd, sessionDir: undefined, sessionFile: undefined }, drift);
				if (!brief) {
					ctx.ui.notify("No drift — nothing newer found since this session ended.", "info");
					return;
				}
				pi.sendMessage(
					{ customType: BRIEF_CUSTOM_TYPE, content: brief, display: true },
					{ triggerTurn: true },
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`catch-up failed: ${msg}`, "error");
			}
		},
	});
}
