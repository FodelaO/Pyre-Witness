/** Records the twin and decisions when a tabletop replay begins, before telemetry is painted. */
import { useSimStore } from "@/sim/simStore";
import type { SimRun } from "@/sim/types";
import { useTwinStore } from "@/twin/store";
import type { Mitigation, Twin } from "@/twin/types";

export interface StartingConfiguration {
  twin: Twin;
  applied: Mitigation[];
}

const startingConfigurations = new WeakMap<SimRun, StartingConfiguration>();

export function appliedControls(mitigations: readonly Mitigation[]) {
  return mitigations.filter(({ status, effects }) => status === "applied" && effects.some(({ type }) => type !== "note"));
}

export function startingConfiguration(run: SimRun) {
  return startingConfigurations.get(run);
}

useSimStore.subscribe((state, previous) => {
  if (state.run && state.run !== previous.run) {
    const { twin, mitigations } = useTwinStore.getState();
    startingConfigurations.set(state.run, { twin, applied: appliedControls(mitigations) });
  }
});
