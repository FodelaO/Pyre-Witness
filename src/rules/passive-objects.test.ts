/** Exercises captured passive items and disconnected equipment against the plant twin. */
import { describe, expect, it } from "vitest";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import type { DeviceProfile } from "@/pipeline/types";
import { applyEffect } from "@/twin/effects";
import { areaCenter } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { AreaId, Asset } from "@/twin/types";
import { evaluatePlacement, evaluateTwin, explainRule, rankPlacements } from "./engine";

const seed = SEED_TWIN;
const hmi = seed.assets.find(({ id }) => id === "HMI-F3")!;

function room(area: AreaId) {
  return seed.areas.find(({ id }) => id === area)!;
}

function capture(deviceType: string, material: string, area: AreaId, profileOverrides: Partial<DeviceProfile> = {}): Asset {
  const profile: DeviceProfile = {
    device_type: deviceType, category: "other", object_class: "passive_object", physical_kind: "generic_device",
    vendor: null, model: null, radios: [], ports: [], storage: null,
    default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null, power: null,
    capacity_or_size: null, material, food_grade: null, hazardous_area_rating: null, ip_rating: null,
    evidence: [], unknowns: [], confidence: 1,
    ...profileOverrides,
  };
  return assetFromProfile(profile, seed, "TEST-CAPTURE", { area, ...areaCenter(room(area)) });
}

function mugAtHmi(): Asset {
  const mug = capture("Coffee mug", "glazed ceramic", "filler3");
  return { ...mug, physical: { ...mug.physical, x: hmi.physical.x - 12, y: hmi.physical.y } };
}

describe("Passive capture in the Inspector", () => {
  it("reports a ceramic mug beside HMI-F3 as a food risk with zero cyber findings and paths", () => {
    const mug = mugAtHmi();
    expect(mug.cyber).toBeUndefined();
    expect(mug.physical.connections).toHaveLength(0);
    const result = evaluatePlacement(seed, mug);
    expect(result.paths).toEqual([]);
    expect(result.findings.map(({ ruleId }) => ruleId)).toEqual(["FOOD-02", "FOOD-03"]);
    expect(result.findings.every(({ kind, technique }) => kind === "compliance" && !technique)).toBe(true);
    expect(evaluateTwin({ ...seed, assets: [...seed.assets, mug] }).paths).toEqual(evaluateTwin(seed).paths);
  });

  it("does not use placeholder network fields as attack evidence or as evidence of an ignition source", () => {
    const mug = mugAtHmi();
    const unlinked: Asset = {
      ...mug, criticality: 5, safetyCritical: true,
      network: { ...hmi.network, level: 4, ip: "192.0.2.44", protocols: ["HTTPS"] },
    };
    expect(evaluatePlacement(seed, unlinked).paths).toHaveLength(0);
    expect(evaluatePlacement(seed, unlinked).findings.map(({ ruleId }) => ruleId)).toEqual(["FOOD-02", "FOOD-03"]);

    const inHazard = {
      ...unlinked, physical: { ...unlinked.physical, area: "utilities" as const, ...areaCenter(room("nh3_hazard")) },
    };
    expect(evaluatePlacement(seed, inHazard)).toEqual({ paths: [], findings: [] });
  });

  it("keeps a profileless control target reachable when the opposite endpoint declares an active network link", () => {
    const target: Asset = {
      ...hmi, id: "TEST-LINK-TARGET", criticality: 4, cyber: undefined,
      physical: { ...hmi.physical, kind: "instrument", connections: [] },
      network: { ...hmi.network, level: 1, ip: undefined, protocols: undefined, conduit: null },
    };
    const linked = {
      ...seed, assets: seed.assets.map((asset) => asset === hmi ? {
        ...asset, physical: { ...asset.physical, connections: [...asset.physical.connections, { to: target.id, medium: "network" as const }] },
      } : asset),
    };
    expect(evaluatePlacement(seed, target).paths).toHaveLength(0);
    expect(evaluatePlacement(linked, target).paths.some((path) => path.target === target.id && path.steps.at(-1)?.via === "network")).toBe(true);
  });

  it.each(["soda-lime glass", "ceramic", "brittle plastic", "solid wood", "corrugated cardboard", "polyester fabric"])(
    "screens %s inside the open-product area", (material) => {
      const asset = capture("Captured item", material, "filler3", { food_grade: true });
      const findings = evaluatePlacement(seed, asset).findings;
      expect(findings.find(({ ruleId }) => ruleId === "FOOD-02")).toMatchObject({ severity: 4, references: expect.arrayContaining(["FDA 21 CFR 117.35"]) });
    },
  );

  it("uses actual food-contact overlays, and treats generic plastic and embedded fiberglass as distinct from brittle material", () => {
    const blend = room("blending");
    const layer = { ...room("washdown"), bounds: blend.bounds, attrs: { ...blend.attrs, foodContact: true } };
    const twin = { ...seed, areas: [{ ...blend, attrs: { ...blend.attrs, foodContact: false } }, layer] };
    const glass = capture("Glass bottle", "glass", "blending");
    expect(evaluatePlacement(twin, glass).findings.some(({ ruleId }) => ruleId === "FOOD-02")).toBe(true);
    for (const material of ["plastic", "fiberglass-reinforced nylon", "stainless 316L", "glass-free composite"]) {
      const asset = { ...glass, specs: { ...glass.specs, material } };
      expect(evaluatePlacement(twin, asset).findings.some(({ ruleId }) => ruleId === "FOOD-02")).toBe(false);
    }
  });

  it("ranks an office first and reduces non-production-item severity away from open product", () => {
    const mug = mugAtHmi();
    const packaging = capture("Backpack", "fabric", "packaging");
    const knownProcessAsset = { ...packaging, process: { running: true } };
    expect(evaluatePlacement(seed, packaging).findings).toMatchObject([{ ruleId: "FOOD-03", severity: 2 }]);
    expect(evaluatePlacement(seed, knownProcessAsset).findings).toEqual([]);
    expect(explainRule("FOOD-03")?.description).toContain("office or designated support area");
    expect(explainRule("FOOD-03")?.references).toContain("FDA 21 CFR Part 117");

    const placed = { ...seed, assets: [...seed.assets, mug] };
    const [best] = rankPlacements(placed, mug);
    expect(best).toMatchObject({ area: "corporate_office", blocking: [] });
    expect(best.score).toBeLessThan(evaluateTwin(placed).score);
    const moved = applyEffect(placed, {
      type: "move_asset", assetId: mug.id, area: best.area, level: best.level, networkArea: best.networkArea,
      conduit: null, ...areaCenter(room(best.area)),
    });
    expect(evaluateTwin(moved).score).toBe(best.score);
  });

  it("screens captured electrical equipment without a cyber profile and credits a recognizable hazard rating", () => {
    const drill = capture("Corded drill", "steel and nylon", "nh3_hazard", {
      object_class: "electrical_equipment", power: "AC mains", ip_rating: "IP66",
    });
    expect(drill.cyber).toBeUndefined();
    expect(evaluatePlacement(seed, drill).findings).toMatchObject([{ ruleId: "HAZ-01", severity: 5 }]);
    const rated = { ...drill, specs: { ...drill.specs, hazardRating: "Class I Div 2" } };
    expect(evaluatePlacement(seed, rated)).toEqual({ findings: [], paths: [] });
  });

  it("uses an explicit incoming power connection as physical evidence without admitting a cyber route", () => {
    const enclosure = capture("Unlabelled enclosure", "aluminum", "nh3_hazard");
    const anchor = seed.assets.find(({ physical }) => physical.kind === "chiller_compressor")!;
    const wired = {
      ...seed, assets: seed.assets.map((asset) => asset === anchor ? {
        ...asset, physical: { ...asset.physical, connections: [...asset.physical.connections, { to: enclosure.id, medium: "power" as const }] },
      } : asset),
    };
    expect(evaluatePlacement(seed, enclosure)).toEqual({ findings: [], paths: [] });
    const result = evaluatePlacement(wired, enclosure);
    expect(result.paths).toEqual([]);
    expect(result.findings).toMatchObject([{ ruleId: "HAZ-01", kind: "compliance" }]);
  });

  it.each([
    ["Disposable lighter", "steel and butane", "lighter"],
    ["Aerosol can", "aluminum", "aerosol"],
    ["Handheld fan", "plastic, lithium-ion battery", "battery-powered item"],
  ])("names %s in the ammonia overlay without manufacturing a cyber risk", (deviceType, material, label) => {
    const ignition = capture(deviceType, material, "nh3_hazard");
    const result = evaluatePlacement(seed, { ...ignition, physical: { ...ignition.physical, area: "utilities" } });
    expect(result.paths).toEqual([]);
    expect(result.findings).toMatchObject([{ ruleId: "HAZ-02", kind: "physical", detail: expect.stringContaining(label) }]);
  });

  it("asks for compatibility review in a CO₂ area without assuming a gas-area equipment classification", () => {
    const twin = { ...seed, areas: seed.areas.map((area) => area.id === "nh3_hazard" ? {
      ...area, name: "CO₂ equipment area", attrs: { ...area.attrs, hazard: "CO2" as const },
    } : area) };
    const fan = capture("Corded fan", "steel", "nh3_hazard", { hazardous_area_rating: "Class I Div 2" });
    expect(evaluatePlacement(twin, fan).findings).toMatchObject([{
      ruleId: "HAZ-02", severity: 3, detail: expect.stringContaining("compatibility"),
    }]);
  });

  it("keeps explicit non-food-grade evidence while skipping enclosure requirements for an inert item", () => {
    const item = capture("Ceramic mug", "ceramic", "filler3", { food_grade: false });
    const washdown = evaluatePlacement(seed, item).findings.find(({ ruleId }) => ruleId === "WASH-01");
    expect(washdown?.detail).toContain("non-food-grade");
    expect(washdown?.detail).not.toMatch(/IP66|IP69|316L/);
  });
});
