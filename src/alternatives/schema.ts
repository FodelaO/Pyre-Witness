/** Validates Carbon's closed proposal format and the bounded evidence it receives. */
import { z } from "zod";
import { deviceProfileSchema, level, areaId } from "@/gemini/schemas";
import { EQUIPMENT_KINDS, RADIOS } from "@/twin/types";

export const CHANGE_IDS = [
  ...RADIOS.map((radio) => `disable_${radio}` as const),
  "architect_placement", "washdown_enclosure", "managed", "remove_defaults",
  "local_only", "no_remote_access", "port_lock",
] as const;
export type ChangeId = (typeof CHANGE_IDS)[number];

const cost = z.strictObject({
  low: z.number(),
  mode: z.number(),
  high: z.number(),
}).refine(({ low, mode, high }) => low <= mode && mode <= high, "Expected low ≤ mode ≤ high");

export const carbonResponseSchema = z.strictObject({
  candidates: z.array(z.strictObject({
    name: z.string().trim().min(1).max(64).refine((text) => !/[\r\n]/.test(text) && text.split(/\s+/).length <= 4, "Use at most four words"),
    kind: z.enum(EQUIPMENT_KINDS),
    rationale: z.string().trim().min(1).max(180).refine((text) => !/[\r\n]/.test(text), "Use one line"),
    changes: z.array(z.enum(CHANGE_IDS)).min(1).max(6)
      .refine((changes) => new Set(changes).size === changes.length, "Use each change only once"),
    costDeltaUsd: cost,
  })).max(3),
});

export const alternativesRequestSchema = z.strictObject({
  profile: deviceProfileSchema.omit({ default_credentials_note: true, evidence: true, unknowns: true }),
  kind: z.enum(EQUIPMENT_KINDS),
  placement: z.strictObject({ area: areaId, level, zone: z.string().max(160) }),
  findings: z.array(z.strictObject({
    ruleId: z.string().max(50),
    title: z.string().max(180),
    detail: z.string().max(1200),
    references: z.array(z.string().max(180)).max(32),
    clauseIds: z.array(z.string().max(100)).max(32),
  })).max(48),
  changes: z.array(z.strictObject({
    id: z.enum(CHANGE_IDS),
    description: z.string().max(280),
  })).max(CHANGE_IDS.length),
});

export type CarbonCandidate = z.infer<typeof carbonResponseSchema>["candidates"][number];
