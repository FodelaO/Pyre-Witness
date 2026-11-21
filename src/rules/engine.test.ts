/** Exercises Inspector findings, path evidence, placements and risk against the plant twin. */
import { describe, expect, it } from "vitest";
import { techniqueById } from "@/data/attack-ics";
import { applyEffect } from "@/twin/effects";
import { areaCenter } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { Area, Asset, CyberProfile, PurdueLevel, Twin } from "@/twin/types";
import { evaluatePlacement, evaluateTwin, explainRule, rankPlacements } from "./engine";
import { RULES } from "./registry";

const managed: CyberProfile = {
  radios: [], ports: [], removableStorage: false, defaultCredentials: false,
  cloudConnected: false, remoteAccess: false, managed: true,
};

function areaWith(test: (area: Area) => boolean): Area {
  const area = SEED_TWIN.areas.find(test);
  if (!area) throw new Error("Missing plant area for rule fixture");
  return area;
}

const filler = areaWith((area) => area.kind === "process" && area.attrs.washdown);
const office = areaWith((area) => !area.attrs.publicAccess && area.typicalLevels.includes(4));
const hazard = areaWith((area) => area.attrs.hazard === "NH3");
const panel = SEED_TWIN.assets.find((asset) => asset.physical.area === filler.id && asset.physical.kind === "hmi")!;

function device(id: string, kind: Asset["physical"]["kind"], area: Area, level: PurdueLevel, zone = area.name): Asset {
  return {
    id, name: id, origin: "added", status: "ok", criticality: 2,
    physical: { area: area.id, ...areaCenter(area), rotation: 0, kind, connections: [] },
    network: { level, area: zone, conduit: null },
    cyber: { ...managed },
  };
}

function wifiCamera(): Asset {
  const camera = device("TEST-CAMERA", "ip_camera", filler, 2, panel.network.area);
  return {
    ...camera,
    physical: {
      ...camera.physical, x: panel.physical.x - 12, y: panel.physical.y,
      connections: [{ to: panel.id, medium: "network" }],
    },
    cyber: { ...managed, radios: ["wifi"] },
    specs: { ipRating: "IP69K", material: "316L", foodGrade: true },
  };
}

function add(twin: Twin, ...assets: Asset[]): Twin {
  return { ...twin, assets: [...twin.assets, ...assets] };
}

function ids(asset: Asset, twin = SEED_TWIN): string[] {
  return evaluatePlacement(twin, asset).findings.filter((finding) => finding.assetId === asset.id).map((finding) => finding.ruleId);
}

describe("Inspector against the plant twin", () => {
  it("produces a stable, nonzero seed report with documented USB reachability and safety consequences", () => {
    const { computedAt, ...before } = evaluateTwin(SEED_TWIN);
    const { computedAt: again, ...after } = evaluateTwin(SEED_TWIN);
    expect(after).toEqual(before);
    expect(computedAt).toBeLessThanOrEqual(again);
    expect(before.score).toBeGreaterThan(0);
    expect(before.score).toBeLessThan(100);
    expect(before.findings.some(({ ruleId }) => ruleId === "ZONE-02")).toBe(true);
    expect(before.paths.some((path) => path.steps[0].via === "usb" && path.steps[0].to === panel.id)).toBe(true);
    expect(before.findings.some((finding) => finding.ruleId === "SAFE-01" && finding.severity === 5)).toBe(true);
    expect(before.byArea[filler.id]).toBeGreaterThan(0);
  });

  it("reuses the report and timestamp for the same snapshot and reevaluates a new snapshot", () => {
    const twin = add(SEED_TWIN, wifiCamera());
    const cached = evaluateTwin(twin);
    const duplicate = evaluateTwin({ ...twin });
    expect(duplicate).not.toBe(cached);
    expect(JSON.stringify({ ...duplicate, computedAt: cached.computedAt })).toBe(JSON.stringify(cached));
    expect(evaluateTwin(twin)).toBe(cached);
    const changed = applyEffect(twin, { type: "disable_radio", assetId: "TEST-CAMERA", radio: "wifi" });
    expect(evaluateTwin(changed).score).toBeLessThan(cached.score);
    expect(evaluateTwin(twin)).toBe(cached);
  });

  it("links an exposed Wi-Fi camera to the filler, raises risk, and clears its RF paths when the radio is disabled", () => {
    const camera = wifiCamera();
    const twin = add(SEED_TWIN, camera);
    const placement = evaluatePlacement(SEED_TWIN, camera);
    const rf = placement.paths.find((path) => path.target === panel.id && path.steps[0].via === "rf");
    expect(rf).toMatchObject({ causedBy: camera.id, source: "rules", ruleIds: expect.arrayContaining(["RF-01"]) });
    expect(rf?.title).toContain(` -> ${camera.id} -> ${panel.id}`);
    expect(rf?.steps[0].technique?.id).toBe("T0860");
    expect(placement.findings.map(({ ruleId }) => ruleId)).toContain("CAM-01");
    expect(evaluatePlacement(twin, camera)).toEqual(placement);
    const risk = evaluateTwin(twin);
    expect(risk.score).toBeGreaterThan(evaluateTwin(SEED_TWIN).score);
    const mitigated = evaluateTwin(applyEffect(twin, { type: "disable_radio", assetId: camera.id, radio: "wifi" }));
    expect(mitigated.score).toBeLessThan(risk.score);
    expect(mitigated.paths.some((path) => path.steps[0].to === camera.id && path.steps[0].via === "rf")).toBe(false);
  });

  it("does not extend a corporate camera into OT and identifies a safer placement", () => {
    const camera = wifiCamera();
    const corporate = {
      ...device(camera.id, "ip_camera", office, 4), cyber: camera.cyber, specs: camera.specs,
    };
    expect(evaluatePlacement(SEED_TWIN, corporate)).toEqual({ findings: [], paths: [] });

    // The ranked case keeps the same fixture and declared cable during the move.
    const twin = add(SEED_TWIN, camera);
    const ranked = rankPlacements(twin, camera);
    expect(ranked.length).toBeGreaterThan(1);
    const best = ranked[0];
    expect(best.score).toBeLessThan(evaluateTwin(twin).score);
    expect(ranked.map(({ score }) => score)).toEqual(ranked.map(({ score }) => score).sort((a, b) => a - b));
    const bestArea = areaWith((area) => area.id === best.area);
    const moved = applyEffect(twin, {
      type: "move_asset", assetId: camera.id, area: best.area, level: best.level, networkArea: best.networkArea,
      conduit: null, ...(best.area !== camera.physical.area ? areaCenter(bestArea) : {}),
    });
    expect(evaluateTwin(moved).score).toBe(best.score);
  });

  it("requires a modeled association for network reach and respects disabled links", () => {
    const base = { ...SEED_TWIN, assets: [panel], conduits: [] };
    const wired = wifiCamera();
    const wifiOnly = { ...wired, physical: { ...wired.physical, connections: [] } };
    expect(evaluatePlacement(base, wifiOnly).paths.some((path) => path.target === panel.id && path.steps[0].via === "rf")).toBe(true);
    const unassociated = { ...wifiOnly, network: { ...wifiOnly.network, area: "Independent camera zone" } };
    expect(ids(unassociated, base)).toContain("RF-01");
    expect(evaluatePlacement(base, unassociated).paths).toHaveLength(0);

    const disconnected = {
      ...panel,
      physical: { ...panel.physical, connections: [{ to: wired.id, medium: "network", active: false }] } as Asset["physical"],
    };
    expect(evaluatePlacement({ ...base, assets: [disconnected] }, wired).paths).toHaveLength(0);
  });

  it("checks removable media, unmanaged endpoints and the level expected in a room", () => {
    const usb = device("TEST-USB", "usb_drive", filler, 2);
    expect(ids(usb)).toContain("USB-01");
    const laptop = device("TEST-LAPTOP", "laptop", filler, 1, panel.network.area);
    laptop.network.ip = "192.0.2.12";
    laptop.cyber = { ...managed, managed: false, defaultCredentials: true };
    expect(ids(laptop)).toEqual(expect.arrayContaining(["TRANS-01", "MGMT-01", "CRED-01"]));
    expect(ids({ ...laptop, physical: { ...laptop.physical, area: office.id, ...areaCenter(office) } })).toContain("ZONE-03");
    const disconnected = { ...laptop, network: { ...laptop.network, ip: undefined } };
    expect(ids(disconnected)).not.toContain("TRANS-01");
  });

  it("checks NH3 suitability, washdown ingress protection and non-food-grade equipment", () => {
    const gateway = device("TEST-NH3", "gateway", hazard, 1);
    gateway.specs = { hazardRating: "IP67" };
    expect(ids(gateway)).toContain("HAZ-01");
    expect(ids({ ...gateway, specs: { hazardRating: "Class I Div 2" } })).not.toContain("HAZ-01");

    const sensor = device("TEST-SENSOR", "instrument", filler, 0);
    sensor.specs = { ipRating: "IP67", material: "316L", foodGrade: true };
    expect(ids(sensor)).toContain("WASH-01");
    const protectedSensor = { ...sensor, specs: { ...sensor.specs, ipRating: "IP69K" } };
    expect(ids(protectedSensor)).not.toContain("WASH-01");
    expect(ids({ ...protectedSensor, specs: { ...protectedSensor.specs, foodGrade: false } })).toContain("WASH-01");
  });

  it("checks the ammonia overlay for a gateway whose declared home is Utilities", () => {
    const utilities = areaWith((area) => area.id === "utilities");
    const gateway = device("TEST-OVERLAY", "gateway", utilities, 1);
    const inside = { ...gateway, physical: { ...gateway.physical, ...areaCenter(hazard) } };
    expect(ids(inside)).toContain("HAZ-01");
    const outside = { ...inside, physical: { ...inside.physical, x: utilities.bounds.x + 20 } };
    expect(ids(outside)).not.toContain("HAZ-01");
  });

  it("combines washdown, food and public evidence across overlapping areas", () => {
    const utilities = areaWith((area) => area.id === "utilities");
    const gateway = device("TEST-MERGED", "gateway", utilities, 1);
    gateway.physical = { ...gateway.physical, ...areaCenter(hazard) };
    gateway.cyber = { ...managed, radios: ["wifi"], ports: ["USB-A"] };
    gateway.specs = { ipRating: "IP69K", material: "316L", foodGrade: false };
    const publicOverlay: Area = { ...hazard, id: "visitor_corridor", attrs: { ...hazard.attrs, hazard: null, publicAccess: true } };
    const washdownOverlay: Area = { ...hazard, id: "washdown", attrs: { ...hazard.attrs, hazard: null, washdown: true, foodContact: true } };
    const twin = { ...SEED_TWIN, assets: [], areas: [utilities, hazard, publicOverlay, washdownOverlay], entryPoints: [] };
    const findings = evaluatePlacement(twin, gateway).findings;
    expect(findings.map(({ ruleId }) => ruleId)).toEqual(expect.arrayContaining([
      "HAZ-01", "WASH-01", "PHYS-01", "USB-01", "RF-01",
    ]));
    expect(findings.find(({ ruleId }) => ruleId === "USB-01")?.severity).toBe(4);
    expect(findings.find(({ ruleId }) => ruleId === "WASH-01")?.detail).toContain("non-food-grade");
    const unrated = { ...gateway, specs: { ...gateway.specs, foodGrade: true, ipRating: "IP54" } };
    expect(ids(unrated, twin)).toContain("WASH-01");
  });

  it("reports external connectivity below the DMZ until an enforced DMZ route is modeled", () => {
    const gateway = device("TEST-CLOUD", "gateway", filler, 2, panel.network.area);
    gateway.cyber = { ...managed, cloudConnected: true, remoteAccess: true };
    gateway.physical.connections = [{ to: panel.id, medium: "network" }];
    const exposed = evaluatePlacement(SEED_TWIN, gateway);
    expect(exposed.findings.map(({ ruleId }) => ruleId)).toContain("ZONE-01");
    expect(exposed.paths.some((path) => path.steps[0].via === "internet" && path.steps[0].to === gateway.id)).toBe(true);
    expect(exposed.paths.some((path) => path.steps[0].via === "remote" && path.steps[0].to === gateway.id)).toBe(true);
    const dmz = SEED_TWIN.assets.find((asset) => asset.network.level === 3.5 && asset.physical.kind === "firewall")!;
    const controlled = {
      ...SEED_TWIN,
      conduits: [...SEED_TWIN.conduits, {
        id: "TEST-DMZ-CONDUIT", name: "Approved broker route", from: gateway.network.area, to: dmz.network.area,
        enforcedBy: dmz.id, allows: ["Approved gateway telemetry only"],
      }],
    };
    gateway.network.conduit = "TEST-DMZ-CONDUIT";
    expect(ids(gateway, controlled)).not.toContain("ZONE-01");
    expect(evaluatePlacement(controlled, gateway).paths.some((path) => path.steps[0].to === gateway.id)).toBe(false);
  });

  it("stops lateral paths when an existing flat conduit is enforced", () => {
    const conduit = SEED_TWIN.conduits.find((candidate) => candidate.enforcedBy === null)!;
    const boundary = SEED_TWIN.assets.find((asset) => asset.physical.kind === "firewall")!;
    const before = evaluateTwin(SEED_TWIN);
    const fixed = applyEffect(SEED_TWIN, { type: "enforce_conduit", conduitId: conduit.id, enforcedBy: boundary.id, allows: [] });
    const after = evaluateTwin(fixed);
    expect(after.findings.filter((finding) => finding.ruleId === "ZONE-02")).toHaveLength(0);
    expect(after.paths.length).toBeLessThan(before.paths.length);
    expect(after.score).toBeLessThan(before.score);
  });

  it("explains each rule and uses only canonical MITRE ICS techniques in findings and steps", () => {
    expect(RULES).toHaveLength(13);
    for (const rule of RULES) {
      expect(explainRule(rule.id.toLowerCase())).toMatchObject({ title: rule.title, references: rule.references });
    }
    expect(explainRule("unknown")).toBeUndefined();
    const report = evaluateTwin(add(SEED_TWIN, wifiCamera()));
    const techniques = [
      ...report.findings.flatMap((finding) => finding.technique ? [finding.technique] : []),
      ...report.paths.flatMap((path) => path.steps.map((step) => step.technique)),
    ];
    for (const technique of techniques) {
      expect(technique).toBeDefined();
      expect(techniqueById(technique!.id)?.name).toBe(technique!.name);
    }
    expect(new Set(report.paths.map((path) => path.id)).size).toBe(report.paths.length);
    expect(report.paths.every((path) => path.steps.length <= 6)).toBe(true);
  });

  it("groups overlapping routes on a dense 120-asset twin", () => {
    const assets = Array.from({ length: 120 }, (_, i): Asset => ({
      ...panel, id: `PERF-${i}`, origin: "added", criticality: 4,
      physical: { ...panel.physical, connections: [] },
      network: { ...panel.network, ip: `192.0.2.${i + 1}` },
      cyber: { ...managed, ports: ["USB-A"], radios: ["wifi"] },
    }));
    const twin = { ...SEED_TWIN, assets, conduits: [] };
    expect(evaluateTwin(twin).paths).toHaveLength(240);
  });

  it("evaluates fresh seed drag frames within a 1.5 ms warmed median budget", () => {
    function timeFrame(step: number) {
      const assets = SEED_TWIN.assets.map((asset) => asset !== panel ? asset : {
        ...asset, physical: { ...asset.physical, x: asset.physical.x + (step % 16) / 10 },
      });
      const start = performance.now();
      evaluateTwin({ ...SEED_TWIN, assets });
      return performance.now() - start;
    }

    for (let i = 0; i < 40; i++) timeFrame(i);
    const median = (samples: number[]) => samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    const batchMedians = Array.from({ length: 7 }, () => median(Array.from({ length: 15 }, (_, i) => timeFrame(i))));
    expect(median(batchMedians)).toBeLessThan(1.5);
  });
});
