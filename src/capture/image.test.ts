/** Verify the resize calculation without browser canvas or image fixtures. */
import { describe, expect, it } from "vitest";
import { fitImage } from "./image";

describe("fitImage", () => {
  it.each([
    [4032, 3024, 1600, 1200],
    [3024, 4032, 1200, 1600],
    [2600, 2600, 1600, 1600],
    [640, 480, 640, 480],
    [1600, 437, 1600, 437],
    [4000, 1333, 1600, 533],
    [1, 8000, 1, 1600],
  ])("fits %d × %d to %d × %d", (width, height, expectedWidth, expectedHeight) => {
    expect(fitImage(width, height)).toEqual({ width: expectedWidth, height: expectedHeight });
  });

  it.each([[0, 0], [-1, 800], [NaN, 800], [800, Infinity]])(
    "rejects unusable dimensions (%d × %d)",
    (width, height) => expect(() => fitImage(width, height)).toThrow(),
  );
});
