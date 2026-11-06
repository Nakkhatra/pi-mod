/**
 * steer-now.ts
 *
 * Two commands for course-correcting the agent while it works:
 *
 *   /steer <message>   SAFE — no interruption. Queues the message as native
 *                      steering; the running tool calls keep going and the
 *                      message is delivered at the next LLM-call boundary
 *                      (the moment the current tool batch finishes). Use
 *                      this when you might be wrong and the in-flight work
 *                      is still worth keeping.
 *
 *   /steer! <message>  INTERRUPT — aborts the current run IMMEDIATELY, then
 *                      re-sends the message automatically once the run
 *                      settles (fuses Esc + re-submit into one action).
 *                      Nothing is lost: the partial assistant message and
 *                      "Operation aborted" tool results stay committed to
 *                      context, so the model sees exactly where it was
 *                      interrupted, followed by your message. Use this when
 *                      the agent is clearly on the wrong track.
 *
 * Note on timing: without aborting, the earliest a message can reach the
 * model is the end of the current tool batch — the model is not consulted
 * while a tool call is executing, so there is no earlier injection point.
 * If the in-flight work itself must stop, use /steer! (or Esc).
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

export default function steerNowExtension(pi: ExtensionAPI) {
	/** Message captured by /steer!, delivered after the aborted run settles. */
	let pendingInterrupt: string | null = null;

	async function handle(text: string, ctx: ExtensionCommandContext, interrupt: boolean) {
		if (ctx.isIdle()) {
			// Nothing running; both variants behave like a normal prompt.
			await pi.sendUserMessage(text);
			return;
		}

		if (interrupt) {
			// /steer! — remember the message, then kill the current run.
			// ctx.abort() routes through pi's abort handler: partial context
			// (assistant prefix, aborted tool results) stays committed to the
			// session; natively queued messages are restored to the editor.
			pendingInterrupt = text;
			ctx.ui.notify("Steer: interrupting current run…", "warning");
			ctx.abort();
		} else {
			// /steer — non-destructive native steering queue.
			await pi.sendUserMessage(text, { deliverAs: "steer" });
			ctx.ui.notify(
				"Steer: queued — delivered after the current tool call(s) finish (nothing interrupted)",
				"info",
			);
		}
	}

	pi.registerCommand("steer", {
		description:
			"Queue a message without interrupting: delivered after the current tool call(s) finish (usage: /steer <message>)",
		handler: async (args, ctx) => {
			const text = args.trim();
			if (!text) {
				ctx.ui.notify(
					"Usage: /steer <message> (queue, no interruption) or /steer! <message> (interrupt now)",
					"info",
				);
				return;
			}
			await handle(text, ctx, false);
		},
	});

	pi.registerCommand("steer!", {
		description:
			"Interrupt the running turn NOW and send your message immediately (usage: /steer! <message>)",
		handler: async (args, ctx) => {
			const text = args.trim();
			if (!text) {
				ctx.ui.notify(
					"Usage: /steer! <message> (interrupt now) or /steer <message> (queue, no interruption)",
					"info",
				);
				return;
			}
			await handle(text, ctx, true);
		},
	});

	// An aborted run skips retries/compaction and goes agent_end -> agent_settled,
	// so agent_settled is the first point where the session is idle again.
	pi.on("agent_settled", async (event, ctx) => {
		const text = pendingInterrupt;
		if (!text) return;
		pendingInterrupt = null;

		if (ctx.isIdle()) {
			// Normal case: run aborted by /steer!, start the course-corrected turn.
			await pi.sendUserMessage(text);
		} else {
			// Defensive fallback: a new run somehow started; queue as steering.
			await pi.sendUserMessage(text, { deliverAs: "steer" });
		}
	});
}
