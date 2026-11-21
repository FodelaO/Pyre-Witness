/** A bounded, expiring in-memory mailbox per desktop handoff session. */
import { randomUUID } from "node:crypto";
import { HANDOFF_TTL_MS, type HandoffPacket, type HandoffPayload } from "./types";

interface Subscriber {
  send: (packet: HandoffPacket) => void;
  close: (reason: "expired" | "replaced") => void;
}

interface Session {
  key: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
  latest: HandoffPacket | null;
  subscriber: Subscriber | null;
}

const MAX_SESSIONS = 12;

export function createHandoffStore(ttlMs = HANDOFF_TTL_MS, capacity = MAX_SESSIONS) {
  const sessions = new Map<string, Session>();

  function expire(code: string) {
    const session = sessions.get(code);
    if (!session) return;
    sessions.delete(code);
    clearTimeout(session.timer);
    session.subscriber?.close("expired");
  }

  function active(code: string) {
    const session = sessions.get(code);
    if (session && session.expiresAt <= Date.now()) {
      expire(code);
      return undefined;
    }
    return session;
  }

  function register(code: string, key: string) {
    let session = active(code);
    if (session) {
      if (session.key !== key) return { status: "conflict" } as const;
    } else {
      if (sessions.size >= capacity) return { status: "full" } as const;
      const timer = setTimeout(() => expire(code), ttlMs);
      timer.unref?.();
      session = { key, expiresAt: Date.now() + ttlMs, timer, latest: null, subscriber: null };
      sessions.set(code, session);
    }

    const connected = session;
    return {
      status: "ready",
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
    has: (code: string) => !!active(code),
    publish(code: string, payload: HandoffPayload) {
      const session = active(code);
      if (!session) return false;
      const packet = { ...payload, id: randomUUID() };
      session.latest = packet;
      session.subscriber?.send(packet);
      return true;
    },
  };
}

const memory = globalThis as typeof globalThis & { pyreHandoffStore?: ReturnType<typeof createHandoffStore> };
export const handoffStore = (memory.pyreHandoffStore ??= createHandoffStore());
