/** Verifies continuous layer weights and discrete lens commits. */
import { afterEach, describe, expect, it } from "vitest";
import { lensModeAt, lensWeights, useLensStore } from "./lensStore";

afterEach(() => useLensStore.getState().setMode("material"));

describe("pipeline lens", () => {
  it.each([
    [0, 1, 0, 0],
    [0.25, 1, 0.5, 0.5],
    [0.5, 1, 1, 1],
    [0.75, 0.5, 1, 0.5],
    [1, 0, 1, 0],
  ])("cross-fades at %s", (position, material, data, connectors) => {
    expect(lensWeights(position)).toEqual({ material, data, connectors });
  });

  it("keeps the committed mode during a drag and snaps to the nearest stop on commit", () => {
    const { setMode, setPosition } = useLensStore.getState();
    setPosition(0.62);
    expect(useLensStore.getState()).toMatchObject({ mode: "material", position: 0.62 });
    setMode(lensModeAt(useLensStore.getState().position));
    expect(useLensStore.getState()).toMatchObject({ mode: "both", position: 0.5 });
  });

  it("clamps finite positions and falls back safely for invalid input", () => {
    const { setPosition } = useLensStore.getState();
    setPosition(9);
    expect(useLensStore.getState().position).toBe(1);
    setPosition(-1);
    expect(useLensStore.getState().position).toBe(0);
    expect(lensModeAt(NaN)).toBe("material");
  });
});
