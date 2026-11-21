/** Verifies proposal scope and projections on the approval panel's shared store. */
import { afterEach, describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { assetById } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import type { Asset, Mitigation } from "@/twin/types";
import { useSimStore } from "./simStore";
import type { SimulationMitigation } from "./types";

const otherProposal: Mitigation = {
  id: "placement-review", title: "Review the added device", kind: "physical", description: "Review the exercise placement.",
  effects: [{ type: "remove_asset", assetId: "PROJECTION-CAMERA" }], targets: ["PROJECTION-CAMERA"],
  proposedBy: "threat-watch", status: "proposed",
};

function installedCamera(): Asset {
  const seed = assetById(SEED_TWIN, "AP-IT")!;
  return {
    ...seed, id: "PROJECTION-CAMERA", origin: "added",
    physical: { ...seed.physical, kind: "ip_camera", area: "utilities", x: 1410, y: 245, connections: [] },
    network: { level: 2, area: "Cell Utilities", conduit: null, protocols: ["HTTPS"] },
    cyber: { ...seed.cyber!, cloudConnected: true, managed: false },
  };
}

const proposal = (id: string) => useTwinStore.getState().mitigations.find((item) => item.id === id);
const pendingSim = () => useTwinStore.getState().mitigations.filter((item): item is SimulationMitigation =>
  item.status === "proposed" && "simulationContainment" in item);

afterEach(() => {
  useSimStore.getState().reset();
  useSimStore.getState().setSpeed(1);
  useTwinStore.getState().reset();
});

describe("simulation mitigation queue", () => {
  it("withdraws the previous scenario's pending proposals while keeping decisions and other sources", () => {
    useTwinStore.getState().proposeMitigations([otherProposal]);
    const { start, advance, reset } = useSimStore.getState();
    start("cip");
    advance(30);
    expect(pendingSim().map(({ simulationScenario }) => simulationScenario)).not.toHaveLength(0);
    expect(pendingSim().every(({ simulationScenario }) => simulationScenario === "cip")).toBe(true);

    const { decideMitigation } = useTwinStore.getState();
    decideMitigation("sim-cip-hardwired-interlock", "rejected");
    decideMitigation("sim-cip-isolate", "approved");
    expect(pendingSim().length).toBeGreaterThan(0);
    start("ammonia");
    expect(pendingSim()).toEqual([]);
    advance(30);
    expect(pendingSim()).toHaveLength(1);
    expect(pendingSim()[0].simulationScenario).toBe("ammonia");
    reset();
    expect(pendingSim()).toEqual([]);
    expect(proposal("sim-cip-hardwired-interlock")?.status).toBe("rejected");
    expect(proposal("sim-cip-isolate")?.status).toBe("applied");
    expect(proposal(otherProposal.id)?.status).toBe("proposed");
  });

  it("recalculates pending risk after an asset move and a different approval without churning on quiet ticks", () => {
    const { addAsset, updateAsset, proposeMitigations, decideMitigation } = useTwinStore.getState();
    addAsset(installedCamera());
    proposeMitigations([otherProposal]);
    const { start, advance, tickPlant } = useSimStore.getState();
    start("cip");
    advance(30);

    const id = "sim-cip-controller";
    function currentDelta() {
      const item = proposal(id);
      const { twin } = useTwinStore.getState();
      expect(item).toMatchObject({ status: "proposed", riskDelta: expect.any(Number) });
      const actual = item!.riskDelta!;
      expect(actual).toBeCloseTo(evaluateTwin(applyEffects(twin, item!.effects)).score - evaluateTwin(twin).score);
      return actual;
    }

    const initial = currentDelta();
    updateAsset("PROJECTION-CAMERA", (asset) => ({ ...asset, physical: { ...asset.physical, x: 1220 } }));
    const moved = currentDelta();
    expect(moved).not.toBe(initial);

    decideMitigation(otherProposal.id, "approved");
    expect(currentDelta()).not.toBe(moved);
    expect(proposal(otherProposal.id)?.status).toBe("applied");
    const refreshed = useTwinStore.getState().mitigations;
    tickPlant();
    expect(useTwinStore.getState().mitigations).toBe(refreshed);
  });
});
