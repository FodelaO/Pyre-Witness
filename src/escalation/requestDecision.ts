/** Shares one pending advisory request between the call publisher and desktop card. */
import { decisionSchema, type AlertDecision } from "./decision";
import { useEscalationStore } from "./store";
import type { EscalationRecord } from "./types";

const pending = new Map<string, Promise<AlertDecision | null>>();

export function ensureDecision(record: EscalationRecord): Promise<AlertDecision | null> {
  const stored = useEscalationStore.getState().records.find(({ id }) => id === record.id)?.decision;
  if (stored !== undefined) return Promise.resolve(stored);
  const existing = pending.get(record.id);
  if (existing) return existing;

  const { trigger } = record;
  const request = fetch("/api/escalation/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      asset: trigger.assetId?.slice(0, 64) ?? "Line 3",
      finding: trigger.title.slice(0, 240),
      loss: trigger.loss,
      risk: trigger.score,
      simulated: true,
    }),
  }).then(async (response) => response.ok ? decisionSchema.parse(await response.json()) : null)
    .catch(() => null)
    .then((decision) => {
      useEscalationStore.getState().update(record.id, { decision });
      return decision;
    }).finally(() => pending.delete(record.id));
  pending.set(record.id, request);
  return request;
}
