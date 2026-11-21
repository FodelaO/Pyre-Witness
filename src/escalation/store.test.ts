/** Pins the alert both the desktop and the paired handset select. */
import { expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "./policy";
import { selectEscalationRecord } from "./store";
import type { EscalationRecord } from "./types";

function record(id: string, raisedAt: number, test?: true): EscalationRecord {
  return {
    id, raisedAt, thresholds: DEFAULT_THRESHOLDS, action: "Review", script: "Review.", canApprove: false,
    trigger: {
      key: id, kind: "finding", title: id, test, assetId: null, assetName: null, assetKind: null,
      room: null, loss: 110_000, score: 50, baseline: 40,
    },
  };
}

it("picks the newest pending alert with stable order for alerts raised together", () => {
  const old = record("old", 100);
  const first = record("first", 200);
  const second = record("second", 200);
  expect(selectEscalationRecord([old, first, second])).toBe(first);
});

it("keeps an active paired alert in view and queues the test once that call ends", () => {
  const active = record("paired", 100);
  const test = record("test", 200, true);
  const newest = record("newest", 300);
  const ended = { ...active, resolvedAt: 400 };
  expect(selectEscalationRecord([active, test, newest], active)).toBe(active);
  expect(selectEscalationRecord([ended, test, newest], ended)).toBe(test);
});
