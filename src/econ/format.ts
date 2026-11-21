/** Keeps the numeric and rendered versions of rounded economic factors in sync. */
/** One-line method statement under every expanded calculation, identical to src/econ/README.md. */
export const METHOD_FOOTER = "FAIR · Monte Carlo 10,000 draws · fixed seed · assumed plant economics (simulated plant)";

export function roundUsd(value: number): number {
  const amount = Math.abs(value);
  return Math.sign(value) * (amount < 1 ? Math.round(amount * 100) / 100 : Number(amount.toPrecision(2)));
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const amount = Math.abs(value);
  if (amount > 0 && amount < 0.01) return `${sign}<$0.01`;
  const rounded = roundUsd(amount);
  if (rounded >= 1e12) return `${sign}$${rounded / 1e12}T`;
  if (rounded >= 1e9) return `${sign}$${rounded / 1e9}B`;
  if (rounded >= 1e6) return `${sign}$${rounded / 1e6}M`;
  if (rounded >= 1e3) return `${sign}$${rounded / 1e3}k`;
  return `${sign}$${rounded}`;
}

export function roundHours(value: number): number {
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
}

/** Cent units keep sub-dollar amounts readable without a two-place decimal. */
export function formatFormulaUsd(value: number): string {
  const rounded = roundUsd(value);
  if (rounded === 0 || Math.abs(rounded) >= 1) return formatUsd(rounded);
  return `${rounded < 0 ? "−" : ""}${Math.round(Math.abs(rounded) * 100)}¢`;
}
