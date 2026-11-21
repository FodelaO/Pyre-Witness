/** Covers captured-camera placement and controls with independent RF and physical effects. */
import { describe, expect, it } from "vitest";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import type { DeviceProfile } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { applyEffect, applyEffects } from "@/twin/effects";
import { assetById } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { runScenario } from "../engine";
import { wireless } from "./wireless";

const cameraProfile: DeviceProfile = {
  device_type: "Wi-Fi camera", category: "camera", vendor: null, model: null,
  radios: ["wifi"], ports: [], storage: null, default_credentials_visible: false,
  default_credentials_note: null, cloud_connectivity: null, power: null, physical_kind: "ip_camera",
  capacity_or_size: null, material: null, food_grade: null, hazardous_area_rating: null,
  ip_rating: null, evidence: [], unknowns: [], confidence: 1,
};

function capturedCamera() {
  return assetFromProfile(cameraProfile, SEED_TWIN, "NEW-WIFI-CAMERA", DEFAULT_DROP);
}

function add(twin: Twin, asset: ReturnType<typeof capturedCamera>): Twin {
  return { ...twin, assets: [...twin.assets, asset] };
}

describe("RF exposure from a captured camera", () => {
  it("uses the modeled placement path for an added camera beside the stock HMI", () => {
    expect(runScenario("wireless", SEED_TWIN)).toMatchObject({ contained: true, containedAt: 4 });
    const camera = capturedCamera();
    expect(camera.physical.connections).toEqual([]);
    expect(camera.network.area).toBe(assetById(SEED_TWIN, "HMI-F3")?.network.area);

    const twin = add(SEED_TWIN, camera);
    const run = runScenario("wireless", twin);
    expect(run.contained).toBe(false);
    expect(run.stages[1]).toMatchObject({ t: 4, where: ["parking_rf", camera.id], title: expect.stringContaining(camera.id) });
    expect(run.stages[2]).toMatchObject({ t: 8, title: "Modeled Wi-Fi path reaches HMI-F3",
      where: expect.arrayContaining([camera.id, "HMI-F3"]) });
    expect(run.consequence.metrics.fillerRateBph).toBe(29520);

    const physicalLocks = applyEffects(twin, [
      { type: "add_protection", assetId: camera.id, protection: "port-lock" },
      { type: "add_protection", assetId: "HMI-F3", protection: "locked-cabinet" },
    ]);
    expect(runScenario("wireless", physicalLocks)).toEqual(run);
    const radioOff = applyEffect(physicalLocks, { type: "disable_radio", assetId: camera.id, radio: "wifi" });
    expect(runScenario("wireless", radioOff)).toMatchObject({ contained: true, containedAt: 4 });
  });

  it("credits an enforced boundary only when removing it restores modeled reach", () => {
    const camera = capturedCamera();
    const packaging = assetById(SEED_TWIN, "SW-PK")!;
    const crossCell = add(SEED_TWIN, { ...camera, network: { ...camera.network, area: packaging.network.area } });
    const defended = applyEffect(crossCell, {
      type: "enforce_conduit", conduitId: "C-F3-PACK", enforcedBy: "SW-F3", allows: [],
    });
    const blocked = runScenario("wireless", defended);
    expect(blocked).toMatchObject({ contained: true, containedAt: 8 });
    expect(blocked.stages.at(-1)).toMatchObject({ by: "Filler isolation at SW-F3", where: ["SW-F3"] });
    expect(blocked.counterfactual).toMatchObject({
      removedControl: "Filler isolation at SW-F3", consequence: { metrics: { fillerRateBph: 29520 } },
    });

    const without = wireless.stages(defended).find(({ t }) => t === 8)?.control?.without;
    expect(without).toBeTypeOf("function");
    const before = structuredClone(defended);
    expect(runScenario("wireless", without!(defended)).contained).toBe(false);
    expect(defended).toEqual(before);
  });
});
