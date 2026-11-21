/** Verifies that installed safeguards lower only the risks they can control. */
import { describe, expect, it } from "vitest";
import { applyEffect } from "@/twin/effects";
import type { Area, AreaAttrs, Asset, RiskReport, Twin } from "@/twin/types";
import { evaluateTwin } from "./engine";

const areaAttrs: AreaAttrs = {
  publicAccess: false, outdoor: false, restricted: false, washdown: false, hazard: null, foodContact: false,
};
const cell: Area = {
  id: "filler3", name: "Test cell", kind: "process", status: "normal",
  bounds: { x: 0, y: 0, w: 300, h: 260 }, attrs: areaAttrs, typicalLevels: [0, 1, 2],
};
const corridor: Area = {
  id: "visitor_corridor", name: "Test corridor", kind: "context", status: "normal",
  bounds: { x: 0, y: 270, w: 300, h: 100 }, attrs: { ...areaAttrs, publicAccess: true }, typicalLevels: [4],
};
const panel: Asset = {
  id: "PANEL", name: "Test panel", status: "ok", criticality: 4, origin: "seed",
  physical: { area: cell.id, x: 90, y: 250, rotation: 0, kind: "hmi", connections: [] },
  network: { level: 2, area: "Test cell", conduit: null },
  cyber: {
    radios: ["wifi"], ports: ["USB-A", "RJ45"], removableStorage: true,
    cloudConnected: false, defaultCredentials: false, remoteAccess: false, managed: true,
  },
};
const valve: Asset = {
  id: "VALVE", name: "Test safety valve", status: "ok", criticality: 5, safetyCritical: true, origin: "seed",
  physical: { area: cell.id, x: 150, y: 100, rotation: 0, kind: "valve", connections: [{ to: panel.id, medium: "network" }] },
  network: { level: 1, area: panel.network.area, conduit: null },
};

function fixture(...assets: Asset[]): Twin {
  return {
    plant: {
      name: "Safeguard fixture", line: "Test line", fictional: true, canvas: { w: 400, h: 400 },
      building: { x: 0, y: 0, w: 320, h: 380 },
    },
    areas: [cell, corridor],
    assets,
    conduits: [],
    entryPoints: [
      { id: "visitor", name: "Visitor", kind: "physical", x: 90, y: 285, area: corridor.id },
      { id: "parking_rf", name: "Nearby RF", kind: "rf", x: 90, y: 290, reach: 65 },
    ],
  };
}

function finding(report: RiskReport, ruleId: string, assetId: string) {
  return report.findings.find((item) => item.ruleId === ruleId && item.assetId === assetId);
}

describe("Independent Inspector safeguards", () => {
  it.each(["port-lock", "locked-cabinet"] as const)("%s lowers port risk while retaining independent RF reachability", (protection) => {
    const twin = fixture(panel);
    const before = evaluateTwin(twin);
    const after = evaluateTwin(applyEffect(twin, { type: "add_protection", assetId: panel.id, protection }));
    expect(finding(before, "USB-01", panel.id)?.severity).toBe(4);
    expect(finding(before, "PHYS-01", panel.id)?.severity).toBe(3);
    expect(before.paths.map(({ steps }) => steps[0].via)).toEqual(expect.arrayContaining(["physical", "usb", "rf"]));

    expect(finding(after, "USB-01", panel.id)).toMatchObject({ severity: 2, detail: expect.stringContaining("safeguard") });
    expect(finding(after, "PHYS-01", panel.id)).toMatchObject({ severity: 2, detail: expect.stringContaining("safeguard") });
    expect(after.paths.map(({ steps }) => steps[0].via)).toEqual(["rf"]);
    expect(after.score).toBeLessThan(before.score);
  });

  it("keeps the removable-media finding for a portable USB drive", () => {
    const drive: Asset = {
      ...panel, id: "MEDIA", name: "Portable storage",
      cyber: { ...panel.cyber!, ports: [], radios: [], removableStorage: true },
      physical: { ...panel.physical, kind: "usb_drive" },
    };
    const twin = fixture(drive);
    const updated = applyEffect(twin, { type: "add_protection", assetId: drive.id, protection: "port-lock" });
    expect(finding(evaluateTwin(updated), "USB-01", drive.id)?.severity).toBe(4);
  });

  it("limits downstream safety consequences of a network arrival across USB and RF origins", () => {
    const twin = fixture(panel, valve);
    const before = evaluateTwin(twin);
    const protectedTwin = applyEffect(twin, { type: "add_protection", assetId: valve.id, protection: "hardwired-interlock" });
    const after = evaluateTwin(protectedTwin);
    const downstream = after.paths.filter((item) => item.target === valve.id);

    expect(finding(before, "SAFE-01", valve.id)?.severity).toBe(5);
    expect(before.paths.some((path) => path.target === valve.id && path.ruleIds?.includes("SAFE-01"))).toBe(true);
    expect(finding(after, "SAFE-01", valve.id)).toBeUndefined();
    expect(downstream.map(({ steps }) => steps[0].via)).toEqual(expect.arrayContaining(["usb", "rf"]));
    for (const path of downstream) {
      expect(path.steps.at(-1)?.via).toBe("network");
      expect(path.severity).toBe(4);
      expect(path.ruleIds).not.toContain("SAFE-01");
      expect(path.impact).toMatch(/hardwired[- ]interlock/i);
    }
    expect(after.score).toBeLessThan(before.score);
  });

  it("still reports safety risk when local physical access reaches the valve directly", () => {
    const accessibleValve: Asset = {
      ...valve,
      physical: { ...valve.physical, x: 140, y: 250 },
      cyber: { ...panel.cyber!, radios: [] },
    };
    const protectedTwin = applyEffect(fixture(panel, accessibleValve), {
      type: "add_protection", assetId: valve.id, protection: "hardwired-interlock",
    });
    const report = evaluateTwin(protectedTwin);
    expect(finding(report, "SAFE-01", valve.id)?.severity).toBe(5);
    expect(report.paths.some(({ severity, target, steps, ruleIds }) =>
      target === valve.id && severity === 5 && steps.length === 1 && steps[0].via === "physical"
      && ruleIds?.includes("SAFE-01"),
    )).toBe(true);
  });

  it("limits direct network-mediated arrivals at the interlocked valve", () => {
    const wirelessValve: Asset = {
      ...valve,
      physical: { ...valve.physical, x: 90, y: 240, connections: [] },
      cyber: { ...panel.cyber!, ports: [], removableStorage: false },
    };
    const twin = fixture(wirelessValve);
    expect(finding(evaluateTwin(twin), "SAFE-01", valve.id)?.severity).toBe(5);

    const after = evaluateTwin(applyEffect(twin, {
      type: "add_protection", assetId: valve.id, protection: "hardwired-interlock",
    }));
    expect(finding(after, "SAFE-01", valve.id)).toBeUndefined();
    expect(after.paths).toHaveLength(1);
    expect(after.paths[0]).toMatchObject({ target: valve.id, severity: 4, ruleIds: ["RF-01"] });
  });

  it("does not credit unrelated or unrecognized tags as safety controls", () => {
    const controller: Asset = { ...valve, physical: { ...valve.physical, kind: "plc_cabinet" } };
    const protectedController = applyEffect(fixture(panel, controller), {
      type: "add_protection", assetId: controller.id, protection: "hardwired-interlock",
    });
    const unrecognized = applyEffect(fixture(panel, valve), {
      type: "add_protection", assetId: valve.id, protection: "hardwired-interlock-requested",
    });
    expect(finding(evaluateTwin(protectedController), "SAFE-01", controller.id)?.severity).toBe(5);
    expect(finding(evaluateTwin(unrecognized), "SAFE-01", valve.id)?.severity).toBe(5);
  });
});
