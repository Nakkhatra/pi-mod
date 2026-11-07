/**

 * Tencent TokenHub provider — exposes GLM 5.2 through Tencent's OpenAI-compatible

 * TokenHub gateway for use as a pi coding-agent model.

 *

 * There are TWO TokenHub endpoints with separate API keys (per the Token Plan

 * Personal Edition docs, https://www.tencentcloud.com/document/product/1300/81315):

 *

 *   - Pay-as-you-go: https://tokenhub-intl.tencentcloudmaas.com/v1

 *     (old `sk-LLQU…`-style keys; OpenAI Chat Completions)

 *   - Token Plan:     https://tokenhub-intl.tencentcloudmaas.com/plan/v3

 *     (dedicated `sk-tp-…` key generated on the Token Plan page; the ONLY key

 *      usable with a plan — pay-as-you-go keys do not work on /plan/v3).

 *

 * This provider defaults to the Token Plan endpoint. Override either via the

 * `TOKENHUB_BASE_URL` env var (to switch back to pay-as-you-go `/v1`) or via

 * `/login tokenhub` to store a different key in `~/.pi/agent/auth.json`.

 *

 * Auth:  `Authorization: Bearer <key>`, resolved in priority order:

 *          1. stored credential from `~/.pi/agent/auth.json` (set via `/login tokenhub`)

 *          2. `TOKENHUB_API_KEY` env var

 *

 * Source of truth for the per-model call shape: telco-bot

 * `src/telcobot/llm/models.yaml` and `plans/rev2-decisions-and-stage0-go-ahead.md` §2.2.

 * Key points for `glm-5.2`:

 *

 *   - `thinking.type` is `enabled` / `disabled` (deep reasoning). TokenHub documents

 *     `enabled` as the default for glm-5.2.

 *   - Do **not** send `reasoning_effort` — TokenHub's reasoning-effort support table

 *     does not list GLM-5.2. Sending it surfaces as a non-retriable HTTP 400.

 *   - Output-token parameter is `max_tokens` (not `max_completion_tokens`).

 *   - TokenHub exposes GLM via the OpenAI-compatible protocol and supports tool

 *     calling; reasoning is returned in `reasoning_content`.

 *

 * `glm-5.3` differs from glm-5.2: it is REASONING-ONLY. TokenHub rejects

 * `thinking.type=disabled` with HTTP 400 ("该模型始终思考，不支持关闭思考；请使用

 * low、high 或 max") and supports `reasoning_effort` low/high/max. It therefore

 * registers a thinkingLevelMap with off/minimal/xhigh hidden and

 * low/medium/high/max mapped, plus `supportsReasoningEffort: true`. With no

 * effort selected (e.g. ask-side's isolated calls), the deepseek format omits

 * the thinking param entirely and the model runs at its default (always on).

 *

 * How pi's `openai-completions` compat maps to that:

 *   - `thinkingFormat: "deepseek"` emits exactly `thinking: { type: "enabled" }`

 *     (when a non-off thinking level is active) or `{ type: "disabled" }` (off),

 *     with **no** `clear_thinking` and **no** `reasoning_effort` as long as

 *     `supportsReasoningEffort: false` and no `thinkingLevelMap` is set — a

 *     byte-for-byte match with the telco-bot GLM 5.2 request body.

 *   - GLM 5.2 thinking is binary (on/off, no effort control), so no

 *     `thinkingLevelMap` is registered: every non-off pi thinking level enables

 *     deep reasoning, and "off" disables it.

 *   - `zaiToolStream` is left at its default (false): TokenHub is a generic

 *     OpenAI-compatible gateway, not the Z.AI native endpoint, so the Z.AI-specific

 *     `tool_stream: true` flag is not sent. Standard OpenAI tool-call streaming

 *     deltas are parsed fine.

 *

 * Network note (corporate SWG proxy): live calls fail with a non-API HTML

 * response (HTTP 302 agent-auth page) if the AlphaRed SWG proxy intercepts

 * HTTPS. The TokenHub domain is whitelisted for proxy bypass in this env; if a

 * `non_api_response`-style failure returns, re-auth the SWG agent session in a

 * browser (see telco-bot README.md) and re-run.

 */

import {

  createProvider,

  openAICompletionsApi,

} from "@earendil-works/pi-ai";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";



// Token Plan endpoint (sk-tp-… keys). Override with TOKENHUB_BASE_URL to use

// the pay-as-you-go endpoint https://tokenhub-intl.tencentcloudmaas.com/v1 instead.

const TOKENHUB_BASE_URL =

  process.env.TOKENHUB_BASE_URL?.replace(/\/+$/, "") ??

  "https://tokenhub-intl.tencentcloudmaas.com/plan/v3";



// Phrases TokenHub/GLM may use for context-overflow. Scoped strictly to the

// tokenhub provider so unrelated errors (rate limit, throttling) are never

// rewritten into auto-compaction triggers.

const OVERFLOW_PATTERN =

  /context\s*length|maximum\s+context|prompt\s+is\s+too\s+long|输入过长|超出上下文/i;



export default function (pi: ExtensionAPI) {

  pi.registerProvider(

    createProvider({

      id: "tokenhub",

      name: "Tencent TokenHub",

      baseUrl: TOKENHUB_BASE_URL,

      api: openAICompletionsApi(),

      auth: {

        apiKey: {

          name: "Tencent TokenHub API key",

          async login(interaction) {

            const key = await interaction.prompt({

              type: "secret",

              message: "Tencent TokenHub API key (sk-tp-… for Token Plan, sk-… for pay-as-you-go):",

            });

            return { type: "api_key", key };

          },

          async resolve({ credential }) {

            // Stored credential wins; fall back to the env var (ambient).

            const key = credential?.key || process.env.TOKENHUB_API_KEY;

            if (!key) return undefined;

            return {

              auth: { apiKey: key },

              source: credential?.key

                ? "stored API key"

                : "TOKENHUB_API_KEY",

            };

          },

        },

      },

      models: [

        {

          id: "glm-5.2",

          name: "GLM 5.2 (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 1_000_000,

          maxTokens: 131_072,

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: false,

            // TokenHub's /plan/v3 gateway does not always emit `finish_reason`

            // in the terminal SSE chunk, which makes pi-ai's openai-completions

            // parser throw "Stream ended without finish_reason". Tell pi to

            // infer `stop` (or `toolUse` when a tool call is buffered) instead

            // of throwing when the stream ends without one.

            supportsFinishReason: false,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

        {

          id: "glm-5.3",

          name: "GLM 5.3 (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          // Reasoning-only: TokenHub rejects thinking.type=disabled (HTTP 400

          // "该模型始终思考，不支持关闭思考；请使用 low、high 或 max") and supports

          // reasoning_effort low/high/max. off/minimal/xhigh are hidden (null)

          // so pi never sends a disabled/unsupported value; with no effort

          // selected, the deepseek format omits the thinking param entirely

          // (verified: plan endpoint returns 200 for that shape).

          thinkingLevelMap: {

            off: null,

            minimal: null,

            low: "low",

            medium: "high",

            high: "high",

            xhigh: null,

            max: "max",

          },

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 1_000_000,

          maxTokens: 131_072,

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: true,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

        {

          // Kimi K3 (Moonshot) via TokenHub Token Plan. Verified against the

          // /plan/v3 OpenAI-compatible gateway with the Personal Max plan key:

          //   - thinking.type=disabled  -> 200, reasoning OFF (plain content)

          //   - reasoning_effort low/medium/high/max -> 200, reasoning ON

          //   - thinking{enabled}+reasoning_effort (the exact body pi emits for a

          //     non-off level) -> 200 for low/high/max

          // Unlike glm-5.3, Kimi K3 lets you turn reasoning off, so `off` is

          // shown (deepseek format sends thinking:{type:disabled}) and the

          // effort levels map 1:1. `minimal`/`xhigh` are pi-internal values with

          // no TokenHub equivalent (hidden) so pi never sends them raw.

          // Context window: verified 1M tokens — TokenHub accepted a

          // 1,000,020-token prompt (usage.prompt_tokens=1000113).

          id: "kimi-k3",

          name: "Kimi K3 (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          thinkingLevelMap: {

            off: "off",

            minimal: null,

            low: "low",

            medium: "medium",

            high: "high",

            xhigh: null,

            max: "max",

          },

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 1_000_000,

          maxTokens: 131_072,

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: true,

            supportsFinishReason: false,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

        {

          // Kimi K2.6 — same verified reasoning behavior as kimi-k3 (disabled

          // works; reasoning_effort low/medium/high/max all 200), but a SMALLER

          // context window. Context window: verified 256K (262144) — a

          // 1,000,000-token prompt is rejected (MaaS 400001), 262100 OK,

          // 262130 rejected, so the hard cap is exactly 262144.

          id: "kimi-k2.6",

          name: "Kimi K2.6 (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          thinkingLevelMap: {

            off: "off",

            minimal: null,

            low: "low",

            medium: "medium",

            high: "high",

            xhigh: null,

            max: "max",

          },

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 262_144,

          maxTokens: 131_072,

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: true,

            supportsFinishReason: false,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

        {

          // GLM-5.3-Flash — reasoning-only like glm-5.3. Verified:

          //   - thinking.type=disabled -> HTTP 400 (rejected by MaaS component;

          //     reasoning cannot be turned off)

          //   - reasoning_effort low/high/max -> 200; medium -> 400

          //   - thinking{enabled}+reasoning_effort (pi's body) -> 200 low/high/max

          // Mirrors the glm-5.3 registration: off/minimal/xhigh hidden, medium

          // remapped to high (medium is unsupported), low/high/max mapped.

          // Full-capacity variant. Real TokenHub hard cap verified at 1M

          // (accepted a 1,000,020-token prompt; usage.prompt_tokens=1000020).

          // contextWindow = the real cap, so pi retains maximum history and

          // only compacts near 1M. Per-request token usage grows with session

          // length; for a token-saving variant with earlier compaction, see

          // glm-5.3-flash-200k below.

          id: "glm-5.3-flash",

          name: "GLM 5.3 Flash (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          thinkingLevelMap: {

            off: null,

            minimal: null,

            low: "low",

            medium: "high",

            high: "high",

            xhigh: null,

            max: "max",

          },

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 1_000_000,

          maxTokens: 131_072,

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: true,

            supportsFinishReason: false,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

        {

          // Cost-saving variant of glm-5.3-flash: same model, contextWindow

          // capped at 200K so pi auto-compacts earlier (shouldCompact trips

          // at contextWindow - reserveTokens, default reserve 16384), keeping

          // per-request token usage and plan-token spend bounded. The real

          // TokenHub cap is 1M; this is a soft compaction lever, not a model

          // limit. TokenHub only knows the model id "glm-5.3-flash", so

          // samplingParams.model overrides the request model field (which pi

          // initializes from this entry's id) back to the real API name.

          // Verified end-to-end: pi sends model:"glm-5.3-flash", TokenHub 200.

          id: "glm-5.3-flash-200k",

          name: "GLM 5.3 Flash 200K (TokenHub)",

          provider: "tokenhub",

          api: "openai-completions",

          baseUrl: TOKENHUB_BASE_URL,

          reasoning: true,

          thinkingLevelMap: {

            off: null,

            minimal: null,

            low: "low",

            medium: "high",

            high: "high",

            xhigh: null,

            max: "max",

          },

          input: ["text"],

          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },

          contextWindow: 200_000,

          maxTokens: 131_072,

          samplingParams: { model: "glm-5.3-flash" },

          compat: {

            supportsStore: false,

            supportsDeveloperRole: false,

            supportsReasoningEffort: true,

            supportsFinishReason: false,

            maxTokensField: "max_tokens",

            thinkingFormat: "deepseek",

          },

        },

      ],

    }),

  );



  // Normalize TokenHub/GLM context-overflow errors so pi can recover via

  // auto-compaction + retry. The generic `context_length_exceeded` prefix is

  // the safest fallback pi recognizes.

  pi.on("message_end", (event, ctx) => {

    const message = event.message;

    if (message.role !== "assistant") return;

    if (message.stopReason !== "error") return;

    if (message.provider !== "tokenhub" && ctx.model?.provider !== "tokenhub")

      return;



    const errorMessage = message.errorMessage ?? "";

    if (errorMessage.includes("context_length_exceeded")) return; // idempotent

    if (!OVERFLOW_PATTERN.test(errorMessage)) return;



    return {

      message: {

        ...message,

        errorMessage: `context_length_exceeded: ${errorMessage}`,

      },

    };

  });

}
