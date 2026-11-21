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
export const THINKING = {
  perception: "low",
  reasoning: "high",
  chief: "low",
} as const;
