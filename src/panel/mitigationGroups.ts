/** Groups review cards by their originating capture, tabletop replay, or watch. */
import { capturedAssetId } from "@/pipeline/assetFromProfile";
import { ALL_SCENARIOS } from "@/sim/scenarios";
import type { SimulationMitigation, SimScenarioId } from "@/sim/types";
import type { Mitigation, Twin } from "@/twin/types";

export function isSimulationMitigation(item: Mitigation): item is SimulationMitigation {
  return "simulationScenario" in item && "simulationContainment" in item;
}

interface CaptureReference {
  runId: string | null;
  placedAssetId: string | null;
}

interface Group<T> {
  key: string;
  label: string;
  active: boolean;
  rows: T[];
}

export function groupMitigations<T extends { item: Mitigation }>(
  rows: readonly T[], twin: Twin, activeSimulation: SimScenarioId | undefined, capture: CaptureReference,
): Group<T>[] {
  const added = new Set(twin.assets.filter(({ origin }) => origin === "added").map(({ id }) => id));
  const groups = new Map<string, Group<T>>();
  for (const row of rows) {
    const { item } = row;
    let key = "plant";
    let label = "Plant";
    let active = false;
    if (isSimulationMitigation(item)) {
      const scenario = item.simulationScenario;
      key = `simulation:${scenario}`;
      label = `Simulation · ${ALL_SCENARIOS[scenario].label}`;
      active = scenario === activeSimulation;
    } else if (item.proposedBy === "threat-watch") {
      key = "watch";
      label = "Threat watch";
    } else if (item.proposedBy === "architect") {
      const runId = /^(.*):mitigation:\d+(?:-\d+)?$/.exec(item.id)?.[1];
      const remembered = runId ? capturedAssetId(runId) : undefined;
      const assetId = (runId && runId === capture.runId ? capture.placedAssetId : null)
        ?? (remembered && added.has(remembered) ? remembered : undefined)
        ?? item.targets.find((id) => added.has(id));
      key = `capture:${assetId ?? runId ?? ""}`;
      label = assetId ? `Capture · ${assetId}` : "Capture";
    }
    const group = groups.get(key) ?? { key, label, active, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Number(b.active) - Number(a.active));
}
