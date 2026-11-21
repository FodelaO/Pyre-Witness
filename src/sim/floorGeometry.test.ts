/** Checks bounded replay marks, pipe waypoints and gaps in stage geometry. */
import { describe, expect, it } from "vitest";
import { nodePosition } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { runScenario } from "./engine";
import { causticRoute, floorNode, isFloorPoint, markerAnchor, markerPosition, replayRoute, stageRoute } from "./floorGeometry";
import { scenarioLens } from "./scenarioLens";
import { ALL_SCENARIOS } from "./scenarios";
import type { SimStage } from "./types";

const twin = SEED_TWIN;
const cipPipe = ["V-311", "FIL-3"];
const blendPipe = ["BL-301", "CC-301"];

describe("simulation overlay geometry", () => {
  it("keeps the CIP overlay on the actual branch and locates the shield independently", () => {
    const run = runScenario("cip", twin);
    const target = markerAnchor(twin, "ZSC-311");
    const expectedPipe = causticRoute(twin, cipPipe);
    expect(expectedPipe).toContainEqual({ x: 917, y: 371 });
    expect(expectedPipe).toContainEqual({ x: 530, y: 371 });
    expect(expectedPipe[0]).toEqual(nodePosition(twin, "V-311"));
    expect(expectedPipe.at(-1)).toEqual(nodePosition(twin, "FIL-3"));
    expect(stageRoute(twin, run.stages[0].where, "material")).toEqual([]);

    const result = replayRoute(twin, run.stages, run.stages.length - 1, 1, "material");
    expect(result).toEqual({ trails: [expectedPipe], pulse: undefined, hold: { id: "ZSC-311", point: target } });
  });

  it("breaks at unknown, off-canvas and non-finite nodes and pipe waypoints", () => {
    const known = [causticRoute(twin, cipPipe), causticRoute(twin, blendPipe)];
    expect(stageRoute(twin, [...cipPipe, "unknown", ...blendPipe], "material")).toEqual(known);
    expect(stageRoute(twin, [...cipPipe, "blending", ...blendPipe], "material")).toEqual(known);
    expect(markerPosition(twin, "unknown")).toBeUndefined();

    const moved: Twin = { ...twin, assets: twin.assets.map((asset) => asset.id === "FIL-3"
      ? { ...asset, physical: { ...asset.physical, x: twin.plant.canvas.w + 1 } } : asset) };
    expect(floorNode(moved, "FIL-3")).toBeUndefined();
    expect(markerAnchor(moved, "FIL-3")).toBeUndefined();
    expect(causticRoute(moved, cipPipe)).toEqual([]);
    expect(stageRoute(moved, [...cipPipe, ...blendPipe], "material")).toEqual([known[1]]);

    const invalidVia: Twin = { ...twin, assets: twin.assets.map((asset) => asset.id === "V-311"
      ? { ...asset, physical: { ...asset.physical, connections: [{ to: "FIL-3", medium: "cip", via: [[Infinity, 4]] }] } } : asset) };
    expect(stageRoute(invalidVia, cipPipe, "material")).toEqual([]);
    expect(causticRoute(invalidVia, cipPipe)).toEqual([]);

    const invalidStage: SimStage = { t: 1, title: "Invalid test location", where: ["unknown", "FIL-3"], outcome: "blocked" };
    const earlier: SimStage = { t: 0, title: "In-bounds test location", where: blendPipe, outcome: "advanced" };
    expect(replayRoute(moved, [earlier, invalidStage], 1, 1, "material")).toEqual({
      trails: [known[1]], pulse: undefined, hold: undefined,
    });
  });

  it.each(Object.values(ALL_SCENARIOS).map(({ id }) => id))("keeps %s overlay points within the canvas", (id) => {
    const run = runScenario(id, twin);
    const defined = ALL_SCENARIOS[id].stages(twin).map((stage): SimStage => ({ ...stage, outcome: "advanced" }));
    for (const stages of [run.stages, defined]) {
      for (const [index, stage] of stages.entries()) {
        for (const progress of [0, 0.45, 1]) {
          const { trails, pulse, hold } = replayRoute(twin, stages, index, progress, scenarioLens[id]);
          const points = [...trails.flat(), pulse, hold?.point, ...stage.where.map((key) => markerAnchor(twin, key))];
          expect(points.every((point) => !point || isFloorPoint(twin, point))).toBe(true);
        }
      }
    }
  });
});
