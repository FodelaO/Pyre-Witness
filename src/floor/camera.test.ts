/** Verifies that floor coordinates stay stable through fitting, wheel zoom and pinch. */
import { describe, expect, it } from "vitest";
import { clientToStage, FIT, stageToWorld, viewportFor, worldToLocal, zoomBetween } from "./camera";

describe("plant viewport coordinates", () => {
  it("accounts for SVG letterboxing when finding the world location under the cursor", () => {
    const viewport = viewportFor({ left: 30, top: 50, width: 800, height: 700 }, { w: 1600, h: 1000 });
    const center = clientToStage({ x: 430, y: 400 }, viewport);
    expect(center).toEqual({ x: 800, y: 500 });
    expect(worldToLocal(center, FIT, viewport)).toEqual({ x: 400, y: 350 });
  });

  it("keeps the point under a stationary cursor, even at the zoom limit", () => {
    const current = { x: 100, y: -45, scale: 1.5 };
    const cursor = { x: 400, y: 555 };
    const next = zoomBetween(current, cursor, cursor, 10);
    expect(next.scale).toBe(6);
    expect(stageToWorld(cursor, next)).toEqual(stageToWorld(cursor, current));
  });

  it("keeps a moving pinch midpoint anchored to the original world point", () => {
    const start = { x: 400, y: 500 };
    const end = { x: 360, y: 550 };
    const next = zoomBetween(FIT, start, end, 2);
    expect(stageToWorld(end, next)).toEqual(start);
  });
});
