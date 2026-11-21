/** A bounded, expiring in-memory mailbox per desktop handoff session. */
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { HANDOFF_TTL_MS, type HandoffPacket, type HandoffPayload } from "./types";

/** Uploads one pairing code accepts before it must be replaced by a new QR code. */
export const MAX_UPLOADS_PER_SESSION = 20;

const digest = (value: string) => createHash("sha256").update(value).digest();
/** Compares receiver keys without leaking the position of the first differing character. */
const sameKey = (left: string, right: string) => timingSafeEqual(digest(left), digest(right));

interface Subscriber {
  send: (packet: HandoffPacket) => void;
  close: (reason: "expired" | "replaced") => void;
}

interface Session {
  key: string;
  expiresAt: number;
  unscannedUntil: number | null;
  timer: ReturnType<typeof setTimeout>;
  latest: HandoffPacket | null;
  subscriber: Subscriber | null;
  uploads: number;
}

const MAX_SESSIONS = 12;
const UNSCANNED_TTL_MS = 2 * 60_000;

export function createHandoffStore(ttlMs = HANDOFF_TTL_MS, capacity = MAX_SESSIONS) {
  const sessions = new Map<string, Session>();
  const retired = new Map<string, number>();

  function expiryTimer(code: string, deadline: number) {
    const timer = setTimeout(() => expire(code), deadline - Date.now());
    timer.unref?.();
    return timer;
  }

  function expire(code: string) {
    const session = sessions.get(code);
    if (!session) return;
    sessions.delete(code);
    clearTimeout(session.timer);
    if (session.expiresAt > Date.now()) retired.set(code, session.expiresAt);
    session.subscriber?.close("expired");
  }

  function active(code: string) {
    const session = sessions.get(code);
    if (session && (session.unscannedUntil ?? session.expiresAt) <= Date.now()) {
      expire(code);
      return undefined;
    }
    return session;
  }

  function markScanned(code: string) {
    const session = active(code);
    if (!session) return false;
    if (session.unscannedUntil !== null) {
      session.unscannedUntil = null;
      clearTimeout(session.timer);
      session.timer = expiryTimer(code, session.expiresAt);
    }
    return true;
  }

  function register(code: string, key: string) {
    let session = active(code);
    const created = !session;
    if (session) {
      if (!sameKey(session.key, key)) return { status: "conflict" } as const;
    } else {
      const now = Date.now();
      // Keep an expired QR closed even if a desktop reconnects with cached credentials.
      for (const [retiredCode, expiresAt] of retired) {
        if (expiresAt <= now) retired.delete(retiredCode);
      }
      if (retired.has(code)) return { status: "conflict" } as const;
      if (sessions.size >= capacity) return { status: "full" } as const;
      const expiresAt = now + ttlMs;
      const unscannedUntil = Math.min(expiresAt, now + UNSCANNED_TTL_MS);
      const timer = expiryTimer(code, unscannedUntil);
      session = { key, expiresAt, unscannedUntil, timer, latest: null, subscriber: null, uploads: 0 };
      sessions.set(code, session);
    }

    const connected = session;
    return {
      status: "ready",
      /** True when this call opened the session, false for the owner's reconnect. */
      created,
      expiresAt: connected.expiresAt,
      subscribe(subscriber: Subscriber) {
        const previous = connected.subscriber;
        connected.subscriber = subscriber;
        previous?.close("replaced");
        if (connected.latest) subscriber.send(connected.latest);
        return () => {
          if (connected.subscriber === subscriber) connected.subscriber = null;
        };
      },
    } as const;
  }

  return {
    register,
    markScanned,
    has: (code: string) => !!active(code),
    /** True only for the desktop that opened this live session. */
    owns(code: string, key: string) {
      const session = active(code);
      return !!session && sameKey(session.key, key);
    },
    publish(code: string, payload: HandoffPayload) {
      const session = active(code);
      if (!session) return false;
      // A code is reusable for "Send more", but not as an open-ended upload channel.
      if (session.uploads >= MAX_UPLOADS_PER_SESSION) {
        expire(code);
        return false;
      }
      if (!markScanned(code)) return false;
      session.uploads += 1;
      const packet = { ...payload, id: randomUUID() };
      session.latest = packet;
      session.subscriber?.send(packet);
      return true;
    },
  };
}

// The key carries a version so a hot reload never reuses a store built from an older shape.
const memory = globalThis as typeof globalThis & { pyreHandoffStoreV3?: ReturnType<typeof createHandoffStore> };
export const handoffStore = (memory.pyreHandoffStoreV3 ??= createHandoffStore());
