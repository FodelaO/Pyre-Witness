/** Keeps the panel's pending simulation proposals scoped to the latest replay. */
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { mitigationEffectKey } from "./mitigationEffects";
import type { SimulationMitigation } from "./types";

function isSimulation(item: Mitigation): item is SimulationMitigation {
  return "simulationContainment" in item;
}

export function replaceSimulationProposals(projected: SimulationMitigation[]): void {
  const { mitigations, proposeMitigations } = useTwinStore.getState();
  const scenario = projected[0]?.simulationScenario;
  const unavailable = new Set(mitigations.filter((item) => isSimulation(item)
    ? item.status === "rejected" && item.simulationScenario === scenario
    : item.status === "proposed").map(({ effects }) => mitigationEffectKey(effects)));
  const remaining = new Map(projected.flatMap((item) => {
    const key = mitigationEffectKey(item.effects);
    return unavailable.has(key) ? [] : [[key, item] as const];
  }));

  const retained = mitigations.flatMap((item) => {
    if (item.status !== "proposed" || !isSimulation(item)) return [item];
    if (item.simulationScenario !== scenario) return [];
    const key = mitigationEffectKey(item.effects);
    const updated = remaining.get(key);
    if (!updated) return [];
    remaining.delete(key);
    return [{ ...updated, id: item.id }];
  });

  if (retained.length !== mitigations.length || retained.some((item, index) => item !== mitigations[index])) {
    useTwinStore.setState({ mitigations: retained });
  }
  if (remaining.size) proposeMitigations([...remaining.values()]);
}
