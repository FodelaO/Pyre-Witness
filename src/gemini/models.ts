/**
 * Verified Gemini model identifiers (hackathon builder guide, Nov 2026). Import from here;
 * never hard-code a model string elsewhere.
 *
 * Each Gemini 4 model has ONE clear job in Pyre Witness:
 *   - Hydrogen  = fast perception            (Scout)
 *   - Carbon    = deep reasoning + revision   (Architect)
 *   - Neon      = briefing + daily threat watch (Chief)
 *   - Decision 1 = calibrated gating / scoring (Decisions API, v1beta, zero output tokens)
 */
export const MODEL_IDS = {
  perception: "gemini-4-hydrogen",
  reasoning: "gemini-4-carbon",
  chief: "gemini-4-neon",
  decisions: "gemini-decision-1",
  live: "gemini-3.8-live",
  tts: "gemini-3.8-flash-tts",
  image: "gemini-nano-banana-2.1",
  managedAgent: "antigravity-preview-09-2026",
  deepResearch: "deep-research-preview-04-2026",
} as const;

export type ModelRole = keyof typeof MODEL_IDS;

/**
 * Thinking levels. Carbon supports low | medium | high (default medium).
 * Neon and Hydrogen support low | medium | high | xhigh (default high) and REJECT "minimal".
 * Never send temperature / top_p / top_k or thinking budgets to Gemini 4 models.
 */
type CarbonThinking = "low" | "medium" | "high";

/**
 * Measured live on 2026-11-21: Carbon at "high" exceeded 120 s per capture and "medium" took about
 * 117 s; after the prompt and schema were compacted, "low" completes a capture in about 25-35 s and
 * agreed with "medium" on room and Purdue level for 5 of 6 test devices and on every rules-engine
 * verdict (docs/log/pipeline-speed.md). Default is "low" for live captures; override per process
 * with PW_REASONING_THINKING=low|medium|high (server only).
 */
const reasoningOverride = process.env.PW_REASONING_THINKING as CarbonThinking | undefined;

export const THINKING: { perception: "low"; reasoning: CarbonThinking; chief: "low" } = {
  perception: "low",
  reasoning: reasoningOverride ?? "low",
  chief: "low",
};
