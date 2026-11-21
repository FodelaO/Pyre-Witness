/** Exercises credential-only restart recovery, phone ownership, and expiry on disk. */
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PAIRING_TTL } from "./protocol";
import { createPairingRegistry, subscribe } from "./relay";

let directory: string;
let file: string;
const code = () => randomBytes(12).toString("hex");
const key = () => randomBytes(16).toString("hex");
beforeEach(() => {
  vi.useFakeTimers();
  directory = mkdtempSync(join(tmpdir(), "pyre-pair-test-"));
  file = join(directory, "pairs.json");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  rmSync(directory, { recursive: true, force: true });
});

it("restores both roles and unclaimed links without persisting any contact or call data", () => {
  const original = createPairingRegistry(file);
  const id = code(), pending = code(), desk = key(), phone = key();
  const session = original.register(id, desk)!;
  expect(session.expiresAt - Date.now()).toBe(PAIRING_TTL);
  session.destination = { name: "Private fixture", number: "+" + "1".repeat(10) };
  original.register(pending, desk);
  original.authorize(id, "phone", phone, true);

  const rows = JSON.parse(readFileSync(file, "utf8")) as object[];
  expect(rows).toHaveLength(2);
  for (const row of rows) expect(Object.keys(row).sort()).toEqual(["code", "expiresAt", "owner", "phone"]);
  expect(statSync(file).mode & 0o777).toBe(0o600);
  vi.clearAllTimers();
  vi.advanceTimersByTime(5 * 60_000);
  const reopened = createPairingRegistry(file);
  expect(reopened.register(id, desk)?.expiresAt).toBe(session.expiresAt);
  expect(reopened.authorize(id, "desktop", desk) !== null).toBe(true);
  expect(reopened.authorize(id, "desktop", key()) === null).toBe(true);
  expect(reopened.authorize(id, "phone", key(), true) === null).toBe(true);
  const restored = reopened.authorize(id, "phone", phone)!;
  expect(restored.destination).toBeUndefined();
  expect(restored.call).toBeNull();
  const send = vi.fn();
  const stop = subscribe(restored, { role: "desktop", send, close() {} });
  expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ phonePaired: true, phoneConnected: false }));
  const hangUp = subscribe(restored, { role: "phone", send() {}, close() {} });
  expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ phoneConnected: true }));
  hangUp();
  expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ phonePaired: true, phoneConnected: false }));
  stop();
  expect(reopened.authorize(pending, "phone", key(), true) !== null).toBe(true);
});

it("prunes downtime expirations at startup and removes remaining credentials at the original deadline", () => {
  const first = createPairingRegistry(file);
  const desk = key(), old = code(), live = code();
  const deadline = first.register(old, desk)!.expiresAt;
  vi.advanceTimersByTime(60_000);
  first.register(live, desk);
  vi.clearAllTimers();
  vi.setSystemTime(deadline);
  const restarted = createPairingRegistry(file);
  expect(restarted.authorize(old, "desktop", desk) === null).toBe(true);
  expect(restarted.authorize(live, "desktop", desk) !== null).toBe(true);
  expect(JSON.parse(readFileSync(file, "utf8")).length).toBe(1);
  vi.advanceTimersByTime(60_000);
  expect(JSON.parse(readFileSync(file, "utf8")).length).toBe(0);
  expect(restarted.authorize(live, "desktop", desk) === null).toBe(true);
});
