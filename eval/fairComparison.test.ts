/** Checks the exact paired test on symmetric, tied and discordant outcomes. */
import { expect, test } from "vitest";
import { exactMcNemar } from "./fairComparison";

test("uses the two-sided binomial tail of discordant pairs", () => {
  expect(exactMcNemar(0, 0)).toBe(1);
  expect(exactMcNemar(3, 4)).toBe(1);
  expect(exactMcNemar(3, 10)).toBe(0.09228515625);
  expect(exactMcNemar(10, 3)).toBe(exactMcNemar(3, 10));
  expect(exactMcNemar(0, 5)).toBe(0.0625);
});
