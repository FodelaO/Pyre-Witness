/** Defines the watch model report and its individually verifiable rows. */
import { z } from "zod";
import { watchEffectSchema, watchNoteEffectSchema } from "./watchEffects";

const id = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(320);
const threatId = z.string().trim().min(1).max(512);

export const watchHeadlineSchema = text.max(180);
export const watchFindingSchema = z.object({
  threatId,
  affectedAssetIds: z.array(id).min(1).max(24),
  techniqueId: id.nullable(),
  why: text,
  riskDelta: z.number().min(0).max(100).nullable(),
});

export const watchProposalSchema = z.object({
  threatId,
  title: text.max(110),
  kind: z.enum(["physical", "software", "procedural"]),
  description: text,
  effects: z.array(watchEffectSchema).min(1).max(4),
});

export const MAX_WATCH_ITEMS = 20;
export const MAX_WATCH_PROPOSALS = 8;

export const reassessmentSchema = z.object({
  headline: watchHeadlineSchema,
  items: z.array(watchFindingSchema).max(MAX_WATCH_ITEMS),
  recommendations: z.array(watchProposalSchema).max(MAX_WATCH_PROPOSALS),
});

export const reviewOnlySchema = reassessmentSchema.extend({
  recommendations: z.array(watchProposalSchema.extend({
    kind: z.literal("procedural"),
    effects: z.array(watchNoteEffectSchema).length(1),
  })).max(MAX_WATCH_PROPOSALS),
});

export type Reassessment = z.infer<typeof reassessmentSchema>;
