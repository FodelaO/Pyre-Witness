/** Prices a candidate control as an explicitly scoped, modeled loss reduction. */
import { displayedEventLoss } from "@/econ/displayLedger";
import { roundUsd } from "@/econ/format";
import { estimateLoss, plantExposure } from "@/econ/model";
import { appliedControls, startingConfiguration } from "@/econ/mountsSimulationSnapshot";
import { scenarioFromSimulation } from "@/econ/scenarios";
import { evaluateTwin } from "@/rules/engine";
import { runScenario } from "@/sim/engine";
import type { SimRun } from "@/sim/types";
import { applyEffects } from "@/twin/effects";
import type { Mitigation, MitigationEffect, RiskReport, Twin } from "@/twin/types";
import { isSimulationMitigation } from "./mitigationGroups";

export interface MitigationBenefit {
  amount: number;
  period: "per event" | "/ yr";
}

function eventLoss(twin: Twin, run: SimRun, appliedEffects: readonly MitigationEffect[]): number | null {
  const replay = runScenario(run.id, twin, { appliedEffects });
  const scenario = scenarioFromSimulation(twin, replay);
  return scenario ? displayedEventLoss(estimateLoss(twin, scenario)) : null;
}

export function projectedMitigationBenefit(
  twin: Twin, risk: RiskReport, item: Mitigation, run: SimRun | null, decisions: readonly Mitigation[],
): MitigationBenefit | null {
  if (!item.effects.some(({ type }) => type !== "note")) return null;
  if (isSimulationMitigation(item)) {
    if (!run || item.simulationScenario !== run.id) return null;
    const starting = startingConfiguration(run);
    if (!starting) return null;
    const prior = new Set(starting.applied.map(({ id }) => id));
    const addedEffects = appliedControls(decisions).filter(({ id }) => !prior.has(id)).flatMap(({ effects }) => effects);
    const previousEffects = [...starting.applied.flatMap(({ effects }) => effects), ...addedEffects];
    const current = applyEffects(starting.twin, addedEffects);
    const next = applyEffects(current, item.effects);
    const before = eventLoss(current, run, previousEffects);
    const after = eventLoss(next, run, [...previousEffects, ...item.effects]);
    return before !== null && after !== null && before > after ? { amount: before - after, period: "per event" } : null;
  }

  const next = applyEffects(twin, item.effects);
  const before = plantExposure(twin, risk).totalAnnualised;
  const after = plantExposure(next, evaluateTwin(next)).totalAnnualised;
  return roundUsd(before) > roundUsd(after) ? { amount: before - after, period: "/ yr" } : null;
}
