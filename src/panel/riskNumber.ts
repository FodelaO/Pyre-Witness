/** Keeps plant scores and signed risk changes consistent across readouts. */
export function riskScore(value: number): number {
  return Math.round(value);
}

export function displayedRiskChange(score: number, baseline: number): number {
  return riskScore(score) - riskScore(baseline);
}

export function riskDelta(value: number): string {
  const points = riskScore(Math.abs(value));
  return points === 0 ? "0" : `${value < 0 ? "−" : "+"}${points}`;
}
