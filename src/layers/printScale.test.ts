/** The data-lens lettering never shrinks, and never grows past 1.6x. */
import { describe, expect, it } from "vitest";
import { printScale } from "./printScale";

describe("printScale", () => {
  it("leaves a large drawing alone", () => {
    expect(printScale(0.83)).toBe(1);
    expect(printScale(2)).toBe(1);
  });
  it("enlarges lettering on a small fitted drawing", () => {
    expect(printScale(0.55)).toBeCloseTo(1.24, 2);
    expect(printScale(0.475)).toBeCloseTo(1.43, 2);
  });
  it("is capped and safe for degenerate input", () => {
    expect(printScale(0.1)).toBe(1.6);
    expect(printScale(0)).toBe(1);
    expect(printScale(Number.NaN)).toBe(1);
  });
});
