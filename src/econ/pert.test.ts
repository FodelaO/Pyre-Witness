/** Checks the PERT sampler against its analytic moments and the seeded generator for uniformity. */
import { describe, expect, it } from "vitest";
import type { ThreePoint } from "./economics";
import { PERT_LAMBDA, pertMean, pertQuantile, pertSampler, pertShape, pertVariance, seededRandom } from "./pert";

const CASES: ThreePoint[] = [
  [2, 12, 40], [0, 0.05, 0.3], [175_000, 950_000, 4_500_000], [0.65, 0.9, 1], [0, 5, 10], [3, 3, 9], [1, 7, 7],
];

describe("PERT three-point estimate", () => {
  it("uses the standard lambda = 4 Beta shapes with the mode at the most likely value", () => {
    expect(PERT_LAMBDA).toBe(4);
    for (const points of CASES) {
      const [low, mode, high] = points;
      const { alpha, beta } = pertShape(points);
      expect(alpha + beta).toBeCloseTo(6, 12);
      expect(alpha).toBeGreaterThanOrEqual(1);
      expect(beta).toBeGreaterThanOrEqual(1);
      // Beta mode (alpha - 1) / (alpha + beta - 2) and mean alpha / (alpha + beta), rescaled.
      expect(low + (high - low) * (alpha - 1) / (alpha + beta - 2)).toBeCloseTo(mode, 9);
      expect(low + (high - low) * alpha / (alpha + beta)).toBeCloseTo(pertMean(points), 9);
      const betaVariance = (high - low) ** 2 * alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
      expect(betaVariance / pertVariance(points)).toBeCloseTo(1, 9);
    }
    expect(pertMean([2, 12, 40])).toBe(15);
  });

  it("reproduces the analytic mean and variance from 10,000 seeded draws", () => {
    for (const points of CASES) {
      const random = seededRandom(JSON.stringify(points));
      const sampler = pertSampler(points);
      const draws = Array.from({ length: 10_000 }, () => sampler(random()));
      const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
      const variance = draws.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (draws.length - 1);
      const deviation = Math.sqrt(pertVariance(points));
      // Four standard errors of the mean, and 6% on the variance.
      expect(Math.abs(mean - pertMean(points))).toBeLessThan(4 * deviation / Math.sqrt(draws.length));
      expect(variance / pertVariance(points)).toBeGreaterThan(0.94);
      expect(variance / pertVariance(points)).toBeLessThan(1.06);
      expect(Math.min(...draws)).toBeGreaterThanOrEqual(points[0]);
      expect(Math.max(...draws)).toBeLessThanOrEqual(points[2]);
    }
  });

  it("has a monotone inverse CDF that matches exact quantiles of the closed-form cases", () => {
    // Symmetric PERT: the median is the mode. Mode at the low bound: Beta(1, 5), F(x) = 1 - (1 - x)^5.
    expect(pertQuantile([0, 5, 10], 0.5)).toBeCloseTo(5, 5);
    for (const u of [0.1, 0.5, 0.9, 0.99]) {
      expect(pertQuantile([0, 0, 1], u)).toBeCloseTo(1 - (1 - u) ** (1 / 5), 5);
      expect(pertQuantile([0, 1, 1], u)).toBeCloseTo(u ** (1 / 5), 5);
    }
    const sampler = pertSampler([2, 12, 40]);
    const curve = Array.from({ length: 1000 }, (_, i) => sampler(i / 1000));
    expect(curve.every((value, i) => i === 0 || value >= curve[i - 1])).toBe(true);
    expect(pertQuantile([7, 7, 7], 0.3)).toBe(7);
    expect(pertQuantile([2, 12, 40], 0)).toBe(2);
  });
});

describe("seeded generator", () => {
  it("is stable per id, differs between ids, and is uniform on [0, 1)", () => {
    const first = seededRandom("scenario-a");
    const again = seededRandom("scenario-a");
    const other = seededRandom("scenario-b");
    const values = Array.from({ length: 5 }, () => first());
    expect(Array.from({ length: 5 }, () => again())).toEqual(values);
    expect(Array.from({ length: 5 }, () => other())).not.toEqual(values);

    const random = seededRandom("uniformity");
    const bins = new Array<number>(20).fill(0);
    let sum = 0;
    const count = 200_000;
    let lowest = 1;
    let highest = 0;
    for (let i = 0; i < count; i++) {
      const value = random();
      lowest = Math.min(lowest, value);
      highest = Math.max(highest, value);
      bins[Math.floor(value * bins.length)]++;
      sum += value;
    }
    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThan(1);
    expect(sum / count).toBeCloseTo(0.5, 2);
    const expected = count / bins.length;
    const chiSquare = bins.reduce((total, observed) => total + (observed - expected) ** 2 / expected, 0);
    // 19 degrees of freedom: 43.8 is the 99.9th percentile.
    expect(chiSquare).toBeLessThan(43.8);
  });
});
