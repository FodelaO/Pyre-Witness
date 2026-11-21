/** Resolves tabletop stages against the provided plant and projects candidate controls. */
import { isKnownTechnique } from "@/data/attack-ics";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import type { Twin } from "@/twin/types";
import { ALL_SCENARIOS } from "./scenarios";
import type { ScenarioContext, ScenarioControl, SimRun, SimScenarioId, SimStage, SimulationMitigation } from "./types";

export type { SimRun } from "./types";

function resolve(scenarioId: SimScenarioId, twin: Twin, context?: ScenarioContext): {
  run: Omit<SimRun, "counterfactual">; control?: ScenarioControl;
} {
  const definition = ALL_SCENARIOS[scenarioId];
  const stages: SimStage[] = [];
  let held: ScenarioControl | undefined;
  for (const { control, effects, technique, ...event } of definition.stages(twin, context)) {
    const reference = technique && isKnownTechnique(technique) ? { technique } : {};
    if (control?.holds(twin)) {
      stages.push({ ...event, ...reference, where: control.where ?? event.where, outcome: "blocked", by: control.label });
      held = control;
      break;
    }
    stages.push({ ...event, ...reference, outcome: "advanced", ...(effects ? { effects } : {}) });
  }
  const final = stages.at(-1);
  const contained = final?.outcome === "blocked";
  return { control: held, run: {
    id: scenarioId,
    stages,
    contained,
    ...(contained ? { containedAt: final.t } : {}),
    consequence: definition.consequence(twin, stages),
  } };
}

export function runScenario(scenarioId: SimScenarioId, twin: Twin, context?: ScenarioContext): SimRun {
  const { run, control } = resolve(scenarioId, twin, context);
  const copy = { ...twin };
  const replay = resolve(scenarioId, control?.without?.(copy) ?? copy, context);
  return {
    ...run,
    counterfactual: {
      removedControl: control?.without ? control.label : null,
      ...(replay.run.containedAt !== undefined ? { containedAt: replay.run.containedAt } : {}),
      ...(replay.control ? { heldBy: replay.control.label } : {}),
      consequence: replay.run.consequence,
    },
  };
}

function containsEarlier(projected: Omit<SimRun, "counterfactual">, baseline: Omit<SimRun, "counterfactual">): boolean {
  if (!projected.contained) return false;
  if (!baseline.contained) return true;
  const projectedTime = projected.containedAt ?? Infinity;
  const baselineTime = baseline.containedAt ?? Infinity;
  return projectedTime < baselineTime
    || (projectedTime === baselineTime && projected.stages.length < baseline.stages.length);
}

export function projectScenarioMitigations(scenarioId: SimScenarioId, twin: Twin): SimulationMitigation[] {
  const baseline = resolve(scenarioId, twin).run;
  const candidates = ALL_SCENARIOS[scenarioId].mitigations(twin);
  if (candidates.length === 0) return [];
  const before = evaluateTwin(twin).score;
  return candidates.flatMap((candidate) => {
    const changed = applyEffects(twin, candidate.effects);
    const { run: projected, control } = resolve(scenarioId, changed);
    if (!containsEarlier(projected, baseline) || projected.containedAt === undefined || !control) return [];
    return [{
      ...candidate,
      status: "proposed" as const,
      proposedBy: "inspector",
      description: `${candidate.description} ${projected.consequence.summary}`,
      riskDelta: evaluateTwin(changed).score - before,
      simulationContainment: { before: baseline.containedAt ?? null, after: projected.containedAt, safeguard: control.label },
    }];
  });
}
