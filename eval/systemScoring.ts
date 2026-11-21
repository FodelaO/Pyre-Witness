/** Reads the final assessment displayed by the product, with a legacy receipt fallback. */
import type { StreamEvent } from "@/pipeline/server/sse";
import { systemEvents } from "./pipelineEvidence";
import { makePrediction } from "./prediction";
import type { ScoringMethods } from "./scoringAudit";
import type { EvaluatedItem } from "./types";

export function shownAssessment(events: readonly StreamEvent[]) {
  return events.findLast((event) => event.type === "summary.started")?.assessment
    ?? events.findLast((event) => event.type === "reasoning.done" || event.type === "revision.done")?.assessment;
}

export function rescoreSystem(rows: readonly EvaluatedItem[]): EvaluatedItem[] {
  return rows.map((row) => {
    const system = row.observations.system;
    const prior = system?.prediction;
    const events = systemEvents(system);
    if (!system || !prior || !events.length) return row;
    const prediction = makePrediction(prior.accepted, prior.profile, shownAssessment(events), prior.filteredUnknownTechniques);
    return { ...row, observations: { ...row.observations, system: { ...system, prediction } } };
  });
}

export const SYSTEM_SCORING_METHODS: ScoringMethods = {
  physicalKindAccuracy: "The scorer still reads the validated Scout enum in `perception.done.profile.physical_kind`. Run 4 changed Scout’s equipment-kind guidance.",
  riskRecall: "The scorer reads `summary.started.assessment.risks`, the final list assigned to the browser’s results panel, using the existing `riskTags` matcher. Run 4 combines Architect risks, checked rules-engine findings and Scout evidence in this list. Older receipts fall back to the last reasoning or revision assessment.",
  techniqueValidity: "The shared citation scorer reads the displayed assessment, including citations attached to risks in the final list. Its catalog and archived fallback are unchanged.",
  techniqueHallucination: "The same delivered-citation source applies. Unknown IDs still use the existing validity check.",
};
