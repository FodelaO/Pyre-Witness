/** Defines the constrained report and the defensive effects Gemini may propose. */
import { areaId, level, radio } from "@/gemini/schemas";
import { z } from "zod";

const id = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(320);
const threatId = z.string().trim().min(1).max(512);

const effect = z.union([
  z.object({
    type: z.literal("move_asset"), assetId: id, area: areaId, level, networkArea: id, conduit: id.nullable(),
  }),
  z.object({ type: z.literal("disable_radio"), assetId: id, radio }),
  z.object({
    type: z.literal("patch_cyber"), assetId: id,
    patch: z.strictObject({ remoteAccess: z.boolean().optional(), cloudConnected: z.boolean().optional() })
      .refine(({ remoteAccess, cloudConnected }) => remoteAccess !== true && cloudConnected !== true),
  }),
  z.object({ type: z.literal("remove_connection"), assetId: id, to: id, medium: z.literal("network") }),
  z.object({ type: z.literal("enforce_conduit"), conduitId: id, enforcedBy: id, allows: z.array(text).max(12) }),
  z.object({ type: z.literal("note"), text }),
]);

export const reassessmentSchema = z.object({
  headline: text.max(180),
  items: z.array(z.object({
    threatId,
    affectedAssetIds: z.array(id).min(1).max(24),
    techniqueId: id.nullable(),
    why: text,
    riskDelta: z.number().min(0).max(100).nullable(),
  })).max(20),
  recommendations: z.array(z.object({
    threatId,
    title: text.max(110),
    kind: z.enum(["physical", "software", "procedural"]),
    description: text,
    effects: z.array(effect).min(1).max(4),
  })).max(8),
});

export type Reassessment = z.infer<typeof reassessmentSchema>;
