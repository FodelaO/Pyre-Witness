/** Debounces threshold episodes and raises each sustained cause once until it clears. */
import type { EscalationCause, Thresholds } from "./types";

export const DEFAULT_THRESHOLDS: Thresholds = { loss: 100_000, risk: 60 };
export const BASELINE_INCREASE = 8;
export const ESCALATION_DEBOUNCE_MS = 500;

export interface PolicyState {
  episodes: ReadonlyMap<string, { since: number; raised: boolean }>;
}

export const initialPolicy: PolicyState = { episodes: new Map() };

export function thresholdCrossed(cause: EscalationCause, thresholds: Thresholds): boolean {
  if (cause.kind === "risk") {
    return cause.score >= thresholds.risk || cause.score - cause.baseline >= BASELINE_INCREASE;
  }
  return cause.loss !== null && Number.isFinite(cause.loss) && cause.loss >= thresholds.loss;
}

export function advancePolicy(
  previous: PolicyState,
  causes: readonly EscalationCause[],
  thresholds: Thresholds,
  now: number,
) {
  const episodes = new Map<string, { since: number; raised: boolean }>();
  const raised: EscalationCause[] = [];
  let nextAt: number | undefined;

  for (const cause of causes) {
    if (episodes.has(cause.key) || !thresholdCrossed(cause, thresholds)) continue;
    const prior = previous.episodes.get(cause.key) ?? { since: now, raised: false };
    const due = prior.since + ESCALATION_DEBOUNCE_MS;
    if (!prior.raised && due <= now) {
      episodes.set(cause.key, { ...prior, raised: true });
      raised.push(cause);
    } else {
      episodes.set(cause.key, prior);
      if (!prior.raised && (nextAt === undefined || due < nextAt)) nextAt = due;
    }
  }
  return { state: { episodes }, raised, nextAt };
}

export function validThresholds({ loss, risk }: Thresholds): boolean {
  return Number.isSafeInteger(loss) && loss > 0 && Number.isInteger(risk) && risk >= 1 && risk <= 100;
}
