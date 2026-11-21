/** Exercise delivery, reconnect and expiry without opening a browser or port. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHandoffStore, MAX_UPLOADS_PER_SESSION } from "./store";
import { HANDOFF_TTL_MS } from "./types";

const payload = { images: [{ mimeType: "image/jpeg", dataBase64: "/9j/2Q==" }], note: "Front label" };
const receiver = () => ({ send: vi.fn(), close: vi.fn() });

describe("phone handoff mailbox", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delivers only to the receiver registered for the corresponding code", () => {
    const store = createHandoffStore();
    const first = store.register("ABCD23", "first key");
    const other = store.register("BCDE34", "second key");
    if (first.status !== "ready" || other.status !== "ready") throw new Error("Could not register fixtures.");
    const desktop = receiver();
    const unrelated = receiver();
    first.subscribe(desktop);
    other.subscribe(unrelated);

    expect(store.publish("ABCD23", payload)).toBe(true);
    expect(desktop.send).toHaveBeenCalledWith({ ...payload, id: expect.any(String) });
    expect(unrelated.send).not.toHaveBeenCalled();
    expect(store.register("ABCD23", "wrong key")).toEqual({ status: "conflict" });
    expect(store.publish("CDEF45", payload)).toBe(false);
  });

  it("replays the same packet after a reconnect", () => {
    const store = createHandoffStore();
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not register fixture.");
    const desktop = receiver();
    const disconnect = session.subscribe(desktop);
    expect(store.publish("ABCD23", payload)).toBe(true);
    disconnect();

    const reconnect = store.register("ABCD23", "key");
    if (reconnect.status !== "ready") throw new Error("Could not reconnect fixture.");
    const restarted = receiver();
    reconnect.subscribe(restarted);
    expect(restarted.send.mock.calls).toEqual(desktop.send.mock.calls);
    expect(reconnect.expiresAt).toBe(session.expiresAt);
  });

  it("replaces a receiver without letting the old connection detach the new one", () => {
    const store = createHandoffStore();
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not register fixture.");
    const first = receiver();
    const replacement = receiver();
    const disconnect = session.subscribe(first);
    session.subscribe(replacement);
    disconnect();
    store.publish("ABCD23", payload);
    expect(first.close).toHaveBeenCalledWith("replaced");
    expect(first.send).not.toHaveBeenCalled();
    expect(replacement.send).toHaveBeenCalledOnce();
  });

  it("recognises only the owner's key and reports whether a session was opened", () => {
    const store = createHandoffStore();
    const opened = store.register("ABCD23", "0123456789abcdef0123456789abcdef");
    const reconnect = store.register("ABCD23", "0123456789abcdef0123456789abcdef");
    if (opened.status !== "ready" || reconnect.status !== "ready") throw new Error("Could not register fixture.");
    expect(opened.created).toBe(true);
    expect(reconnect.created).toBe(false);
    expect(store.owns("ABCD23", "0123456789abcdef0123456789abcdef")).toBe(true);
    expect(store.owns("ABCD23", "0123456789abcdef0123456789abcdee")).toBe(false);
    expect(store.owns("ABCD23", "short")).toBe(false);
    expect(store.owns("BCDE34", "0123456789abcdef0123456789abcdef")).toBe(false);
  });

  it("closes a pairing code after its upload allowance is used", () => {
    const store = createHandoffStore();
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not register fixture.");
    const desktop = receiver();
    session.subscribe(desktop);
    for (let upload = 0; upload < MAX_UPLOADS_PER_SESSION; upload += 1) {
      expect(store.publish("ABCD23", payload)).toBe(true);
    }
    expect(store.publish("ABCD23", payload)).toBe(false);
    expect(desktop.send).toHaveBeenCalledTimes(MAX_UPLOADS_PER_SESSION);
    expect(desktop.close).toHaveBeenCalledWith("expired");
    expect(store.has("ABCD23")).toBe(false);
  });

  it("discards photos and frees capacity after ten minutes", () => {
    const store = createHandoffStore(HANDOFF_TTL_MS, 1);
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not register fixture.");
    const desktop = receiver();
    session.subscribe(desktop);
    expect(store.publish("ABCD23", payload)).toBe(true);
    expect(store.register("BCDE34", "second key")).toEqual({ status: "full" });
    vi.advanceTimersByTime(HANDOFF_TTL_MS - 1);
    expect(store.has("ABCD23")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(desktop.close).toHaveBeenCalledWith("expired");
    expect(store.has("ABCD23")).toBe(false);
    expect(store.publish("ABCD23", payload)).toBe(false);

    const fresh = store.register("ABCD23", "fresh key");
    if (fresh.status !== "ready") throw new Error("Could not reuse expired session slot.");
    const freshDesktop = receiver();
    fresh.subscribe(freshDesktop);
    expect(freshDesktop.send).not.toHaveBeenCalled();
  });

  it("gives an unscanned code's slot to a new pairing after two minutes even if the desktop reconnects", () => {
    const store = createHandoffStore(HANDOFF_TTL_MS, 1);
    expect(store.register("ABCD23", "key").status).toBe("ready");
    vi.advanceTimersByTime(119_999);
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not reconnect fixture.");
    const desktop = receiver();
    session.subscribe(desktop);
    expect(store.register("BCDE34", "other").status).toBe("full");

    vi.advanceTimersByTime(1);
    expect(desktop.close).not.toHaveBeenCalled();
    expect(store.register("BCDE34", "other").status).toBe("ready");
    expect(desktop.close).toHaveBeenCalledWith("expired");
    expect(store.markScanned("ABCD23")).toBe(false);
    expect(store.register("ABCD23", "key").status).toBe("conflict");
  });

  it("keeps used codes, and unused codes while there is room, past two minutes", () => {
    const store = createHandoffStore(HANDOFF_TTL_MS, 2);
    const used = store.register("ABCD23", "key");
    const waiting = store.register("BCDE34", "other");
    if (used.status !== "ready" || waiting.status !== "ready") throw new Error("Could not register fixtures.");
    const desktop = receiver();
    waiting.subscribe(desktop);
    expect(store.publish("ABCD23", payload)).toBe(true);

    vi.advanceTimersByTime(5 * 60_000);
    // A phone that scanned but is still shooting can send while no new pairing needs the slot.
    expect(store.publish("BCDE34", payload)).toBe(true);
    expect(desktop.send).toHaveBeenCalledOnce();
    expect(store.register("CDEF45", "third").status).toBe("full");
    expect(desktop.close).not.toHaveBeenCalled();
  });

  it("keeps a scanned code until the original ten-minute deadline without an upload", () => {
    const store = createHandoffStore();
    const session = store.register("ABCD23", "key");
    if (session.status !== "ready") throw new Error("Could not register fixture.");
    vi.advanceTimersByTime(119_999);
    expect(store.markScanned("ABCD23")).toBe(true);
    vi.advanceTimersByTime(480_000);
    expect(store.owns("ABCD23", "key")).toBe(true);
    expect(store.register("ABCD23", "key")).toMatchObject({ expiresAt: session.expiresAt, created: false });
    vi.advanceTimersByTime(1);
    expect(store.has("ABCD23")).toBe(false);
  });
});
