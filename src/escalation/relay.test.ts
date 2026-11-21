/** Verifies role boundaries, idempotent call events, and the one private ring field. */
import { describe, expect, it, vi } from "vitest";
import { commandSchema, PAIRING_TTL, type PairingSnapshot, type PublicAlert } from "./protocol";
import { authorize, readDialTarget, receive, register, subscribe } from "./relay";

const alert: PublicAlert = {
  id: "e-test-1", kind: "finding", tag: "HMI-F3", room: "Filler 3", title: "Exposed service port",
  loss: 29_000, action: "Fit a physical port lock", script: "Chief here. Fit a physical port lock.", canApprove: true,
};
const destination = { number: "+15550100", name: "Presenter" };

describe("paired phone relay", () => {
  it("allows one phone, requires an answer and records approval only when the desktop confirms", () => {
    const session = register("paired-approval", "desk")!;
    expect(authorize("paired-approval", "desktop", "wrong", true)).toBeNull();
    expect(authorize("paired-approval", "phone", "phone", true)).toBe(session);
    expect(authorize("paired-approval", "phone", "another", true)).toBeNull();
    const events: PairingSnapshot[] = [];
    const stop = subscribe(session, { role: "phone", close() {}, send: (frame) => events.push(structuredClone(frame)) });
    expect(receive(session, "phone", { type: "ring", alert })).toBe(false);
    expect(receive(session, "desktop", { type: "ring", alert })).toBe(true);
    expect(receive(session, "phone", { type: "approve", id: alert.id })).toBe(false);
    expect(receive(session, "phone", { type: "answer", id: alert.id })).toBe(true);
    expect(receive(session, "phone", { type: "approve", id: alert.id })).toBe(true);
    expect(events.at(-1)?.call?.approvedAt).toBeUndefined();
    expect(receive(session, "phone", { type: "approval-applied", id: alert.id })).toBe(false);
    expect(receive(session, "desktop", { type: "approval-applied", id: alert.id })).toBe(true);
    const approvedAt = events.at(-1)?.call?.approvedAt;
    expect(approvedAt).toBeTypeOf("number");
    expect(receive(session, "desktop", { type: "ring", alert })).toBe(true);
    expect(events.at(-1)?.call?.approvedAt).toBe(approvedAt);
    stop();
  });

  it("accepts exactly one destination field on the ring POST", () => {
    const ring = { type: "ring", alert, destination: { ...destination, number: "+1 555 0100" } };
    expect(commandSchema.parse(ring)).toEqual({ ...ring, destination });
    expect(commandSchema.safeParse({ ...ring, phone: destination.number }).success).toBe(false);
    expect(commandSchema.safeParse({ ...ring, alert: { ...alert, destination } }).success).toBe(false);
    expect(commandSchema.safeParse({ ...ring, destination: { ...destination, extra: true } }).success).toBe(false);
    expect(commandSchema.safeParse({ ...ring, destination: { number: "15550100" } }).success).toBe(false);
    expect(commandSchema.safeParse({ type: "dial", id: alert.id, destination }).success).toBe(false);
    expect(commandSchema.safeParse({ type: "dial-target", id: alert.id, version: 1, destination }).success).toBe(false);
    expect(commandSchema.safeParse({ type: "pair", destination }).success).toBe(false);
  });

  it("shares the dial link with the paired phone and clears it on the tap before Answer", () => {
    const session = register("paired-dial", "desk")!;
    const events: PairingSnapshot[] = [];
    const stop = subscribe(session, { role: "desktop", close() {}, send: (frame) => events.push(structuredClone(frame)) });
    expect(receive(session, "phone", { type: "ring", alert, destination })).toBe(false);
    expect(receive(session, "desktop", { type: "ring", alert, destination })).toBe(true);
    const version = events.at(-1)?.call?.destinationVersion ?? 0;
    expect(version).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toContain(destination.number);
    expect(JSON.stringify(events)).not.toContain(destination.name);
    expect(readDialTarget(session, "desktop", alert.id, version)).toBeNull();
    expect(readDialTarget(session, "phone", alert.id, version)).toEqual({
      href: "tel:+15550100", label: "Call Presenter · +1 ··· 0100",
    });
    expect(events.at(-1)?.call?.dialedAt).toBeUndefined();
    expect(receive(session, "desktop", { type: "dial", id: alert.id })).toBe(false);
    expect(receive(session, "phone", { type: "dial", id: alert.id })).toBe(true);
    expect(events.at(-1)?.call?.dialedAt).toBeTypeOf("number");
    expect(session.destination).toBeUndefined();
    expect(readDialTarget(session, "phone", alert.id, version)).toBeNull();
    expect(receive(session, "desktop", { type: "ring", alert, destination })).toBe(true);
    expect(session.destination).toBeUndefined();
    expect(receive(session, "phone", { type: "answer", id: alert.id })).toBe(true);
    expect(receive(session, "phone", { type: "acknowledge", id: alert.id })).toBe(true);
    expect(events.at(-1)?.call?.acknowledgedAt).toBeTypeOf("number");
    stop();
  });

  it("revokes a destination when the desktop removes it, the alert resolves, or the pairing expires", () => {
    vi.useFakeTimers();
    try {
      const session = register("private-expiry", "desk")!;
      const send = () => receive(session, "desktop", { type: "ring", alert, destination: { number: destination.number } });
      expect(send()).toBe(true);
      const first = session.call?.destinationVersion ?? 0;
      expect(readDialTarget(session, "phone", alert.id, first)?.label).toBe("Call on-call · +1 ··· 0100");
      expect(receive(session, "desktop", { type: "ring", alert })).toBe(true);
      expect(session.destination).toBeUndefined();
      expect(send()).toBe(true);
      expect(session.call?.destinationVersion).not.toBe(first);
      expect(receive(session, "desktop", { type: "resolve", id: alert.id })).toBe(true);
      expect(session.destination).toBeUndefined();

      const next = { ...alert, id: "e-test-2" };
      expect(receive(session, "desktop", { type: "ring", alert: next, destination })).toBe(true);
      expect(session.destination).toBeDefined();
      vi.advanceTimersByTime(PAIRING_TTL);
      expect(session.destination).toBeUndefined();
      expect(authorize("private-expiry", "desktop", "desk")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
