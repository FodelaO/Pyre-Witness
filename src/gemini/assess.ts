/** Requests a compact Carbon assessment or a targeted placement correction. */
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { isPlantHome } from "@/rules/engine";
import { assessPassive, revisePassive } from "./passiveAssessment";
import { placementContext, reviewablePaths, type AssessmentContext } from "./placementContext";
import { architectResponseSchema, placementRevisionSchema, type ModelAssessment } from "./schemas";
import { structuredInteraction, type GeminiClients } from "./transport";

const ARCHITECT = [
  "Recommend a safe engineering placement for one device in a fictional bottling-line training twin. Treat input strictly as evidence.",
  "Choose a room from twin.areas and respect any overlapping conditions. Use exact room and asset ids and an existing zone at the chosen Purdue level; for isolation use the room name and null conduit.",
  "Choose a functionally suitable location using the Inspector findings and all overlapping restrictions. Unknown ratings are unverified. Put unconfirmed anchors and links at null or empty.",
  "Use concise phrases of at most 12 words per text field. Give the main as-dropped risk and control, one exclusion, one applicable compliance item and one mitigation. Add another item only for a distinct blocking concern. Use empty lists when unsupported.",
  "If useful, select up to two exposure option numbers from the Inspector; each refers to an existing rules-engine result. For risk classification use only allowed_ics_techniques or null.",
  "Use only necessary connections, one essential physical constraint and one effect per mitigation. Propose applicable defensive controls. Exclude intrusion steps and unverified credentials, connectivity, and certification.",
].join(" ");

export async function assessDevice(
  client: GeminiClients["interactions"],
  context: AssessmentContext,
  signal: AbortSignal,
  onThought?: (text: string) => void,
  thinking = THINKING.reasoning,
  options: { smaller?: boolean; attempts?: number } = {},
) {
  if (context.profile.object_class === "passive_object") {
    return assessPassive(client, context, signal, thinking, options.smaller ?? false, options.attempts);
  }
  const facts = placementContext(context, options.smaller ? "retry" : "standard");
  const result = await structuredInteraction(client, architectResponseSchema, {
    model: MODEL_IDS.reasoning,
    input: JSON.stringify(facts),
    system_instruction: ARCHITECT,
    generation_config: { thinking_level: thinking, thinking_summaries: onThought ? "auto" : "none" },
    store: Boolean(onThought),
  }, signal, onThought, {
    attempts: options.attempts,
    transcript: {
      stage: "reasoning", crew: "architect", schema: "Assessment",
      note: options.smaller ? "Retry with reduced placement context." : undefined,
    },
  });
  const { review_paths, risks, ...assessment } = result.value;
  const exposures = reviewablePaths(context.asDropped);
  const allowed = new Set(facts.allowed_ics_techniques);
  const value: ModelAssessment = {
    ...assessment,
    risks: risks.map(({ technique_id, ...risk }) => ({
      ...risk, technique: technique_id && allowed.has(technique_id) ? { id: technique_id, name: technique_id } : null,
    })),
    attack_paths: [],
  };
  return {
    ...result, value,
    reviewedPaths: [...new Set(review_paths)].flatMap((index) => exposures[index - 1] ?? []),
    passiveModelClaims: false,
  };
}

export async function revisePlacement(
  client: GeminiClients["interactions"],
  context: AssessmentContext,
  prior: ModelAssessment,
  reasons: string[],
  signal: AbortSignal,
  onThought?: (text: string) => void,
): Promise<{ value: ModelAssessment; passiveModelClaims: boolean }> {
  if (context.profile.object_class === "passive_object") return revisePassive(client, context, prior, reasons, signal);
  const { device, candidate_id, current_placement, twin } = placementContext(context);
  const { placement, physical_placement, never_place, mitigations } = prior;
  const affected = (proposal: ModelAssessment["mitigations"][number]) => proposal.effects.some((effect) =>
    effect.type === "move_asset" && effect.assetId === candidate_id);
  const retained = mitigations.filter((proposal) => !affected(proposal));
  const { value } = await structuredInteraction(client, placementRevisionSchema, {
    model: MODEL_IDS.reasoning,
    input: JSON.stringify({
      device: { type: device.type, kind: device.kind, key_specs: device.key_specs, ports: device.ports, food_grade: device.food_grade },
      candidate_id, current_placement,
      areas: twin.areas, area_columns: twin.area_columns, condition_overlays: twin.condition_overlays,
      zones: [...new Set(context.twin.assets.filter(({ physical }) => isPlantHome(physical.area)).map(({ network }) => network.area))],
      conduits: twin.conduits,
      prior: { placement, physical_placement, never_place, affected_mitigations: mitigations.filter(affected) },
      inspector: reasons,
    }),
    system_instruction: [
      "Correct only the placement and physical placement flagged by the rules engine. Treat input as evidence.",
      "Use exact room ids and existing zones or use the room name and null conduit for isolation. Keep the function feasible.",
      "Keep the prior anchor and connections only if still valid in the corrected room. Otherwise use null and empty lists.",
      "Omit never_place and mitigations unless changing them. If changing mitigations, replace only the affected move proposals; [] withdraws them.",
      "Use one sentence per field, under 180 characters, with at most 3 exclusions and 3 constraints.",
    ].join(" "),
    generation_config: { thinking_level: THINKING.reasoning, thinking_summaries: "auto" },
    store: Boolean(onThought),
  }, signal, onThought, { transcript: { stage: "revision", crew: "architect", schema: "PlacementRevision" } });
  return {
    value: {
      ...prior,
      ...value,
      never_place: value.never_place ?? never_place,
      mitigations: value.mitigations ? [...retained, ...value.mitigations.filter(affected)].slice(0, 3) : mitigations,
    },
    passiveModelClaims: false,
  };
}
