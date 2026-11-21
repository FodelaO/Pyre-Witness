/** Verifies eligible destinations, blocker order and explicit outcomes for placement ranking. */
import { describe, expect, it } from "vitest";
import { areaCenter } from "@/twin/geometry";
import type { Area, AreaAttrs, AreaId, Asset, CyberProfile, PurdueLevel, Twin } from "@/twin/types";
import { bestPlacement, evaluatePlacement, evaluateTwin, rankPlacements } from "./engine";

const ordinaryArea: AreaAttrs = {
  publicAccess: false, outdoor: false, restricted: false, washdown: false, hazard: null, foodContact: false,
};

function area(id: AreaId, kind: Area["kind"], x: number, typicalLevels: PurdueLevel[], attrs: Partial<AreaAttrs> = {}): Area {
  return {
    id, name: id.replaceAll("_", " "), kind, typicalLevels, status: "normal",
    bounds: { x, y: 0, w: 100, h: 100 }, attrs: { ...ordinaryArea, ...attrs },
  };
}

const utilities = area("utilities", "support", 0, [1]);
const production = area("filler3", "process", 500, [1], { foodContact: true });
const office = area("corporate_office", "support", 1000, [4]);
const restricted = area("control_room", "support", 300, [2], { restricted: true });
const visitor = area("visitor_corridor", "context", 200, [4], { publicAccess: true });
const excluded = [
  area("crew_office", "support", 200, [3]),
  area("washdown", "context", 600, [1], { washdown: true }),
  area("nh3_hazard", "context", 800, [1], { hazard: "NH3" }),
];

const managed: CyberProfile = {
  radios: [], ports: [], removableStorage: false, cloudConnected: false,
  defaultCredentials: false, remoteAccess: false, managed: true,
};

function twinWith(...areas: Area[]): Twin {
  return {
    plant: {
      name: "Placement fixture", line: "Test line", fictional: true,
      canvas: { w: 1200, h: 200 }, building: { x: 0, y: 0, w: 1200, h: 200 },
    },
    areas, assets: [], conduits: [], entryPoints: [],
  };
}

function assetAt(room: Area, kind: Asset["physical"]["kind"]): Asset {
  return {
    id: "CANDIDATE", name: "Placement candidate", criticality: 2, origin: "added", status: "ok",
    physical: { area: room.id, ...areaCenter(room), rotation: 0, kind, connections: [] },
    network: { level: room.typicalLevels[0], area: room.name, conduit: null },
  };
}

describe("Inspector placement ranking", () => {
  it("offers only eligible support areas for passive items and prefers the corporate office", () => {
    const mug = { ...assetAt(utilities, "generic_device"), name: "Ceramic mug", specs: { material: "ceramic" } };
    const twin = twinWith(utilities, ...excluded, restricted, production, visitor, office);
    const ranked = rankPlacements(twin, mug);

    expect(ranked).toHaveLength(3);
    expect(new Set(ranked.map(({ area }) => area))).toEqual(new Set([office.id, utilities.id, restricted.id]));
    expect(ranked[0].area).toBe(office.id);
    expect(ranked.every(({ blocking }) => !blocking.length)).toBe(true);
    expect(bestPlacement(twin, mug)).toEqual({ placement: ranked[0], compliant: true });
  });

  it("keeps actual plant rooms available for equipment and excludes the reserved office and overlays", () => {
    const gateway = { ...assetAt(utilities, "gateway"), cyber: managed };
    const ranked = rankPlacements(twinWith(utilities, production, ...excluded, office), gateway);

    expect(new Set(ranked.map(({ area }) => area))).toEqual(new Set([utilities.id, production.id, office.id]));
  });

  it.each(excluded)("applies the direct-proposal guard to $id only during placement evaluation", (room) => {
    const gateway = { ...assetAt(room, "gateway"), cyber: managed };
    const twin = twinWith(room, office);
    expect(evaluatePlacement(twin, gateway).findings).toContainEqual(expect.objectContaining({
      ruleId: "PLACE-01", assetId: gateway.id, severity: 4,
    }));
    expect(evaluateTwin({ ...twin, assets: [gateway] }).findings.some(({ ruleId }) => ruleId === "PLACE-01")).toBe(false);
  });

  it("ranks a compliant placement first even when a blocked placement has a lower plant score", () => {
    const cleanedRoom = area("packaging", "process", 0, [1], { washdown: true });
    const visitorBoundary = { ...visitor, bounds: { x: 0, y: 85, w: 100, h: 100 }, typicalLevels: [] };
    const camera = {
      ...assetAt(production, "ip_camera"),
      cyber: { ...managed, radios: ["wifi" as const], ports: ["RJ45"] },
      specs: { foodGrade: false },
    };
    const twin = twinWith(production, cleanedRoom, visitorBoundary);
    const ranked = rankPlacements(twin, camera);
    const [compliant, blocked] = ranked;

    expect(ranked).toHaveLength(2);
    expect(compliant).toMatchObject({ area: cleanedRoom.id, blocking: [] });
    expect(blocked).toMatchObject({ area: production.id, blocking: [expect.objectContaining({ ruleId: "WASH-01" })] });
    expect(compliant.score).toBeGreaterThan(blocked.score);
    expect(bestPlacement(twin, camera)).toEqual({ placement: compliant, compliant: true });
  });

  it("returns the least-risk placement with its blockers when every candidate is blocked", () => {
    const cleanedRoom = area("packaging", "process", 300, [1], { washdown: true });
    const gateway = {
      ...assetAt(cleanedRoom, "gateway"), criticality: 4 as const,
      cyber: { ...managed, defaultCredentials: true },
    };
    gateway.network.ip = "192.0.2.10";
    const twin = twinWith(cleanedRoom, office, utilities);
    const ranked = rankPlacements(twin, gateway);

    expect(ranked).toHaveLength(3);
    expect(new Set(ranked.map(({ score }) => score)).size).toBeGreaterThan(1);
    expect(ranked.every(({ blocking }) => blocking.some(({ ruleId }) => ruleId === "CRED-01"))).toBe(true);
    expect(ranked[0].score).toBe(Math.min(...ranked.map(({ score }) => score)));
    expect(bestPlacement(twin, gateway)).toEqual({ placement: ranked[0], compliant: false });
  });

  it("returns an explicit empty result when the twin has no eligible areas", () => {
    const mug = assetAt(production, "generic_device");
    const gateway = { ...assetAt(production, "gateway"), cyber: managed };
    const passiveTwin = twinWith(production, ...excluded);
    const equipmentTwin = twinWith(...excluded);

    expect(rankPlacements(passiveTwin, mug)).toEqual([]);
    expect(bestPlacement(passiveTwin, mug)).toEqual({ placement: null, compliant: false });
    expect(rankPlacements(equipmentTwin, gateway)).toEqual([]);
    expect(bestPlacement(equipmentTwin, gateway)).toEqual({ placement: null, compliant: false });
  });
});
