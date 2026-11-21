/** Check the integrity, floor geometry and operating state of the Line 3 seed. */
import { describe, expect, it } from "vitest";
import { FOOTPRINT } from "../../equipment/types";
import { containsPoint } from "../geometry";
import { SEED_AREAS, SEED_ASSETS, SEED_CONDUITS, SEED_ENTRY_POINTS } from "../seed";
import { MEDIA, type Asset } from "../types";

type Point = [number, number];
type Rect = { left: number; right: number; top: number; bottom: number };

const areas = new Map(SEED_AREAS.map((area) => [area.id, area]));
const assets = new Map(SEED_ASSETS.map((asset) => [asset.id, asset]));
const conduits = new Map(SEED_CONDUITS.map((conduit) => [conduit.id, conduit]));

const center = ({ physical }: Asset): Point => [physical.x, physical.y];

function rectOnFloor({ physical: { x, y, rotation, scale = 1 } }: Asset, local: Rect): Rect {
  const angle = rotation * Math.PI / 180;
  const corners = [
    [local.left, local.top], [local.right, local.top],
    [local.left, local.bottom], [local.right, local.bottom],
  ];
  const xs = corners.map(([u, v]) => x + (u * Math.cos(angle) - v * Math.sin(angle)) * scale);
  const ys = corners.map(([u, v]) => y + (u * Math.sin(angle) + v * Math.cos(angle)) * scale);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function footprint(asset: Asset): Rect {
  const { w, h } = FOOTPRINT[asset.physical.kind];
  return rectOnFloor(asset, { left: -w / 2, right: w / 2, top: -h / 2, bottom: h / 2 });
}

function tagBox(asset: Asset): Rect {
  const halfWidth = asset.id.length * 2.75;
  const { h } = FOOTPRINT[asset.physical.kind];
  return rectOnFloor(asset, { left: -halfWidth, right: halfWidth, top: h / 2 + 4, bottom: h / 2 + 14 });
}

function overlaps(a: Rect, b: Rect, clearance = 0): boolean {
  return a.left < b.right + clearance && a.right > b.left - clearance
    && a.top < b.bottom + clearance && a.bottom > b.top - clearance;
}

describe("North Beverage Facility, Line 3 seed", () => {
  it("uses unique ids for equipment, areas, conduits and entry points", () => {
    const ids = [SEED_ASSETS, SEED_AREAS, SEED_CONDUITS, SEED_ENTRY_POINTS].flatMap((items) => items.map(({ id }) => id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(SEED_ASSETS.length).toBeGreaterThanOrEqual(70);
    expect(SEED_ASSETS.length).toBeLessThanOrEqual(95);
  });

  it("resolves all pipe, cable, conduit, enforcer and area references", () => {
    for (const asset of SEED_ASSETS) {
      expect(areas.has(asset.physical.area), asset.id).toBe(true);
      for (const edge of asset.physical.connections) {
        const target = assets.get(edge.to);
        expect(target, `${asset.id} → ${edge.to}`).toBeDefined();
        if (edge.medium === "network") {
          expect(asset.cyber, asset.id).toBeDefined();
          expect(target?.cyber, edge.to).toBeDefined();
        }
      }
      if (asset.network.conduit !== null) {
        const conduit = conduits.get(asset.network.conduit);
        expect(conduit, asset.id).toBeDefined();
        expect([conduit?.from, conduit?.to], asset.id).toContain(asset.network.area);
      }
    }
    for (const { enforcedBy, id } of SEED_CONDUITS) {
      if (enforcedBy !== null) expect(assets.has(enforcedBy), id).toBe(true);
    }
    for (const entry of SEED_ENTRY_POINTS) {
      if (!entry.area) continue;
      const area = areas.get(entry.area);
      expect(area, entry.id).toBeDefined();
      expect(containsPoint(area!, entry.x, entry.y), entry.id).toBe(true);
    }
  });

  it("fits each complete equipment symbol and tag inside its assigned area", () => {
    for (const asset of SEED_ASSETS) {
      const area = areas.get(asset.physical.area)!;
      for (const { left, right, top, bottom } of [footprint(asset), tagBox(asset)]) {
        expect(containsPoint(area, left, top) && containsPoint(area, right, bottom), asset.id).toBe(true);
      }
    }
  });

  it("leaves four units between symbols and keeps asset tags clear", () => {
    const conflicts: string[] = [];
    const placed = SEED_ASSETS.map((asset) => ({ id: asset.id, body: footprint(asset), tag: tagBox(asset) }));
    for (const [index, a] of placed.entries()) {
      for (const b of placed.slice(index + 1)) {
        if (overlaps(a.body, b.body, 4) || overlaps(a.tag, b.body) || overlaps(a.body, b.tag) || overlaps(a.tag, b.tag)) {
          conflicts.push(`${a.id} / ${b.id}`);
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it("routes process pipes orthogonally without hitting unrelated symbols", () => {
    const conflicts: string[] = [];
    const placed = SEED_ASSETS.map((asset) => ({ id: asset.id, body: footprint(asset) }));
    for (const source of SEED_ASSETS) {
      for (const edge of source.physical.connections.filter(({ medium }) => MEDIA[medium].process)) {
        const pipe = `${source.id} → ${edge.to}`;
        const points = [center(source), ...(edge.via ?? []), center(assets.get(edge.to)!)];
        for (const [index, [x, y]] of points.slice(0, -1).entries()) {
          const [nextX, nextY] = points[index + 1];
          if (x !== nextX && y !== nextY) conflicts.push(`${pipe} has a diagonal segment`);
          const segment = { left: Math.min(x, nextX), right: Math.max(x, nextX), top: Math.min(y, nextY), bottom: Math.max(y, nextY) };
          for (const { id, body } of placed) {
            if (id !== source.id && id !== edge.to && overlaps(body, segment, 1)) conflicts.push(`${pipe} crosses ${id}`);
          }
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it("balances nominal RO flows, syrup mass and blend concentration", () => {
    const points = SEED_ASSETS.flatMap(({ process }) => process?.telemetry ?? []);
    const readings = new Map(points.map(({ tag, value }) => [tag, value]));
    const read = (tag: string) => readings.get(tag)!;
    expect(readings.size).toBe(points.length);

    expect(read("FT-104")).toBeCloseTo(read("FT-101") + read("FT-105"));
    expect(read("FT-101") / read("FT-104")).toBeCloseTo(0.75);
    expect(read("FT-201") + read("FT-202")).toBeCloseTo(read("FT-203"));
    expect(read("FT-203") + read("FT-303")).toBeCloseTo(read("FT-304"));
    expect(read("FT-203") * read("AT-203") / read("FT-304")).toBeCloseTo(read("DT-301"));
    expect(read("SI-501") * read("LT-405") / 1_000_000).toBeCloseTo(read("FT-403"));
  });

  it("models production with the CIP loop isolated and closure proof required", () => {
    const cip = SEED_ASSETS.flatMap(({ physical }) => physical.connections.filter(({ medium }) => medium === "cip"));
    expect(cip).toHaveLength(5);
    expect(cip.every(({ active }) => active === false)).toBe(true);
    expect(assets.get("V-311")?.safetyCritical).toBe(true);
    expect(assets.get("ZSC-311")?.process?.telemetry?.[0].value).toBe(1);
    expect(assets.get("FIL-3")?.process?.running).toBe(true);
    expect(assets.get("P-311")?.process?.running).toBe(false);
  });
});
