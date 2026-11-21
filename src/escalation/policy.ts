/** Debounces threshold episodes and raises each sustained cause once until it clears. */
import type { AlertLevel, EscalationCause, Thresholds } from "./types";

export const DEFAULT_THRESHOLDS: Thresholds = { loss: 100_000, risk: 60 };
export const BASELINE_INCREASE = 8;
export const ESCALATION_DEBOUNCE_MS = 500;

export interface PolicyState {
  episodes: ReadonlyMap<string, { since: number; raised: boolean; level: number }>;
}

export const initialPolicy: PolicyState = { episodes: new Map() };

export function thresholdCrossed(cause: EscalationCause, thresholds: Thresholds): boolean {
  if (cause.kind === "risk") {
    return cause.score >= thresholds.risk || cause.score - cause.baseline >= BASELINE_INCREASE;
  }
  return cause.loss !== null && Number.isFinite(cause.loss) && cause.loss >= thresholds.loss;
}

/** The existing configured threshold sends a message. Higher exposure triggers the call. */
export function alertLevel(cause: EscalationCause, thresholds: Thresholds): AlertLevel | 0 {
  if (cause.testLevel) return cause.testLevel;
  const risk = cause.kind === "risk";
  const loss = cause.loss ?? 0;
  if (loss >= 2 * thresholds.loss || (risk && (
    cause.score >= Math.min(100, thresholds.risk + 20) || cause.score - cause.baseline >= 20
  ))) return 3;
  if (thresholdCrossed(cause, thresholds) || loss >= thresholds.loss) return 2;
  return cause.assetId && (loss > 0 || (risk && cause.score > cause.baseline)) ? 1 : 0;
}

export function advancePolicy(
  previous: PolicyState,
  causes: readonly EscalationCause[],
  thresholds: Thresholds,
  now: number,
  tier = (cause: EscalationCause, limits: Thresholds): number => Number(thresholdCrossed(cause, limits)),
) {
  const episodes = new Map<string, { since: number; raised: boolean; level: number }>();
  const raised: EscalationCause[] = [];
  let nextAt: number | undefined;

  for (const cause of causes) {
    const level = tier(cause, thresholds);
    if (episodes.has(cause.key) || !level) continue;
    const existing = previous.episodes.get(cause.key);
    const prior = existing?.level === level ? existing : { since: now, raised: false, level };
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
