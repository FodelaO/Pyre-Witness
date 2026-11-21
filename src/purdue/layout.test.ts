/** Checks the pane layout, field groups, and route geometry against twin data. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import { PURDUE_LEVELS, type Asset, type AttackPath, type PurdueLevel, type Twin } from "@/twin/types";
import { linkPhysicalAreas, physicalRoomForZone } from "./areaLinks";
import { buildConduitRoutes } from "./conduits";
import { buildPurdueLayout, networkDropAt, zoneWidthAt } from "./layout";
import { buildRiskSegments } from "./pathGeometry";
import { center, networkWires } from "./routing";

function asset(id: string, area: string, level: PurdueLevel, origin: Asset["origin"] = "seed"): Asset {
  return {
    id,
    name: id,
    network: { area, level, conduit: null },
    physical: { area: "filler3", x: 0, y: 0, rotation: 0, kind: "generic_device", connections: [] },
    origin,
    criticality: 1,
    status: "ok",
  };
}

const fixture: Twin = {
  ...SEED_TWIN,
  assets: [
    asset("edge", "Office", 4),
    asset("broker", "Access", 3.5),
    asset("hmi", "Mixing", 2),
    asset("controller", "Mixing", 1),
    asset("sensor", "Mixing", 0),
    asset("valve", "Mixing", 0),
    asset("new-device", "Mixing", 0, "added"),
    asset("other", "Filling", 1),
  ],
  conduits: [
    { id: "wide", from: "Internet / Cloud", to: "Office", enforcedBy: "edge", name: "WAN", allows: [] },
    { id: "dmz", from: "Office", to: "Access", enforcedBy: "broker", name: "DMZ", allows: [] },
    { id: "flat", from: "Mixing", to: "Filling", enforcedBy: null, name: "Legacy connection", allows: [] },
  ],
  entryPoints: [
    { id: "internet", name: "Remote entry", kind: "internet", x: 0, y: 0 },
    { id: "parking_rf", name: "Radio entry", kind: "rf", x: 0, y: 0 },
  ],
};

describe("Purdue diagram layout", () => {
  it("keeps L0 and the revealed selection within the projector's short Levels pane", () => {
    const layout = buildPurdueLayout(SEED_TWIN, 431, new Set(), new Set(["CT-210"]), 550);
    expect(layout.dense).toBe(true);
    expect(layout.width).toBe(431);
    expect(layout.height).toBeLessThanOrEqual(550);
    expect(layout.bands.at(-1)?.level).toBe(0);
    expect(layout.cards.find(({ asset }) => asset.id === "CT-210")?.mini).toBe(true);
    for (const card of layout.cards) {
      const band = layout.bands.find(({ level }) => level === card.asset.network.level)!;
      expect(card.y + card.h).toBeLessThanOrEqual(band.y + band.h);
    }
  });

  it("links a physical room across network zones and an asset-free area through its entries", () => {
    const links = linkPhysicalAreas(SEED_TWIN);
    expect(links.get("control_room")?.zones).toEqual(new Set(["Site operations", "OT DMZ"]));
    expect(links.get("parking_lot")?.entries).toEqual(["parking_rf", "supply_chain"]);
    expect(physicalRoomForZone(SEED_TWIN, "Cell Utilities")?.id).toBe("utilities");
  });

  it.each([480, 520, 1200])("fits the seed horizontally in %ipx and packs each asset within its zone", (width) => {
    const layout = buildPurdueLayout(SEED_TWIN, width);
    expect(layout.width).toBe(width);
    expect(layout.bands.map(({ level }) => level)).toEqual(PURDUE_LEVELS.map(({ level }) => level));

    for (const asset of SEED_TWIN.assets) {
      const anchor = layout.anchors.get(asset.id)!;
      const zone = layout.zones.find(({ name }) => name === asset.network.area)!;
      const band = layout.bands.find(({ level }) => level === asset.network.level)!;
      expect(anchor.zone).toBe(zone.name);
      expect(anchor.x).toBeGreaterThanOrEqual(zone.x);
      expect(anchor.x + anchor.w).toBeLessThanOrEqual(zone.x + zoneWidthAt(zone, anchor.y));
      expect(anchor.y).toBeGreaterThanOrEqual(Math.max(zone.y, band.y));
      expect(anchor.y + anchor.h).toBeLessThanOrEqual(Math.min(zone.y + zone.h, band.y + band.h));
    }

    for (const [index, zone] of layout.zones.entries()) {
      for (const next of layout.zones.slice(index + 1)) {
        const sharesLevel = zone.first <= next.last && next.first <= zone.last;
        if (!sharesLevel) continue;
        const y = layout.bands[Math.max(zone.first, next.first)].y + 6;
        expect(zone.x + zoneWidthAt(zone, y) <= next.x || next.x + zoneWidthAt(next, y) <= zone.x).toBe(true);
      }
    }
  });

  it("co-locates a cell from supervision to process and puts external entries on the diagram edges", () => {
    const layout = buildPurdueLayout(fixture, 520);
    const mixing = layout.zones.find(({ name }) => name === "Mixing")!;
    expect(layout.bands[mixing.first].level).toBe(2);
    expect(layout.bands[mixing.last].level).toBe(0);
    expect(layout.anchors.get("hmi")!.y).toBeLessThan(layout.anchors.get("controller")!.y);
    expect(layout.anchors.get("controller")!.y).toBeLessThan(layout.anchors.get("sensor")!.y);
    expect(layout.anchors.get("internet")?.level).toBe(5);
    expect(layout.anchors.get("parking_rf")!.x).toBeGreaterThan(layout.diagramRight);
  });

  it("groups seed field assets, reveals linked selections, and keeps added devices visible", () => {
    const collapsed = buildPurdueLayout(fixture, 520);
    expect(collapsed.fieldGroups).toMatchObject([{ zone: "Mixing", count: 2, expanded: false }]);
    expect(collapsed.cards.some(({ asset }) => asset.id === "sensor")).toBe(false);
    expect(collapsed.anchors.get("sensor")).toEqual(collapsed.anchors.get("valve"));
    expect(collapsed.cards.some(({ asset }) => asset.id === "new-device")).toBe(true);

    const linked = buildPurdueLayout(fixture, 520, new Set(), new Set(["sensor"]));
    expect(linked.cards.find(({ asset }) => asset.id === "sensor")?.mini).toBe(true);
    expect(linked.anchors.get("sensor")).not.toEqual(linked.anchors.get("valve"));
    expect(linked.height).toBe(collapsed.height);

    const expanded = buildPurdueLayout(fixture, 520, new Set(["Mixing"]));
    expect(expanded.fieldGroups[0].expanded).toBe(true);
    expect(expanded.cards.filter(({ mini }) => mini)).toHaveLength(2);
  });

  it("resolves a level and column for drops, including a cell's empty supervisory slot", () => {
    const layout = buildPurdueLayout(fixture, 520);
    const filling = layout.zones.find(({ name }) => name === "Filling")!;
    const supervisory = layout.bands.find(({ level }) => level === 2)!;
    const site = layout.bands.find(({ level }) => level === 3)!;
    expect(networkDropAt(layout, center(layout.anchors.get("other")!), "Mixing"))
      .toMatchObject({ area: "Filling", level: 1 });
    expect(networkDropAt(layout, { x: center(filling).x, y: supervisory.y + 15 }, "Mixing"))
      .toMatchObject({ area: "Filling", level: 2 });
    expect(networkDropAt(layout, { x: center(filling).x, y: site.y + 15 }, "Mixing"))
      .toMatchObject({ area: "Mixing", level: 3 });
    expect(networkDropAt(layout, { x: 0, y: site.y + 15 }, "Mixing")).toBeUndefined();
    expect(networkDropAt(layout, { x: layout.diagramRight, y: site.y + 15 }, "Mixing")).toBeUndefined();
  });
});

describe("Conduits and risk paths", () => {
  it("uses network connections only and merges reciprocal cable declarations", () => {
    const a = asset("a", "Mixing", 1);
    const b = asset("b", "Filling", 1);
    a.physical.connections.push({ to: "b", medium: "network", active: false }, { to: "c", medium: "water" });
    b.physical.connections.push({ to: "a", medium: "network" });
    expect(networkWires([a, b])).toEqual([{ from: "b", to: "a", active: true }]);
  });

  it("draws each declared conduit on the destination outline, including the asset-free WAN band", () => {
    const layout = buildPurdueLayout(fixture, 520);
    const routes = buildConduitRoutes(layout, fixture.conduits, fixture.assets, []);
    expect(routes).toHaveLength(3);
    expect(routes[0].gate.y).toBe(layout.zones.find(({ name }) => name === "Office")?.y);
    expect(routes[1].gate.y).toBe(layout.zones.find(({ name }) => name === "Access")?.y);
    const filling = layout.zones.find(({ name }) => name === "Filling")!;
    expect([filling.x, filling.x + filling.w]).toContain(routes[2].gate.x);
  });

  it("traces given steps, keeps the selected cause, and marks DMZ and open-gate crossings", () => {
    const layout = buildPurdueLayout(fixture, 520);
    const routes = buildConduitRoutes(layout, fixture.conduits, fixture.assets, []);
    const path: AttackPath = {
      id: "one",
      title: "Synthetic path geometry fixture",
      entry: "internet",
      target: "other",
      severity: 3,
      likelihood: 2,
      source: "rules",
      impact: "Test fixture",
      steps: [
        { from: "edge", to: "controller", via: "network", note: "" },
        { from: "controller", to: "other", via: "network", technique: { id: "T0886", name: "Remote Services" }, note: "" },
      ],
    };
    const segments = buildRiskSegments(layout, routes, [path, { ...path, id: "two", causedBy: "new-device" }], new Set(["new-device"]));
    const dmz = layout.bands.find(({ level }) => level === 3.5)!;
    expect(segments).toHaveLength(2);
    expect(segments.map(({ emphasis }) => emphasis)).toEqual(["selected", "selected"]);
    expect(segments[0].breaches.map(({ y }) => y)).toEqual([dmz.y, dmz.y + dmz.h]);
    expect(segments[1].breaches).toContainEqual(routes.find(({ conduit }) => conduit.id === "flat")!.gate);
    expect(segments[1].techniques).toEqual(new Set(["T0886"]));
    expect(buildRiskSegments(layout, routes, [path], new Set(["new-device"]))[0].emphasis).toBe("muted");
    expect(buildRiskSegments(layout, routes, [path], new Set(["controller", "internet"]))[0].emphasis).toBe("selected");
  });
});
