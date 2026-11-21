/** Runtime schemas shared by Gemini structured output and the pipeline validator. */
import { z } from "zod";
import { DEVICE_CATEGORIES, OBJECT_CLASSES, type DeviceProfile } from "@/pipeline/types";
import { isPlantHome } from "@/rules/engine";
import { EQUIPMENT_KINDS, MEDIA, RADIOS, type AreaId, type Medium } from "@/twin/types";

export const areaId = z.enum([
  "water_treatment", "syrup_room", "blending", "filler3", "packaging", "utilities", "control_room",
  "corporate_office", "crew_office", "parking_lot", "visitor_corridor", "nh3_hazard", "washdown",
] satisfies AreaId[]);
export const placementAreaId = z.enum(areaId.options.filter(isPlantHome));
export const level = z.literal([0, 1, 2, 3, 3.5, 4, 5]);
export const severity = z.literal([1, 2, 3, 4, 5]);
export const medium = z.enum(Object.keys(MEDIA) as Medium[]);
export const radio = z.enum(RADIOS);
export const kind = z.enum(EQUIPMENT_KINDS);
export const probability = z.number().min(0).max(1);

const tag = z.string().trim().min(1).max(160);
const detail = z.string().trim().min(1).max(1200);
const shortDetail = z.string().trim().min(1).max(180);
const technique = z.object({ id: tag, name: tag });
const riskKind = z.enum(["cyber", "physical", "compliance"]);
const objectClass = z.enum(OBJECT_CLASSES);

export const deviceProfileSchema = z.object({
  device_type: tag,
  category: z.enum(DEVICE_CATEGORIES),
  object_class: objectClass.optional(),
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

const observedObjectClass = z.enum([...OBJECT_CLASSES, "unusable"]);
export const perceptionProfileSchema = deviceProfileSchema.extend({
  object_class: observedObjectClass,
  radios: deviceProfileSchema.shape.radios.describe(
    "Evidenced radio capabilities, including ones with unknown enabled state. Use [] if none are evidenced and list unresolved radio capability in unknowns.",
  ),
  cloud_connectivity: deviceProfileSchema.shape.cloud_connectivity.describe(
    "True for evidenced cloud capability or dependency. False for established local-only design or documented absence. Null when unknown.",
  ),
});

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
  z.object({ type: z.literal("enforce_conduit"), conduitId: tag, enforcedBy: tag, allows: z.array(shortDetail).max(16) }),
  z.object({ type: z.literal("add_protection"), assetId: tag, protection: tag }),
  z.object({ type: z.literal("note"), text: shortDetail }),
]);

const risk = z.object({
  title: tag, kind: riskKind, severity, likelihood: severity,
  technique: technique.nullable(), description: shortDetail, mitigation: shortDetail,
});

export const modelAssessmentSchema = z.object({
  placement: z.object({ level, network_area: tag, conduit: tag.nullable(), why: shortDetail }),
  physical_placement: z.object({
    area: areaId,
    near_asset_id: tag.nullable(),
    position_hint: shortDetail,
    connections: z.array(z.object({ to: tag, medium })).max(3),
    physical_constraints: z.array(shortDetail).max(6),
  }),
  never_place: z.array(z.object({ where: tag, area: areaId.nullable(), level: level.nullable(), why: shortDetail })).max(3),
  risks: z.array(risk).max(3),
  attack_paths: z.array(z.object({
    title: tag, entry: tag, target: tag,
    steps: z.array(z.object({
      from: tag, to: tag,
      via: z.enum(["rf", "network", "physical", "usb", "internet", "remote", "process"]),
      technique: technique.optional(),
      note: shortDetail,
    })).min(1).max(4),
    severity, likelihood: severity,
    impact: shortDetail,
    ruleIds: z.array(tag).max(3).optional(),
  })).max(2),
  compliance: z.array(z.object({
    framework: tag, clause: tag, status: z.enum(["met", "gap", "unknown"]), note: shortDetail,
  })).max(4),
  mitigations: z.array(z.object({
    title: tag, kind: z.enum(["physical", "software", "procedural"]), description: shortDetail,
    targets: z.array(tag).max(3),
    effects: z.array(effect).min(1).max(6),
  })).max(3),
  confidence: probability,
});
export type ModelAssessment = z.infer<typeof modelAssessmentSchema>;

const architectPhysicalPlacement = modelAssessmentSchema.shape.physical_placement.extend({ area: placementAreaId });

// Carbon prioritizes existing rules-engine exposures using references, which carry
// less provider schema and output text than repeating structured routes.
export const architectResponseSchema = modelAssessmentSchema.omit({ attack_paths: true }).extend({
  physical_placement: architectPhysicalPlacement,
  risks: z.array(risk.omit({ technique: true }).extend({ technique_id: tag.nullable() })).max(3),
  review_paths: z.array(z.literal([1, 2, 3, 4])).max(2),
});

export const placementRevisionSchema = modelAssessmentSchema.pick({
  placement: true, physical_placement: true, never_place: true, mitigations: true,
}).extend({ physical_placement: architectPhysicalPlacement }).partial({ never_place: true, mitigations: true });
export type PlacementRevision = z.infer<typeof placementRevisionSchema>;

/** The single-call evaluation baseline also uses these shapes and supplies its own risk IDs. */
export const assessmentSchema = modelAssessmentSchema.extend({
  placement: modelAssessmentSchema.shape.placement.extend({ why: detail }),
  physical_placement: modelAssessmentSchema.shape.physical_placement.extend({
    position_hint: detail,
    connections: z.array(z.object({ to: tag, medium })).max(10),
    physical_constraints: z.array(detail).max(12),
  }),
  never_place: z.array(z.object({ where: tag, area: areaId.nullable(), level: level.nullable(), why: detail })).max(12),
  risks: z.array(risk.extend({ id: tag, description: detail, mitigation: detail })).max(12),
});

const noul = z.object({ type: z.literal("noul"), noul: probability, confidence: probability });
const routeProbabilities = z.object({
  it_ot_device: probability, process_equipment: probability, document_or_spec: probability, other: probability,
});
const gateObjectClass = z.enum([...OBJECT_CLASSES, "unusable"]);
const objectClassProbabilities = z.record(gateObjectClass, probability);
export const decisionsResponseSchema = z.object({
  answers: z.object({
    is_device: noul,
    is_object: noul,
    is_readable: noul,
    object_class: z.object({
      type: z.literal("choice"), choice: gateObjectClass, confidence: probability,
      probabilities: objectClassProbabilities,
    }),
    route: z.object({
      type: z.literal("choice"), choice: routeProbabilities.keyof(), confidence: probability,
      probabilities: routeProbabilities,
    }),
    label_visible: noul,
  }),
});
