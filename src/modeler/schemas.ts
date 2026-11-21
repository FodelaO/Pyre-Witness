/** Gemini output schemas and the bounded browser twin context. */
import { z } from "zod";
import { areaId, kind, level, medium, probability } from "@/gemini/schemas";
import { OBJECT_CLASSES } from "@/pipeline/types";
import { MODEL_SOURCE_KINDS } from "./types";
import { MAX_ITEMS } from "./limits";

const id = z.string().trim().min(1).max(160);
const observedLink = z.object({ to: id, medium });
const links = z.array(observedLink).max(8);
const position = z.number().min(-10_000).max(10_000);
const point = z.object({ x: position, y: position });

export const extractionSchema = z.object({
  items: z.array(z.object({
    label: id,
    kind,
    object_class: z.enum(OBJECT_CLASSES),
    evidence: z.object({ locator: z.string().trim().min(1).max(100), detail: id }),
    tag: z.string().trim().min(1).max(80).nullable(),
    area_guess: z.string().trim().max(80).nullable(),
    connects_to: links,
    confidence: probability,
  })).max(MAX_ITEMS),
});
export type RawObservation = z.infer<typeof extractionSchema>["items"][number];

export const reconciliationSchema = z.object({
  decisions: z.array(z.object({
    item_id: id,
    action: z.enum(["match_existing", "update_existing", "new_asset"]),
    asset_id: id.optional(),
    fields: z.array(z.enum(["name", "connections"])).max(2).optional(),
    area: z.string().trim().max(80).optional(),
    near_asset_id: id.optional(),
    level: level.optional(),
    network_zone: id.optional(),
    connections: links.optional(),
  })).max(MAX_ITEMS),
});
export type ModelDecision = z.infer<typeof reconciliationSchema>["decisions"][number];

const binaryAnswer = z.object({ type: z.literal("noul"), noul: probability, confidence: probability });
export const gateSchema = z.object({
  answers: z.object({
    industrial: binaryAnswer,
    usable: binaryAnswer,
    source: z.object({
      type: z.literal("choice"),
      choice: z.enum([...MODEL_SOURCE_KINDS, "other"]),
      confidence: probability,
    }),
  }),
});

export const contextSchema = z.object({
  areas: z.array(z.object({
    id: areaId,
    name: id,
    kind: z.enum(["process", "support", "context"]),
    bounds: point.extend({ w: z.number().positive().max(10_000), h: z.number().positive().max(10_000) }),
    attrs: z.object({
      publicAccess: z.boolean(), outdoor: z.boolean(), restricted: z.boolean(), washdown: z.boolean(),
      hazard: z.enum(["NH3", "CO2", "caustic"]).nullable(), foodContact: z.boolean(),
    }),
    typicalLevels: z.array(level).max(7),
    status: z.enum(["normal", "attention", "alarm"]),
  })).min(1).max(30),
  assets: z.array(z.object({
    id,
    name: id,
    physical: point.extend({
      area: areaId, kind, rotation: position, scale: z.number().positive().max(10).optional(),
      connections: z.array(observedLink).max(100),
    }),
    network: z.object({ level, area: id, conduit: id.nullable() }),
  })).max(500),
  conduitIds: z.array(id).max(100),
  entryIds: z.array(id).max(100),
});
