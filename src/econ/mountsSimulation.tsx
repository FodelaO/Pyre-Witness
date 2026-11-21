/** Measures the tabletop outcome and replays only newly approved changes on the same starting twin. */
"use client";

import { useMemo } from "react";
import { runScenario } from "@/sim/engine";
import type { SimRun, SimulationMitigation } from "@/sim/types";
import { applyEffects } from "@/twin/effects";
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { LossFigure } from "./LossFigure";
import { displayedEventLoss } from "./displayLedger";
import { estimateLoss, formatUsd } from "./model";
import { appliedControls, startingConfiguration, type StartingConfiguration } from "./mountsSimulationSnapshot";
import { scenarioFromSimulation } from "./scenarios";
import { useEconomicTwin } from "./useEconomicTwin";

function approvedReplay(run: SimRun, starting: StartingConfiguration, decisions: readonly Mitigation[]) {
  const applied = appliedControls(decisions);
  const previouslyApplied = new Set(starting.applied.map(({ id }) => id));
  const changes = applied.filter(({ id }) => !previouslyApplied.has(id)).flatMap(({ effects }) => effects);
  if (!changes.length) return null;
  const twin = applyEffects(starting.twin, changes);
  const projected = runScenario(run.id, twin, { appliedEffects: [...starting.applied.flatMap(({ effects }) => effects), ...changes] });
  const scenario = scenarioFromSimulation(twin, projected);
  return scenario ? displayedEventLoss(estimateLoss(twin, scenario)) : null;
}

function hasApprovedCounterfactual(run: SimRun, controls: readonly Mitigation[]) {
  const removed = run.counterfactual.removedControl;
  return removed && controls.some((item) => {
    if (!("simulationContainment" in item)) return false;
    const simulation = item as SimulationMitigation;
    return simulation.simulationScenario === run.id && simulation.simulationContainment.safeguard === removed;
  });
}

export function SimulationLoss({ run }: { run: SimRun }) {
  const currentTwin = useEconomicTwin();
  const decisions = useTwinStore((state) => state.mitigations);
  const result = useMemo(() => {
    const starting = startingConfiguration(run) ?? { twin: currentTwin, applied: appliedControls(decisions) };
    const scenario = scenarioFromSimulation(starting.twin, run);
    if (!scenario) return null;
    const estimate = estimateLoss(starting.twin, scenario);
    const actual = displayedEventLoss(estimate);
    const projected = approvedReplay(run, starting, decisions);
    if (projected !== null) {
      return { estimate, before: actual, after: projected };
    }
    if (hasApprovedCounterfactual(run, starting.applied)) {
      const without = scenarioFromSimulation(starting.twin, run, run.counterfactual.consequence);
      if (without) return { estimate, before: displayedEventLoss(estimateLoss(starting.twin, without)), after: actual };
    }
    return { estimate };
  }, [run, currentTwin, decisions]);
  if (!result) return null;
  const { estimate, before, after } = result;
  if (before === undefined || after === undefined) return <LossFigure estimate={estimate} simulation />;
  const avoided = before - after;
  return <LossFigure estimate={estimate} simulation
    qualifier={avoided < 0 ? `${formatUsd(-avoided)} added by approval` : `${formatUsd(avoided)} avoided`}
    comparison={[{ label: "Before approved controls", amount: before }, { label: "With approved controls", amount: after }]} />;
}
