/** Resolves tabletop stages against the provided plant and projects candidate controls. */
import { isKnownTechnique } from "@/data/attack-ics";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import type { Mitigation, Twin } from "@/twin/types";
import { SCENARIOS } from "./scenarios";
import type { ScenarioId, SimRun, SimStage } from "./types";

export type { SimRun } from "./types";

export function runScenario(scenarioId: ScenarioId, twin: Twin): SimRun {
  const definition = SCENARIOS[scenarioId];
  const stages: SimStage[] = [];
  for (const { control, effects, technique, ...event } of definition.stages(twin)) {
    const reference = technique && isKnownTechnique(technique) ? { technique } : {};
    if (control?.holds(twin)) {
      stages.push({ ...event, ...reference, where: control.where ?? event.where, outcome: "blocked", by: control.label });
      break;
    }
    stages.push({ ...event, ...reference, outcome: "advanced", ...(effects ? { effects } : {}) });
  }
  const final = stages.at(-1);
  const contained = final?.outcome === "blocked";
  return {
    id: scenarioId,
    stages,
    contained,
    ...(contained ? { containedAt: final.t } : {}),
    consequence: definition.consequence(twin, stages),
  };
}

function containsEarlier(projected: SimRun, baseline: SimRun): boolean {
  if (!projected.contained) return false;
  if (!baseline.contained) return true;
  const projectedTime = projected.containedAt ?? Infinity;
  const baselineTime = baseline.containedAt ?? Infinity;
  return projectedTime < baselineTime
    || (projectedTime === baselineTime && projected.stages.length < baseline.stages.length);
}

export function projectScenarioMitigations(scenarioId: ScenarioId, twin: Twin): Mitigation[] {
  const baseline = runScenario(scenarioId, twin);
  const candidates = SCENARIOS[scenarioId].mitigations(twin);
  if (candidates.length === 0) return [];
  const before = evaluateTwin(twin).score;
  return candidates.flatMap((candidate) => {
    const changed = applyEffects(twin, candidate.effects);
    const projected = runScenario(scenarioId, changed);
    if (!containsEarlier(projected, baseline)) return [];
    return [{
      ...candidate,
      status: "proposed" as const,
      proposedBy: "inspector",
      description: `${candidate.description} Simulation replay at ${projected.containedAt} s. ${projected.consequence.summary}`,
      riskDelta: evaluateTwin(changed).score - before,
    }];
  });
}
