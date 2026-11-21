/** Rejects malformed captures and twin snapshots before they reach the models or rules engine. */
import { z } from "zod";
import { areaId, deviceProfileSchema, kind, level, medium, radio, severity } from "@/gemini/schemas";
import { containsPoint } from "@/twin/geometry";
import type { AnalyzeRequest, CaptureImage, ReassessRequest } from "@/pipeline/types";
import type { Twin } from "@/twin/types";
import { CaptureImageError, normalizeCaptureImage } from "./captureImages";

const id = z.string().trim().min(1).max(160);
const number = z.number();
const point = { x: number, y: number };
const bounds = z.object({ ...point, w: number.positive(), h: number.positive() });
const dropPoint = z.object({ ...point, area: areaId });
const attrs = z.object({
  publicAccess: z.boolean(), outdoor: z.boolean(), restricted: z.boolean(), washdown: z.boolean(),
  hazard: z.enum(["NH3", "CO2", "caustic"]).nullable(), foodContact: z.boolean(),
});
const connection = z.object({
  to: id, medium, via: z.array(z.tuple([number, number])).optional(),
  active: z.boolean().optional(), label: z.string().optional(),
});
const asset = z.object({
  id, name: id, description: z.string().optional(),
  physical: z.object({
    ...point, area: areaId, rotation: number, kind, scale: number.positive().optional(),
    connections: z.array(connection),
  }),
  network: z.object({
    level, area: id, conduit: id.nullable(), ip: z.string().optional(), protocols: z.array(z.string()).optional(),
  }),
  cyber: z.object({
    vendor: z.string().optional(), model: z.string().optional(), firmware: z.string().optional(), os: z.string().optional(),
    radios: z.array(radio), ports: z.array(z.string()), removableStorage: z.boolean(),
    cloudConnected: z.boolean(), defaultCredentials: z.boolean(), remoteAccess: z.boolean(), managed: z.boolean(),
  }).optional(),
  process: z.object({
    medium: medium.optional(), capacityL: number.optional(), levelPct: number.optional(), running: z.boolean().optional(),
    telemetry: z.array(z.object({
      tag: id, label: id, value: number, unit: z.string(), lo: number.optional(), hi: number.optional(),
    })).optional(),
  }).optional(),
  specs: z.object({
    capacity: z.string().nullish(), material: z.string().nullish(), foodGrade: z.boolean().nullish(),
    hazardRating: z.string().nullish(), ipRating: z.string().nullish(),
  }).optional(),
  protections: z.array(id).optional(),
  criticality: severity, safetyCritical: z.boolean().optional(),
  origin: z.enum(["seed", "added"]), placement: z.enum(["recommended", "unsafe", "neutral"]).optional(),
  status: z.enum(["ok", "attention", "alarm", "offline"]),
});

const twin = z.object({
  plant: z.object({
    name: id, line: id, fictional: z.literal(true),
    canvas: z.object({ w: number.positive(), h: number.positive() }), building: bounds,
  }),
  areas: z.array(z.object({
    id: areaId, name: id, kind: z.enum(["process", "support", "context"]), bounds, attrs,
    typicalLevels: z.array(level), status: z.enum(["normal", "attention", "alarm"]), statusNote: z.string().optional(),
  })).min(1),
  assets: z.array(asset),
  conduits: z.array(z.object({ id, name: id, from: id, to: id, enforcedBy: id.nullable(), allows: z.array(z.string()) })),
  entryPoints: z.array(z.object({
    ...point,
    id: z.enum(["internet", "parking_rf", "visitor", "vendor_remote", "supply_chain", "insider"]),
    name: id,
    kind: z.enum(["internet", "rf", "physical", "remote", "supply"]),
    area: areaId.optional(), reach: number.optional(),
  })),
}) satisfies z.ZodType<Twin>;

const note = z.string().trim().max(12_000).optional();
export const captureImageSchema = z.object({
  mimeType: z.string(),
  dataBase64: z.string(),
}).transform((image, ctx) => {
  try {
    return normalizeCaptureImage(image);
  } catch (error) {
    if (!(error instanceof CaptureImageError)) throw error;
    ctx.addIssue({ code: "custom", path: ["dataBase64"], message: error.message });
    return z.NEVER;
  }
}) satisfies z.ZodType<CaptureImage>;

const productUrl = z.url({ protocol: /^https?$/ }).max(4096).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password;
});
const capture = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("photo"), images: z.array(captureImageSchema).min(1).max(3), note }),
  z.object({ kind: z.literal("link"), url: productUrl, note }),
  z.object({ kind: z.literal("text"), description: z.string().trim().min(1).max(12_000) }),
]);

function knownPoint(snapshot: Twin, location: { area: string; x: number; y: number }): boolean {
  return snapshot.areas.some((area) => area.id === location.area && containsPoint(area, location.x, location.y));
}

export const analyzeRequestSchema = z.object({ input: capture, twin, dropPoint: dropPoint.nullish() }).refine(
  (request) => !request.dropPoint || knownPoint(request.twin, request.dropPoint),
  { path: ["dropPoint"], message: "Pick a location inside a plant area." },
) satisfies z.ZodType<AnalyzeRequest>;

export const reassessRequestSchema = z.object({
  profile: deviceProfileSchema, twin, assetId: id, placement: dropPoint.extend({ level: level.optional() }),
}).refine(
  (request) => request.twin.assets.some((asset) => asset.id === request.assetId && asset.origin === "added"),
  { path: ["assetId"], message: "The captured device is missing from the plant." },
).refine(
  (request) => knownPoint(request.twin, request.placement),
  { path: ["placement"], message: "Move the device inside a plant area before reassessing it." },
) satisfies z.ZodType<ReassessRequest>;
