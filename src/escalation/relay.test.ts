/** Verifies role boundaries, idempotent call events and the roster-free wire format. */
import { describe, expect, it } from "vitest";
import { commandSchema, type PairingSnapshot, type PublicAlert } from "./protocol";
import { authorize, receive, register, subscribe } from "./relay";

const alert: PublicAlert = {
  id: "e-test-1", kind: "finding", tag: "HMI-F3", room: "Filler 3", title: "Exposed service port",
  loss: 29_000, action: "Fit a physical port lock", script: "Chief here. Fit a physical port lock.", canApprove: true,
};

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

  it("rejects roster fields and reports dialing only after the paired phone opens it", () => {
    expect(commandSchema.safeParse({ type: "dial", id: alert.id, phone: "unaccepted" }).success).toBe(false);
    const session = register("paired-dial", "desk")!;
    const events: PairingSnapshot[] = [];
    const stop = subscribe(session, { role: "desktop", close() {}, send: (frame) => events.push(structuredClone(frame)) });
    expect(receive(session, "desktop", { type: "ring", alert })).toBe(true);
    expect(events.at(-1)?.call?.dialedAt).toBeUndefined();
    expect(receive(session, "phone", { type: "answer", id: alert.id })).toBe(true);
    expect(receive(session, "desktop", { type: "dial", id: alert.id })).toBe(false);
    expect(receive(session, "phone", { type: "dial", id: alert.id })).toBe(true);
    expect(events.at(-1)?.call?.dialedAt).toBeTypeOf("number");
    expect(receive(session, "phone", { type: "acknowledge", id: alert.id })).toBe(true);
    expect(events.at(-1)?.call?.acknowledgedAt).toBeTypeOf("number");
    stop();
  });
});
