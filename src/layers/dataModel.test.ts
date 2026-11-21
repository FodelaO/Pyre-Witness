/** Checks seed-level lens derivations and guards the cable, inventory, and advisory boundaries. */
import { describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { inventoryForTwin } from "@/watch/inventory";
import type { ThreatItem, WatchReport } from "@/watch/types";
import { getDataModel } from "./dataModel";

function withCable(from: string, to: string, via?: [number, number][]): Twin {
  return {
    ...SEED_TWIN,
    assets: SEED_TWIN.assets.map((asset) => asset.id === from ? {
      ...asset, physical: { ...asset.physical, connections: [...asset.physical.connections, { to, medium: "network", via }] },
    } : asset),
  };
}

describe("pipeline lens data model", () => {
  const lens = getDataModel(SEED_TWIN);
  const flow = (from: string, to: string) => lens.dataFlows.find((entry) => entry.from === from && entry.to === to);

  it("memoizes by the twin identity and derives the nine correctly padded zone hulls", () => {
    expect(getDataModel(SEED_TWIN)).toBe(lens);
    const readingOnly: Twin = {
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset.id === "LT-101" ? {
        ...asset, process: { ...asset.process, telemetry: asset.process?.telemetry?.map((point) => ({ ...point, value: 50 })) },
      } : asset),
    };
    expect(getDataModel(readingOnly)).toBe(lens);
    expect(lens.zoneHulls.map(({ name }) => name)).toEqual([
      "Cell Water", "Cell Syrup", "Cell Blend", "Cell F3", "Cell Pack", "Cell Utilities",
      "Site operations", "OT DMZ", "Enterprise",
    ]);
    for (const { name, points } of lens.zoneHulls) {
      const bounds = SEED_TWIN.assets.filter(({ network }) => network.area === name)
        .map(({ physical: { x, y } }) => ({ x, y }));
      expect(Math.min(...points.map(({ x }) => x))).toBeLessThan(Math.min(...bounds.map(({ x }) => x)));
      expect(Math.max(...points.map(({ y }) => y))).toBeGreaterThan(Math.max(...bounds.map(({ y }) => y)));
    }
  });

  it("prefers explicit process taps, matches controllers by cell, and joins hover through to enterprise", () => {
    expect(lens.signalTaps).toEqual(expect.arrayContaining([
      { processId: "TK-101", deviceId: "LT-101", controllerId: "PLC-WT", role: "sensor" },
      { processId: "RO-101", deviceId: "PT-102", controllerId: "PLC-WT", role: "sensor" },
      { processId: "TK-203", deviceId: "P-203", controllerId: "PLC-SY", role: "actuator" },
      { processId: "V-311", deviceId: "ZSC-311", controllerId: "PLC-BL", role: "sensor" },
      { processId: "TK-311", deviceId: "CT-210", controllerId: "PLC-BL", role: "sensor" },
    ]));
    expect(lens.signalTaps.some(({ deviceId }) => deviceId === "GT-401")).toBe(false);
    expect(flow("GT-401", "PLC-UT")?.medium).toBe("hardwired");
    const chain = lens.chainOf("FIL-3");
    const milestones = ["FIL-3", "PT-401", "PLC-F3", "SCADA-03", "HIST-03", "HIST-DMZ", "ERP-01"];
    expect(milestones.map((id) => chain.indexOf(id))).toEqual(
      milestones.map((id) => chain.indexOf(id)).filter((index) => index >= 0).sort((a, b) => a - b),
    );
    expect(lens.chainOf("PLC-F3")).toContain("FIL-3");
    expect(lens.chainOf("unknown")).toEqual([]);
  });

  it("routes every network leg through active declared cables and uses documented protocols", () => {
    expect(lens.networkLinks).toHaveLength(41);
    const knownLinks = new Set(lens.networkLinks.filter(({ active }) => active).map(({ id }) => id));
    for (const { routeIds } of lens.dataFlows.filter(({ medium }) => medium === "network")) {
      for (let i = 1; i < routeIds.length; i++) {
        expect(knownLinks.has(JSON.stringify([routeIds[i - 1], routeIds[i]].sort()))).toBe(true);
      }
    }
    expect(flow("HMI-F3", "PLC-F3")).toMatchObject({
      protocol: "EtherNet/IP", routeIds: ["HMI-F3", "SW-F3", "PLC-F3"],
    });
    expect(flow("PLC-F3", "HMI-F3")?.route).toEqual(flow("HMI-F3", "PLC-F3")?.route.toReversed());
    expect(flow("PLC-WT", "SCADA-03")).toMatchObject({
      protocol: "OPC UA", routeIds: ["PLC-WT", "SW-WT", "SW-OT", "SCADA-03"],
      crossings: [expect.objectContaining({ conduitId: "C-OPS-WATER", enforced: true })],
    });
    expect(flow("HIST-03", "HIST-DMZ")).toMatchObject({
      routeIds: ["HIST-03", "SW-OT", "FW-DMZ", "SW-DMZ", "HIST-DMZ"],
      crossings: [expect.objectContaining({ conduitId: "C-DMZ-OPS", enforced: true })],
    });
    expect(flow("HIST-DMZ", "ERP-01")).toMatchObject({
      protocol: "HTTPS", crossings: [expect.objectContaining({ conduitId: "C-ENT-DMZ", enforced: true })],
    });
    expect(lens.networkLinks.find(({ from, to }) => [from, to].includes("SW-F3") && [from, to].includes("SW-PK"))
      ?.crossings).toEqual([expect.objectContaining({ conduitId: "C-F3-PACK", enforced: false })]);
    expect(flow("FW-EDGE", "internet")).toMatchObject({ medium: "external", protocol: "HTTPS" });
    expect(flow("vendor_remote", "GW-PK")).toMatchObject({ medium: "external", protocol: "LTE" });
    expect(flow("GW-PK", "PAL-3")).toMatchObject({ medium: "network", routeIds: ["GW-PK", "PAL-3"] });
  });

  it("re-routes along a new shorter cable with actual waypoints and ignores a disabled leg", () => {
    const shortened = getDataModel(withCable("HMI-F3", "PLC-F3", [[753, 593], [707, 585]]));
    expect(shortened.dataFlows.find(({ from, to }) => from === "HMI-F3" && to === "PLC-F3")).toMatchObject({
      routeIds: ["HMI-F3", "PLC-F3"], route: expect.arrayContaining([{ x: 753, y: 593 }, { x: 707, y: 585 }]),
    });
    const seed = SEED_TWIN.assets.find(({ id }) => id === "HMI-F3")!;
    const disconnected = getDataModel({
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset === seed ? {
        ...asset, physical: {
          ...asset.physical,
          connections: seed.physical.connections.map((connection) => ({ ...connection, active: false })),
        },
      } : asset),
    });
    expect(disconnected.networkLinks.find(({ from }) => from === "HMI-F3")?.active).toBe(false);
    expect(disconnected.dataFlows.some(({ from, to }) => [from, to].includes("HMI-F3"))).toBe(false);
    const offline = getDataModel({
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset === seed ? { ...asset, status: "offline" } : asset),
    });
    expect(offline.networkLinks.find(({ from }) => from === "HMI-F3")?.active).toBe(true);
    expect(offline.dataFlows.some(({ from, to }) => [from, to].includes("HMI-F3"))).toBe(false);
  });

  it("labels assumed software and adds only grounded, current watch matches to cyber findings", () => {
    const assetId = "HMI-F3";
    const findings = evaluateTwin(SEED_TWIN).findings;
    expect(lens.softwareOf(assetId)).toMatchObject({ assumed: true, product: "PanelView Plus 7", version: "12.105" });
    expect(lens.softwareOf("OPS-01")).toMatchObject({ assumed: true, os: "Managed operator OS" });
    expect(lens.softwareOf("TK-101")).toBeUndefined();

    const base = lens.vulnerabilityOf(assetId, findings, [undefined]);
    expect(base.count).toBeGreaterThan(0);
    expect(base.advisories).toEqual([]);
    expect(base.findings.every(({ ruleId }) => findings.some((finding) => finding.ruleId === ruleId && finding.kind === "cyber"))).toBe(true);

    const threat: ThreatItem = {
      id: "test-advisory", source: "cisa-ics", title: "Fixture advisory", cves: [], published: "2026-11-21",
      url: "https://example.test/advisory", summary: "Test-only evidence",
    };
    const inventory = inventoryForTwin(SEED_TWIN).find((entry) => entry.assetId === assetId)!;
    const report: WatchReport = {
      mode: "local", date: "2026-11-21", runId: "fixture", finishedAt: 1, headline: "Fixture", baselineScore: 0,
      recommendations: [], sources: [], stages: [], warnings: [],
      candidates: [{
        threat, inventory, score: 10, reasons: [], versionMentioned: true, disposition: "supported",
        decisions: { applicability: 1, exposure: 1, severity: 4 },
      }],
      items: [{ threat, affectedAssetIds: [assetId], technique: null, why: "Fixture", riskDelta: null, triage: "supported" }],
    };
    expect(lens.vulnerabilityOf(assetId, findings, [report, report])).toMatchObject({
      count: base.count + 1, worst: 5, advisories: ["test-advisory"],
    });
    expect(lens.vulnerabilityOf(assetId, findings, [{ ...report, items: [] }])).toEqual(base);
    expect(lens.vulnerabilityOf(assetId, findings, [{ ...report, candidates: [{
      ...report.candidates[0], inventory: { ...inventory, version: "old-version" },
    }] }])).toEqual(base);
    expect(lens.vulnerabilityOf("PLC-F3", findings, [report]).advisories).toEqual([]);
  });
});
