/** Runtime schemas shared by Gemini structured output and the pipeline validator. */
import { z } from "zod";
import { DEVICE_CATEGORIES, type DeviceProfile } from "@/pipeline/types";
import { EQUIPMENT_KINDS, MEDIA, RADIOS, type AreaId, type Medium } from "@/twin/types";

export const areaId = z.enum([
  "water_treatment", "syrup_room", "blending", "filler3", "packaging", "utilities", "control_room",
  "corporate_office", "crew_office", "parking_lot", "visitor_corridor", "nh3_hazard", "washdown",
] satisfies AreaId[]);
export const level = z.literal([0, 1, 2, 3, 3.5, 4, 5]);
export const severity = z.literal([1, 2, 3, 4, 5]);
export const medium = z.enum(Object.keys(MEDIA) as Medium[]);
export const radio = z.enum(RADIOS);
export const kind = z.enum(EQUIPMENT_KINDS);
export const probability = z.number().min(0).max(1);

const tag = z.string().trim().min(1).max(160);
const detail = z.string().trim().min(1).max(1200);
const technique = z.object({ id: tag, name: tag });
const riskKind = z.enum(["cyber", "physical", "compliance"]);

export const deviceProfileSchema = z.object({
  device_type: tag,
  category: z.enum(DEVICE_CATEGORIES),
  vendor: tag.nullable(),
  model: tag.nullable(),
  radios: z.array(radio),
  ports: z.array(tag).max(24),
  storage: tag.nullable(),
  default_credentials_visible: z.boolean(),
  default_credentials_note: detail.nullable(),
  cloud_connectivity: z.boolean().nullable(),
  power: tag.nullable(),
  physical_kind: kind,
  capacity_or_size: tag.nullable(),
  material: tag.nullable(),
  food_grade: z.boolean().nullable(),
  hazardous_area_rating: tag.nullable(),
  ip_rating: tag.nullable(),
  evidence: z.array(z.object({
    claim: detail,
    source: z.enum(["label", "shape", "port", "screen", "text", "spec_sheet"]),
    confidence: probability,
  })).max(16),
  unknowns: z.array(detail).max(16),
  confidence: probability,
}) satisfies z.ZodType<DeviceProfile>;

const cyberMitigation = z.object({
  defaultCredentials: z.literal(false).optional(),
  cloudConnected: z.literal(false).optional(),
  remoteAccess: z.literal(false).optional(),
  removableStorage: z.literal(false).optional(),
  managed: z.literal(true).optional(),
});

const effect = z.union([
  z.object({
    type: z.literal("move_asset"), assetId: tag, area: areaId, level, networkArea: tag, conduit: tag.nullable(),
    x: z.number().optional(), y: z.number().optional(),
  }),
  z.object({ type: z.literal("disable_radio"), assetId: tag, radio }),
  z.object({ type: z.literal("patch_cyber"), assetId: tag, patch: cyberMitigation }),
  z.object({ type: z.literal("remove_connection"), assetId: tag, to: tag, medium: z.literal("network") }),
  z.object({ type: z.literal("remove_asset"), assetId: tag }),
  z.object({ type: z.literal("enforce_conduit"), conduitId: tag, enforcedBy: tag, allows: z.array(detail).max(16) }),
  z.object({ type: z.literal("add_protection"), assetId: tag, protection: tag }),
  z.object({ type: z.literal("note"), text: detail }),
]);

const risk = z.object({
  title: tag, kind: riskKind, severity, likelihood: severity,
  technique: technique.nullable(), description: detail, mitigation: detail,
});

export const modelAssessmentSchema = z.object({
  placement: z.object({ level, network_area: tag, conduit: tag.nullable(), why: detail }),
  physical_placement: z.object({
    area: areaId,
    near_asset_id: tag.nullable(),
    position_hint: detail,
    connections: z.array(z.object({ to: tag, medium })).max(10),
    physical_constraints: z.array(detail).max(12),
  }),
  never_place: z.array(z.object({ where: tag, area: areaId.nullable(), level: level.nullable(), why: detail })).max(12),
  risks: z.array(risk).max(12),
  attack_paths: z.array(z.object({
    title: tag, entry: tag, target: tag,
    steps: z.array(z.object({
      from: tag, to: tag,
      via: z.enum(["rf", "network", "physical", "usb", "internet", "remote", "process"]),
      technique: technique.optional(),
      note: detail,
    })).min(1).max(8),
    severity, likelihood: severity,
    impact: detail,
    ruleIds: z.array(tag).max(12).optional(),
  })).max(6),
  compliance: z.array(z.object({
    framework: tag, clause: tag, status: z.enum(["met", "gap", "unknown"]), note: detail,
  })).max(12),
  mitigations: z.array(z.object({
    title: tag, kind: z.enum(["physical", "software", "procedural"]), description: detail,
    targets: z.array(tag).max(12),
    effects: z.array(effect).min(1).max(6),
  })).max(8),
  confidence: probability,
});
export type ModelAssessment = z.infer<typeof modelAssessmentSchema>;

/** The single-call evaluation baseline also uses these shapes and supplies its own risk IDs. */
export const assessmentSchema = modelAssessmentSchema.extend({
  risks: z.array(risk.extend({ id: tag })).max(12),
});

const briefingLine = z.string().trim().min(1).max(240).refine((text) => !/[\r\n]/.test(text));
export const briefingSchema = z.object({ lines: z.array(briefingLine).min(2).max(3) });

const noul = z.object({ type: z.literal("noul"), noul: probability, confidence: probability });
const routeProbabilities = z.object({
  it_ot_device: probability, process_equipment: probability, document_or_spec: probability, other: probability,
});
export const decisionsResponseSchema = z.object({
  answers: z.object({
    is_device: noul,
    is_readable: noul,
    route: z.object({
      type: z.literal("choice"), choice: routeProbabilities.keyof(), confidence: probability,
      probabilities: routeProbabilities,
    }),
    label_visible: noul,
  }),
});
