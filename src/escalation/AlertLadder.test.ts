/** Verifies the dock against the record selected for the paired handset. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AlertLadder } from "./AlertLadder";
import { DEFAULT_THRESHOLDS } from "./policy";
import type { PairingSnapshot } from "./protocol";
import { receive, register, subscribe } from "./relay";
import { selectEscalationRecord } from "./store";
import type { EscalationRecord } from "./types";

const paired: EscalationRecord = {
  id: "paired", level: 3, raisedAt: 1, ringing: { at: 2, channel: "desktop" },
  trigger: { key: "finding:PLC-F3:SAFE-01", kind: "finding", assetId: "PLC-F3", assetName: null,
    assetKind: null, room: null, title: "Safety-critical asset is reachable", loss: 94_000, score: 46.09, baseline: 46.09 },
  thresholds: DEFAULT_THRESHOLDS, action: "Review", script: "Review.", canApprove: false,
};
const testCall: EscalationRecord = {
  ...paired, id: "rehearsal", ringing: undefined, raisedAt: 3,
  trigger: { ...paired.trigger, key: "test-scenario:TEST-901", assetId: "TEST-901", test: true },
};

function dock(records: EscalationRecord[], handset: EscalationRecord, phoneConnected = true) {
  return renderToStaticMarkup(createElement(AlertLadder, {
    records, call: selectEscalationRecord(records, handset), phoneConnected, testRunning: true,
    onOpen: vi.fn(), onRing: vi.fn(), respond: vi.fn(),
  }));
}

it("queues the test behind the active handset call", () => {
  const busy = dock([paired, testCall], paired);
  expect(busy).toContain('aria-label="Call · PLC-F3 · Ringing"');
  expect(busy).toMatch(/TEST-901 queued/i);
  const ended: EscalationRecord = { ...paired, humanResponse: { kind: "override", action: "accept risk" } };
  const next = dock([ended, testCall], ended);
  expect(next).toContain('aria-label="Call · TEST-901 · Ready"');
  expect(next).not.toMatch(/TEST-901 queued/i);
});

it("shows waiting when the ringing handset disconnects", () => {
  const session = register("dock-disconnect", "desk")!;
  const frames: PairingSnapshot[] = [];
  const closeDesk = subscribe(session, { role: "desktop", close() {}, send: (frame) => frames.push(frame) });
  const closePhone = subscribe(session, { role: "phone", close() {}, send() {} });
  try {
    expect(receive(session, "desktop", { type: "ring", alert: {
      id: testCall.id, kind: "finding", tag: "TEST-901", title: "Test call", room: null,
      test: true, loss: null, action: "Review", script: "Review.", canApprove: false,
    } })).toBe(true);
    const ringing: EscalationRecord = { ...testCall, ringing: { at: session.call!.ringingAt, channel: "desktop" } };
    expect(dock([ringing], ringing, frames.at(-1)!.phoneConnected)).toContain("Call · TEST-901 · Ringing");
    closePhone();
    expect(frames.at(-1)!.phoneConnected).toBe(false);
    expect(dock([ringing], ringing, false)).toContain("Call · TEST-901 · Waiting for phone");
    const answered: EscalationRecord = { ...ringing, answered: { at: 4, channel: "paired-phone" } };
    expect(dock([answered], answered, false)).toContain("Call · TEST-901 · Answered");
  } finally {
    closePhone();
    closeDesk();
  }
});
