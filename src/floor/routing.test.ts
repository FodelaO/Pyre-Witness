/** Checks elbows, authored waypoints, corner radii and labels on pipe runs. */
import { describe, expect, it } from "vitest";
import { roundedPath, routeMidpoint, routePoints } from "./routing";

describe("floor pipe routing", () => {
  it("uses a single orthogonal elbow for un-routed connections", () => {
    expect(routePoints({ x: 4, y: 5 }, { x: 70, y: 40 })).toEqual([
      { x: 4, y: 5 }, { x: 70, y: 5 }, { x: 70, y: 40 },
    ]);
  });

  it("passes through authored waypoints and repairs diagonal gaps", () => {
    const route = routePoints({ x: 2, y: 4 }, { x: 26, y: 18 }, [[14, 4], [14, 16], [25, 16]]);
    expect(route).toEqual([
      { x: 2, y: 4 }, { x: 14, y: 4 }, { x: 14, y: 16 },
      { x: 25, y: 16 }, { x: 25, y: 18 }, { x: 26, y: 18 },
    ]);
  });

  it("rounds short corners without overshooting and eliminates duplicate points", () => {
    const route = routePoints({ x: 0, y: 0 }, { x: 10, y: 4 }, [[10, 0], [10, 0]]);
    expect(roundedPath(route, 7)).toBe("M0 0 L8 0 Q10 0 10 2 L10 4");
    expect(routeMidpoint(route)).toEqual({ x: 7, y: 0 });
    expect(roundedPath(routePoints({ x: 1, y: 1 }, { x: 1, y: 1 }))).toBe("");
  });
});
