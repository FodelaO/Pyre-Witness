/** Verifies walk geometry, standing slots and timed badge separation on the actual floor. */
import { describe, expect, it } from "vitest";
import { areaById, areaCenter, containsPoint, distance, type Point } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { BADGE_SEPARATION, planWalk } from "./walk";
import { timeWalk, walkPosition, walksConflict } from "./walkTiming";

const twin = SEED_TWIN;
const office = areaById(twin, "crew_office")!;
const filler = areaById(twin, "filler3")!;
const packaging = areaById(twin, "packaging")!;

describe("crew walking", () => {
  it("stays inside the building and crosses room edges at orthogonal entrances", () => {
    const start = { x: 88, y: 632 };
    const target = { x: 1480, y: 645 };
    const route = planWalk(twin, start, [{ point: target, area: packaging.id }]);
    expect(route?.[0]).toEqual(start);
    expect(route?.at(-1)).toEqual(target);
    expect(route!.length).toBeGreaterThan(2);
    const { x, y, w, h } = twin.plant.building;
    for (const [index, end] of route!.entries()) {
      expect(end.x).toBeGreaterThanOrEqual(x + 13);
      expect(end.x).toBeLessThanOrEqual(x + w - 13);
      expect(end.y).toBeGreaterThanOrEqual(y + 13);
      expect(end.y).toBeLessThanOrEqual(y + h - 13);
      const start = route![index - 1];
      if (!start) continue;
      expect(start.x === end.x || start.y === end.y).toBe(true);
      for (const { bounds: b } of twin.areas.filter((area) => area.kind !== "context")) {
        if (start.y === end.y && end.y > b.y && end.y < b.y + b.h) {
          for (const wall of [b.x, b.x + b.w]) {
            if (wall >= Math.min(start.x, end.x) && wall <= Math.max(start.x, end.x)) expect(end.y).toBe(b.y + b.h / 2);
          }
        }
        if (start.x === end.x && end.x > b.x && end.x < b.x + b.w) {
          for (const wall of [b.y, b.y + b.h]) {
            if (wall >= Math.min(start.y, end.y) && wall <= Math.max(start.y, end.y)) expect(end.x).toBe(b.x + b.w / 2);
          }
        }
      }
    }
  });

  it("projects an exterior stop inside the outer wall", () => {
    const entry = twin.entryPoints.find(({ id }) => id === "parking_rf")!;
    const route = planWalk(twin, areaCenter(office), [{ point: entry, area: entry.area }]);
    expect(route?.at(-1)).toEqual({ x: entry.x, y: twin.plant.building.y + twin.plant.building.h - 18 });
  });

  it("gives four avatars separate slots for a pin near a room corner", () => {
    const slots: Point[] = [];
    const stop = { point: { x: filler.bounds.x + 3, y: filler.bounds.y + filler.bounds.h - 3 }, area: filler.id };
    for (let index = 0; index < 4; index += 1) {
      const route = planWalk(twin, areaCenter(office), [stop], slots);
      expect(route).toBeDefined();
      const slot = route!.at(-1)!;
      expect(containsPoint(filler, slot.x, slot.y)).toBe(true);
      for (const neighbor of slots) expect(distance(slot, neighbor)).toBeGreaterThanOrEqual(BADGE_SEPARATION);
      slots.push(slot);
    }
  });

  it("keeps constant speed through turns, caps long walks and teleports for reduced motion", () => {
    const route = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    const walk = timeWalk(route, 0);
    expect(walk.end.at).toBe(2000);
    expect(walkPosition(walk, 500)).toEqual({ x: 50, y: 0 });
    expect(walkPosition(walk, 1500)).toEqual({ x: 100, y: 50 });
    expect(timeWalk([{ x: 0, y: 0 }, { x: 600, y: 0 }], 0).end.at).toBe(2500);
    expect(walkPosition(timeWalk(route, 0, true), 0)).toEqual(route.at(-1));
  });

  it("detects crossings during motion and allows the same paths at safe times", () => {
    const horizontal = timeWalk([{ x: 0, y: 0 }, { x: 200, y: 0 }], 0);
    const vertical = [{ x: 100, y: -100 }, { x: 100, y: 100 }];
    expect(walksConflict(horizontal, timeWalk(vertical, 0), 0)).toBe(true);
    expect(walksConflict(horizontal, timeWalk(vertical, 2000), 0)).toBe(false);
  });
});
