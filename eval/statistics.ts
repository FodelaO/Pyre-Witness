/** Wilson score intervals and deterministic item-paired bootstrap intervals. */
const Z_95 = 1.959963984540054;
const BOOTSTRAP_SAMPLES = 2_000;

export type Interval = [number, number];
export interface Count { numerator: number; n: number }
export interface Proportion extends Count { value: number | null; interval: Interval | null }
export interface PairedDifference { n: number; value: number | null; interval: Interval | null }
export type Pair<T> = { baseline: T; system: T };

export function wilson(numerator: number, n: number): Interval | null {
  if (n === 0) return null;
  const p = numerator / n;
  const square = Z_95 ** 2;
  const denominator = 1 + square / n;
  const center = (p + square / (2 * n)) / denominator;
  const halfWidth = Z_95 / denominator * Math.sqrt((p * (1 - p) + square / (4 * n)) / n);
  return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];
}

export function combineCounts(counts: readonly Count[]): Count {
  return counts.reduce((total, count) => ({ numerator: total.numerator + count.numerator, n: total.n + count.n }), { numerator: 0, n: 0 });
}

const identity = (value: number) => value;
export const jaccardToF1 = (value: number) => 2 * value / (1 + value);

export function proportion(counts: readonly Count[], map = identity): Proportion {
  const count = combineCounts(counts);
  const interval = wilson(count.numerator, count.n);
  return {
    ...count,
    value: count.n ? map(count.numerator / count.n) : null,
    interval: interval ? [map(interval[0]), map(interval[1])] : null,
  };
}

export function quantile(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

export function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

export function pairedBootstrap<T>(pairs: readonly Pair<T>[], statistic: (sample: T[]) => number | null): PairedDifference {
  const n = pairs.length;
  function difference(sample: readonly Pair<T>[]) {
    const baseline = statistic(sample.map((pair) => pair.baseline));
    const system = statistic(sample.map((pair) => pair.system));
    return baseline === null || system === null ? null : system - baseline;
  }
  const value = difference(pairs);
  if (!n || value === null) return { n, value: null, interval: null };

  let seed = 0x6eb17a23;
  function randomIndex() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return Math.floor((seed >>> 0) / 2 ** 32 * n);
  }

  const bootstrap: number[] = [];
  for (let iteration = 0; iteration < BOOTSTRAP_SAMPLES; iteration += 1) {
    const delta = difference(Array.from({ length: n }, () => pairs[randomIndex()]));
    if (delta !== null) bootstrap.push(delta);
  }
  const lower = quantile(bootstrap, 0.025);
  const upper = quantile(bootstrap, 0.975);
  return { n, value, interval: lower === null || upper === null ? null : [lower, upper] };
}
