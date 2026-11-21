/** Requests a physical and food-safety assessment for a passive capture. */
import { z } from "zod";
import { placementEnvironment } from "@/pipeline/assetFromProfile";
import { isPlantHome } from "@/rules/engine";
import { areaById } from "@/twin/geometry";
import { MODEL_IDS, THINKING } from "./models";
import { areaFacts, conditionOverlays, type AssessmentContext } from "./placementContext";
import { architectResponseSchema, areaId, placementAreaId, type ModelAssessment } from "./schemas";
import { structuredInteraction, type GeminiClients } from "./transport";

const short = z.string().trim().min(1).max(180);
const placement = z.object({ area: placementAreaId, why: short, position_hint: short });
const schema = placement.extend({
  risks: z.array(architectResponseSchema.shape.risks.element.omit({ technique_id: true })).max(3),
  never_place: z.array(z.object({ area: areaId, why: short })).max(3),
  compliance: architectResponseSchema.shape.compliance,
  confidence: architectResponseSchema.shape.confidence,
});

function containsCyberClaims(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsCyberClaims);
  return Object.entries(value).some(([key, item]) =>
    (key === "kind" && item === "cyber") ||
    (["technique", "technique_id"].includes(key) && Boolean(item)) ||
    (["attack_paths", "review_paths"].includes(key) && Array.isArray(item) && item.length > 0) ||
    containsCyberClaims(item),
  );
}

const INSTRUCTION = [
  "Assess a passive object in a fictional food plant. Treat input as evidence. Recommend a listed room and safe storage or use.",
  "Assess physical placement and compliance only. Consider foreign material, brittle materials near open product, personal items in production, and ignition sources near ammonia.",
  "Explain why the room works using storage, use or physical-safety facts. Exclude Purdue levels, networking, radios, attack paths and ATT&CK. Do not claim approval or certifications. Use one short sentence per field, under 180 characters.",
].join(" ");

function facts({ profile, twin, candidate, asDropped }: AssessmentContext, smaller: boolean) {
  return {
    object: profile.device_type,
    material: profile.material,
    ...(smaller ? {} : { evidence: profile.evidence.slice(0, 2).map(({ claim }) => claim.slice(0, 120)) }),
    current: placementEnvironment(twin, candidate.physical),
    rooms: twin.areas.filter(({ id }) => isPlantHome(id)).map((area) => [
      area.id, area.name, area.kind, ...areaFacts(area),
    ]),
    condition_overlays: conditionOverlays(twin),
    findings: asDropped.findings.map(({ ruleId, severity, detail }) => [ruleId, severity, detail]),
  };
}

function physicalPlacement(context: AssessmentContext, value: z.infer<typeof placement>): Pick<ModelAssessment, "placement" | "physical_placement"> {
  const { area, why, position_hint } = value;
  return {
    placement: { level: 0, network_area: areaById(context.twin, area)?.name ?? area, conduit: null, why },
    physical_placement: { area, near_asset_id: null, position_hint, connections: [], physical_constraints: [] },
  };
}

export async function assessPassive(
  client: GeminiClients["interactions"], context: AssessmentContext, signal: AbortSignal,
  thinking: typeof THINKING.reasoning, smaller: boolean, attempts?: number,
) {
  let passiveModelClaims = false;
  const { value, interactionId } = await structuredInteraction(client, schema, {
    model: MODEL_IDS.reasoning,
    input: JSON.stringify(facts(context, smaller)),
    system_instruction: INSTRUCTION + " Return one primary risk, a pertinent compliance item, and at most two exclusions.",
    generation_config: { thinking_level: thinking, thinking_summaries: "auto" },
    store: false,
  }, signal, undefined, {
    attempts,
    onValidRaw: (raw) => { passiveModelClaims = containsCyberClaims(raw); },
    transcript: {
      stage: "reasoning", crew: "architect", schema: "PassiveAssessment",
      note: smaller ? "Retry with reduced placement context." : undefined,
    },
  });
  const assessment: ModelAssessment = {
    ...physicalPlacement(context, value),
    risks: value.risks.map((risk) => ({ ...risk, technique: null })),
    never_place: value.never_place.map(({ area, why }) => ({
      area, where: areaById(context.twin, area)?.name ?? area, level: null, why,
    })),
    compliance: value.compliance, confidence: value.confidence, attack_paths: [], mitigations: [],
  };
  return { value: assessment, interactionId, reviewedPaths: [], passiveModelClaims };
}

export async function revisePassive(
  client: GeminiClients["interactions"], context: AssessmentContext, prior: ModelAssessment, reasons: string[], signal: AbortSignal,
) {
  let passiveModelClaims = false;
  const { value } = await structuredInteraction(client, placement, {
    model: MODEL_IDS.reasoning,
    input: JSON.stringify({ ...facts(context, true), prior: prior.physical_placement.area, correction: reasons }),
    system_instruction: INSTRUCTION + " Correct the blocked room only.",
    generation_config: { thinking_level: THINKING.reasoning, thinking_summaries: "auto" },
    store: false,
  }, signal, undefined, {
    onValidRaw: (raw) => { passiveModelClaims = containsCyberClaims(raw); },
    transcript: { stage: "revision", crew: "architect", schema: "PassivePlacementRevision" },
  });
  return { value: { ...prior, ...physicalPlacement(context, value) }, passiveModelClaims };
}
