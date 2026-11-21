/** Exercise delivery, reconnect and expiry without opening a browser or port. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHandoffStore } from "./store";
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
});
