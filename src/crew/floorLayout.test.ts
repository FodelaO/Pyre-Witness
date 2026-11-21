/** Checks that speech can avoid the selected equipment card and earlier callouts. */
import { describe, expect, it } from "vitest";
import { areaById } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { avatarBounds, collides, placeCallout, placeFloorLabel, placePatrolCallout } from "./floorLayout";
import { deskPosition, deskScale } from "./officeLayout";
import { CREW_ORDER } from "./types";

describe("crew callout placement", () => {
  it("tries another direction when selection occupies the preferred location", () => {
    const viewport = { x: 0, y: 0, w: 900, h: 680 };
    const anchor = { x: 400, y: 350 };
    const card = { x: 440, y: 322, w: 220, h: 120 };
    const first = placeCallout(anchor, { w: 180, h: 60 }, viewport, [card], 1);
    expect(first).toEqual({ x: 310, y: 253, w: 180, h: 60 });
    const second = placeCallout(anchor, { w: 180, h: 60 }, viewport, [card, first!], 1);
    expect(second).toEqual({ x: 179, y: 411, w: 180, h: 60 });
  });

  it("keeps the full card inside the viewport and omits a card when there is no safe slot", () => {
    const viewport = { x: 110, y: 120, w: 300, h: 200 };
    const anchor = { x: 390, y: 310 };
    expect(placeCallout(anchor, { w: 180, h: 60 }, viewport, [], 1)).toEqual({ x: 220, y: 250, w: 180, h: 60 });
    expect(placeCallout(anchor, { w: 180, h: 60 }, viewport, [viewport], 1)).toBeNull();
  });

  it("keeps small patrol callouts above the portrait and clear of nearby equipment", () => {
    const viewport = { x: 0, y: 0, w: 600, h: 500 };
    const anchor = { x: 285, y: 300 };
    const portrait = avatarBounds(anchor, 1.2);
    const equipment = { x: 285, y: 185, w: 130, h: 145 };
    const result = placePatrolCallout(anchor, { w: 150, h: 31 }, viewport, [portrait], [equipment], 1, 1.2)!;
    expect(result.y + result.h).toBeLessThan(portrait.y);
    expect(result.x + result.w).toBeLessThan(equipment.x);
    expect(placePatrolCallout(anchor, { w: 150, h: 31 }, viewport, [], [viewport], 1, 1.2)).toBeNull();
  });

  it("fits each desk portrait and nameplate within its own seat", () => {
    const office = areaById(SEED_TWIN, "crew_office")!;
    const desks = CREW_ORDER.map((id) =>
      avatarBounds(deskPosition(id, SEED_TWIN.plant.building, office), deskScale(office)));
    for (const [index, desk] of desks.entries()) {
      expect(desk.y).toBeGreaterThan(office.bounds.y + 20);
      expect(desk.y + desk.h).toBeLessThan(office.bounds.y + office.bounds.h);
      for (const neighbor of desks.slice(index + 1)) expect(collides(desk, neighbor, 4)).toBe(false);
    }
  });

  it("moves placement and passed captions clear of the settled Architect and Inspector", () => {
    const viewport = { x: 40, y: 40, w: 1250, h: 930 };
    const anchor = { x: 260, y: 781 };
    const portraits = [avatarBounds(anchor, 1.2), avatarBounds({ x: 397, y: 781 }, 1.2)];
    const placement = { x: 72, y: 825, w: 158, h: 18 };
    const passed = { x: 278, y: 768, w: 144, h: 26 };
    const proposalLabel = placeFloorLabel(placement, anchor, viewport, portraits, 1)!;
    const checkLabel = placeFloorLabel(passed, anchor, viewport, [...portraits, proposalLabel], 1)!;
    expect(proposalLabel).not.toEqual(placement);
    expect(checkLabel).not.toEqual(passed);
    for (const portrait of portraits) {
      expect(collides(proposalLabel, portrait)).toBe(false);
      expect(collides(checkLabel, portrait)).toBe(false);
    }
    expect(collides(proposalLabel, checkLabel)).toBe(false);
    const occupiedNeighborhood = { x: anchor.x - 180, y: anchor.y - 180, w: 360, h: 360 };
    expect(placeFloorLabel(passed, anchor, viewport, [occupiedNeighborhood], 1)).toBeNull();
  });
});
