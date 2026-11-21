/** PERT (Beta, lambda = 4) three-point estimates: analytic moments, inverse-CDF sampler, seeded PRNG. */
import type { ThreePoint } from "./economics";

/** Standard PERT weight of the most likely value. Beta shapes sum to lambda + 2. */
export const PERT_LAMBDA = 4;

/** Beta(alpha, beta) on [low, high] with its mode at the most likely value. */
export function pertShape([low, mode, high]: ThreePoint): { alpha: number; beta: number } {
  const width = high - low;
  const position = Math.min(1, Math.max(0, (mode - low) / width));
  return { alpha: 1 + PERT_LAMBDA * position, beta: 1 + PERT_LAMBDA * (1 - position) };
}

export function pertMean([low, mode, high]: ThreePoint): number {
  return (low + PERT_LAMBDA * mode + high) / (PERT_LAMBDA + 2);
}

export function pertVariance(points: ThreePoint): number {
  const mean = pertMean(points);
  return (mean - points[0]) * (points[2] - mean) / (PERT_LAMBDA + 3);
}

const GRID = 2048;
const STEPS = 8192;
const tables = new Map<number, Float64Array>();

/** Standard Beta quantiles at u = k / STEPS, from a Simpson's-rule CDF normalised to end at exactly 1. */
function quantiles(alpha: number): Float64Array {
  const key = Math.round(alpha * 1e6);
  const cached = tables.get(key);
  if (cached) return cached;
  const a = alpha - 1;
  const b = PERT_LAMBDA + 1 - alpha;
  const density = (x: number) => (a === 0 ? 1 : x ** a) * (b === 0 ? 1 : (1 - x) ** b);
  const cdf = new Float64Array(GRID + 1);
  const step = 1 / GRID;
  let left = density(0);
  for (let i = 0; i < GRID; i++) {
    const right = density((i + 1) * step);
    cdf[i + 1] = cdf[i] + (left + 4 * density((i + 0.5) * step) + right) * step / 6;
    left = right;
  }
  const total = cdf[GRID];
  for (let i = 1; i <= GRID; i++) cdf[i] /= total;
  cdf[GRID] = 1;

  const table = new Float64Array(STEPS + 1);
  let cell = 0;
  for (let k = 1; k < STEPS; k++) {
    const u = k / STEPS;
    while (cell < GRID - 1 && cdf[cell + 1] <= u) cell++;
    const span = cdf[cell + 1] - cdf[cell];
    table[k] = (cell + (span > 0 ? (u - cdf[cell]) / span : 0)) / GRID;
  }
  table[STEPS] = 1;
  tables.set(key, table);
  return table;
}

/** Inverse-CDF sampler for one estimate: maps a uniform u in [0, 1) to a value in [low, high]. */
export function pertSampler(points: ThreePoint): (u: number) => number {
  const [low, , high] = points;
  if (!(high > low)) return () => low;
  const table = quantiles(pertShape(points).alpha);
  const width = high - low;
  return (u) => {
    const position = Math.min(1, Math.max(0, u)) * STEPS;
    const index = Math.min(STEPS - 1, Math.floor(position));
    return low + width * (table[index] + (table[index + 1] - table[index]) * (position - index));
  };
}

export function pertQuantile(points: ThreePoint, u: number): number {
  return pertSampler(points)(u);
}

/** FNV-1a hash of the scenario id seeding mulberry32 (period 2^32, 32 uniform bits per draw). */
export function seededRandom(id: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < id.length; i++) state = Math.imul(state ^ id.charCodeAt(i), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
