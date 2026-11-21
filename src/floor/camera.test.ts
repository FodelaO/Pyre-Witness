/** Verifies that floor coordinates stay stable through fitting, wheel zoom and pinch. */
import { describe, expect, it } from "vitest";
import { clientToStage, FIT, stageToWorld, viewportFor, worldToLocal, zoomBetween } from "./camera";
import { drawingBounds, fitDrawing } from "./fit";
import { SEED_TWIN } from "@/twin/seed";

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

  it.each([610, 1068, 1548])("fits the building and parking clear of the floating controls in a %ipx pane", (width) => {
    const viewport = viewportFor({ left: 0, top: 44, width, height: 856 }, SEED_TWIN.plant.canvas);
    const bounds = drawingBounds(SEED_TWIN.plant, SEED_TWIN.areas, SEED_TWIN.entryPoints);
    const overlays = [
      { left: 16, right: 350, top: 60, bottom: 191 },
      { left: 16, right: 322, top: 500, bottom: 884 },
    ];
    const fit = fitDrawing(viewport, bounds, overlays);
    const top = worldToLocal(bounds, fit, viewport);
    const bottom = worldToLocal({ x: bounds.x + bounds.w, y: bounds.y + bounds.h }, fit, viewport);
    expect(top.x).toBeGreaterThanOrEqual(11.99);
    expect(top.y).toBeGreaterThanOrEqual(11.99);
    expect(bottom.x).toBeLessThanOrEqual(width - 11.99);
    expect(bottom.y).toBeLessThanOrEqual(viewport.height - 11.99);
    expect(bounds.y + bounds.h).toBe(980);
    for (const overlay of overlays) {
      expect(
        bottom.x <= overlay.left || top.x >= overlay.right
        || bottom.y + viewport.top <= overlay.top || top.y + viewport.top >= overlay.bottom,
      ).toBe(true);
    }
  });
});
