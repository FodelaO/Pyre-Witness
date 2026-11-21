/** Lets the same desk tab reconnect after a reload using the relay's original expiry. */
import type { CallConnection } from "./connection.mjs";
import { CLIENT_KEY, PAIR_CODE } from "./wire.mjs";

const storageKey = "pw:escalation-desk-pair";

export function restoreDeskConnection(): CallConnection | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (saved && typeof saved.code === "string" && PAIR_CODE.test(saved.code)
      && typeof saved.key === "string" && CLIENT_KEY.test(saved.key) && Number.isFinite(saved.expiresAt)
      && saved.expiresAt > Date.now()) return { code: saved.code, key: saved.key, role: "desktop" };
    sessionStorage.removeItem(storageKey);
  } catch { /* Storage can be unavailable in a private browsing session. */ }
  return null;
}

export function rememberDeskConnection(connection: CallConnection | null, expiresAt?: number) {
  try {
    if (connection) sessionStorage.setItem(storageKey, JSON.stringify({ code: connection.code, key: connection.key, expiresAt }));
    else sessionStorage.removeItem(storageKey);
  } catch { /* The active tab can continue using its in-memory connection. */ }
}
