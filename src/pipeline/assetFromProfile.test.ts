/** Checks captured evidence, room membership and overlapping placement restrictions. */
import { expect, it } from "vitest";
import { evaluatePlacement } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { assetFromProfile, atRecommendedPlacement, capturedAssetId, placementEnvironment, refreshModeledControllerLink, resolveDropPoint } from "./assetFromProfile";
import type { DeviceProfile } from "./types";
import { officeAssessment, pressureProfile } from "./server/__fixtures__/placement";

it("allocates readable, stable tags in sequence against the capture snapshot", () => {
  const camera = { ...pressureProfile, physical_kind: "ip_camera" } as const;
  const gateway = { ...pressureProfile, physical_kind: "gateway" } as const;
  const mug = { ...pressureProfile, object_class: "passive_object", device_type: "Ceramic coffee mug" } as const;
  const cameraTag = capturedAssetId("camera-run", camera, SEED_TWIN);
  expect(cameraTag).toBe("CAM-901");
  expect(capturedAssetId("camera-run", camera, SEED_TWIN)).toBe(cameraTag);
  const withCamera = {
    ...SEED_TWIN, assets: [
      ...SEED_TWIN.assets, assetFromProfile(camera, SEED_TWIN, cameraTag, DEFAULT_DROP),
    ],
  };
  const gatewayTag = capturedAssetId("gateway-run", gateway, withCamera);
  expect(gatewayTag).toBe("GW-902");
  const withGateway = {
    ...withCamera, assets: [
      ...withCamera.assets, assetFromProfile(gateway, withCamera, gatewayTag, DEFAULT_DROP),
    ],
  };
  expect(capturedAssetId("mug-run", mug, withGateway)).toBe("MUG-903");
});

it("builds a neutral provisional asset and keeps undocumented ratings unknown", () => {
  const id = capturedAssetId("abcd1234-d30f-4040-af4d-76cf9d622728");
  const pin = resolveDropPoint(SEED_TWIN);
  expect(pin).toEqual(DEFAULT_DROP);
  expect(assetFromProfile(pressureProfile, SEED_TWIN, id, pin)).toMatchObject({
    id: "NEW-ABCD1234", name: "Pressure gauge", origin: "added", placement: "neutral",
    physical: { ...pin, kind: "instrument", connections: [] },
    network: { level: 0, conduit: null },
    specs: { foodGrade: null, hazardRating: null, ipRating: null },
    cyber: undefined,
  });
});

const controllerProfile: DeviceProfile = {
  ...pressureProfile, device_type: "Programmable logic controller", category: "controller",
  physical_kind: "plc_cabinet", object_class: "networked_device",
};

it("models exposed fieldbus access to the controller without inventing an Ethernet link", () => {
  const candidate = assetFromProfile({ ...controllerProfile, ports: ["MPI", "PROFIBUS DP"] }, SEED_TWIN, "PLC-901", {
    area: "filler3", x: 830, y: 675,
  });
  expect(candidate.criticality).toBe(4);
  expect(candidate.safetyCritical).toBeUndefined();
  expect(candidate.physical.connections).toEqual([]);
  const { paths } = evaluatePlacement(SEED_TWIN, candidate);
  expect(paths).toContainEqual(expect.objectContaining({ source: "rules", target: candidate.id }));
  expect(paths.every((path) => path.steps.length === 1 && path.steps[0].via === "physical")).toBe(true);
});

it("uses the nearest available switch in the same room and network for documented Ethernet", () => {
  const area = "corporate_office";
  const switchAsset = SEED_TWIN.assets.find(({ id }) => id === "SW-IT")!;
  const twin = { ...SEED_TWIN, assets: [
    ...SEED_TWIN.assets,
    { ...switchAsset, id: "SW-NEAR", physical: { ...switchAsset.physical, x: 390 } },
    { ...switchAsset, id: "SW-OFFLINE", status: "offline" as const, physical: { ...switchAsset.physical, x: 460 } },
    { ...switchAsset, id: "SW-OTHER-ZONE", physical: { ...switchAsset.physical, x: 470 }, network: { ...switchAsset.network, level: 3.5 as const, area: "Other zone" } },
  ] };
  const controller = assetFromProfile({ ...controllerProfile, ports: ["PROFINET (Ethernet)"] }, twin, "PLC-901", { area, x: 475, y: 780 });
  expect(controller.physical.connections).toEqual([
    { to: "SW-NEAR", medium: "network", label: expect.stringMatching(/simulated.*unverified/i) },
  ]);
  expect(evaluatePlacement(twin, controller).paths).toContainEqual(expect.objectContaining({
    steps: expect.arrayContaining([expect.objectContaining({ from: controller.id, to: "SW-NEAR", via: "network" })]),
  }));
  const fieldbusOnly = assetFromProfile({ ...controllerProfile, ports: ["MPI", "RJ45"] }, twin, "PLC-902", { area, x: 475, y: 780 });
  expect(fieldbusOnly.physical.connections).toEqual([]);
  const moved = { ...controller, physical: { ...controller.physical, area: "packaging" as const, x: 1000, y: 450 } };
  expect(refreshModeledControllerLink(twin, moved).physical.connections).toEqual([]);
});

it("uses the home room while preserving every restriction at the candidate's coordinates", () => {
  const point = { area: "nh3_hazard", x: 1420, y: 150 } as const;
  const twin = {
    ...SEED_TWIN,
    areas: SEED_TWIN.areas.map((area) => ["washdown", "visitor_corridor"].includes(area.id)
      ? { ...area, bounds: { x: 1400, y: 130, w: 40, h: 40 } }
      : area),
  };
  const profile = {
    ...pressureProfile, vendor: "Test Instruments", model: "P1", ports: ["Ethernet"], storage: "microSD",
  };
  const asset = assetFromProfile(profile, twin, "NEW-TEST", point);
  expect(asset.physical).toMatchObject({ ...point, area: "utilities" });
  expect(asset).toMatchObject({
    name: "Test Instruments P1", cyber: { ports: ["Ethernet"], removableStorage: true, managed: false },
  });
  expect(asset.cyber?.ports).not.toBe(profile.ports);
  expect(placementEnvironment(twin, asset.physical)).toMatchObject({
    zones: expect.arrayContaining(["utilities", "nh3_hazard", "washdown", "visitor_corridor"]),
    hazards: ["NH3"], washdown: true, publicAccess: true,
  });
  const findings = evaluatePlacement(twin, asset).findings.filter(({ assetId }) => assetId === asset.id);
  expect(findings.map(({ ruleId }) => ruleId)).toEqual(expect.arrayContaining(["HAZ-01", "WASH-01", "USB-01"]));
});

it("keeps a passive capture isolated at the drop and after a recommendation", () => {
  const mug = assetFromProfile({
    ...pressureProfile, object_class: "passive_object", device_type: "Coffee mug", material: "glazed ceramic",
    physical_kind: "ip_camera", radios: ["wifi"], ports: ["Ethernet"], cloud_connectivity: true,
  }, SEED_TWIN, "NEW-MUG", DEFAULT_DROP);
  expect(mug).toMatchObject({
    name: "Coffee mug", cyber: undefined, specs: { material: "glazed ceramic" },
    physical: { kind: "generic_device", connections: [], area: "filler3" },
    network: { level: 0, area: "Filler 3", conduit: null },
  });
  const findings = evaluatePlacement(SEED_TWIN, mug);
  expect(findings.paths).toEqual([]);
  expect(findings.findings).toEqual(expect.arrayContaining([expect.objectContaining({ ruleId: "FOOD-02" })]));

  const moved = atRecommendedPlacement(SEED_TWIN, mug, {
    ...officeAssessment, risks: [], mitigations: [], attack_paths: [],
  }, "passive_object");
  expect(moved).toMatchObject({
    physical: { area: "corporate_office", kind: "generic_device", connections: [] },
    network: { level: 0, area: "Corporate office", conduit: null },
  });
});

it("keeps overlays and the virtual crew office out of destination choices", () => {
  const twin = {
    ...SEED_TWIN,
    areas: SEED_TWIN.areas.filter(({ id }) => ["crew_office", "washdown", "corporate_office"].includes(id)),
  };
  expect(resolveDropPoint(twin).area).toBe("corporate_office");
  const crewDrop = assetFromProfile(pressureProfile, twin, "INST-901", { area: "crew_office", x: 190, y: 645 });
  expect(evaluatePlacement(twin, crewDrop).findings).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "PLACE-01", assetId: "INST-901" }),
  ]));
  const assessment = { ...officeAssessment, risks: [], mitigations: [], attack_paths: [] };
  for (const area of ["crew_office", "washdown"] as const) {
    expect(atRecommendedPlacement(twin, crewDrop, {
      ...assessment, physical_placement: { ...assessment.physical_placement, area },
    })).toBeNull();
  }
  expect(atRecommendedPlacement(twin, crewDrop, {
    ...assessment, placement: { ...assessment.placement, why: "HOLD: Review placement." },
  })).toBeNull();
});
