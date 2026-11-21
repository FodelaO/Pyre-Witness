/** Checks legibility at floor and split-view scales. */
import { describe, expect, it } from "vitest";
import { printScale } from "./printScale";

describe("printScale", () => {
  it("leaves a large drawing alone", () => {
    expect(printScale(0.9)).toBe(1);
    expect(printScale(2)).toBe(1);
  });
  it.each([0.475, 0.3, 0.26])("keeps text readable at %f px per drawing unit", (scale) => {
    expect(10.2 * scale * printScale(scale)).toBeGreaterThanOrEqual(9);
  });
  it("is safe for degenerate input", () => {
    expect(printScale(0)).toBe(1);
    expect(printScale(Number.NaN)).toBe(1);
  });
});
