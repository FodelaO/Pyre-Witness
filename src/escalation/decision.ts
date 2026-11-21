/** Shared wire format for an advisory decision and the responder's selected action. */
import { z } from "zod";
import { MODEL_IDS } from "@/gemini/models";

export const ACTIONS = ["isolate asset", "move asset", "add protection", "accept risk"] as const;
export const actionSchema = z.enum(ACTIONS);
export type AlertAction = z.infer<typeof actionSchema>;

export const decisionAnswer = z.object({ choice: actionSchema, confidence: z.number().min(0).max(1) });
export const decisionSchema = decisionAnswer.extend({ model: z.literal(MODEL_IDS.decisions) });
export type AlertDecision = z.infer<typeof decisionSchema>;
export const responseSchema = z.strictObject({ kind: z.enum(["approve", "override"]), action: actionSchema });
export type HumanResponse = z.infer<typeof responseSchema>;

export const decisionInput = z.strictObject({
  asset: z.string().min(1).max(64),
  finding: z.string().min(1).max(240),
  loss: z.number().nonnegative().nullable(),
  risk: z.number().min(0).max(100),
  simulated: z.boolean(),
});
