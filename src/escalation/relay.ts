/** Short-lived LAN pairing relay. The desktop owns all decisions that change the twin. */
import { maskPhoneNumber } from "./phoneNumber";
import { pairingFile, readPairings, writePairings } from "./pairingPersistence";
import { PAIRING_TTL, type CallCommand, type DialDestination, type DialTarget, type PairingSnapshot, type PhoneCall, type PublicMessage } from "./protocol";

type Role = "desktop" | "phone";
type Subscriber = { role: Role; send: (snapshot: PairingSnapshot) => void; close: () => void };
interface Session {
  owner: string;
  phone: string | null;
  expiresAt: number;
  call: PhoneCall | null;
  messages?: PublicMessage[];
  subscribers: Set<Subscriber>;
  expiry?: ReturnType<typeof setTimeout>;
  destination?: DialDestination;
  destinationSequence?: number;
}

const limit = 32;

function snapshot(session: Session): PairingSnapshot {
  return {
    expiresAt: session.expiresAt,
    phonePaired: session.phone !== null,
    phoneConnected: [...session.subscribers].some(({ role }) => role === "phone"),
    call: session.call,
    ...(session.messages && { messages: session.messages }),
  };
}

function broadcast(session: Session) {
  const frame = snapshot(session);
  for (const subscriber of session.subscribers) subscriber.send(frame);
}

function clearDestination(session: Session) {
  delete session.destination;
  if (session.call) delete session.call.destinationVersion;
}

export function createPairingRegistry(file?: string, sessions = new Map<string, Session>()) {
  let cleanupPending = false;
  function save() {
    if (file) writePairings(file, sessions);
    cleanupPending = false;
  }

  function prune() {
    for (const [code, session] of sessions) {
      if (session.expiresAt > Date.now()) continue;
      sessions.delete(code);
      cleanupPending = true;
      clearTimeout(session.expiry);
      clearDestination(session);
      for (const subscriber of session.subscribers) subscriber.close();
    }
    // A full or unavailable temporary volume must not crash the relay's expiry timer.
    if (cleanupPending) {
      try { save(); } catch { /* Expired sessions are already denied. Retry on the next access. */ }
    }
  }

  function armExpiry(session: Session) {
    clearTimeout(session.expiry);
    session.expiry = setTimeout(prune, Math.max(0, session.expiresAt - Date.now()));
    session.expiry.unref?.();
  }

  const hadLiveSessions = sessions.size > 0;
  if (file) {
    let saved: ReturnType<typeof readPairings> = [];
    // An unreadable file must not take the relay down; the next save replaces it.
    try { saved = readPairings(file); } catch { saved = []; }
    for (const { code, owner, phone, expiresAt } of saved) {
      if (!sessions.has(code)) sessions.set(code, { owner, phone, expiresAt, call: null, subscribers: new Set() });
    }
  }
  prune();
  for (const session of sessions.values()) armExpiry(session);
  if (hadLiveSessions) save();

  function register(code: string, owner: string): Session | undefined {
    prune();
    const existing = sessions.get(code);
    if (existing) return existing.owner === owner ? existing : undefined;
    if (sessions.size >= limit) return undefined;
    const session: Session = { owner, phone: null, expiresAt: Date.now() + PAIRING_TTL, call: null, subscribers: new Set() };
    sessions.set(code, session);
    try { save(); } catch { sessions.delete(code); throw new Error("Could not save pairing."); }
    armExpiry(session);
    return session;
  }

  function authorize(code: string, role: Role, key: string, allowJoin = false) {
    prune();
    const session = sessions.get(code);
    if (!session) return null;
    if (role === "desktop") return session.owner === key ? session : null;
    if (allowJoin && !session.phone) {
      session.phone = key;
      try { save(); } catch { session.phone = null; throw new Error("Could not save handset pairing."); }
    }
    return session.phone === key ? session : null;
  }

  return { register, authorize };
}

const shared = globalThis as typeof globalThis & { pyreEscalationSessions?: Map<string, Session> };
export const { register, authorize } = createPairingRegistry(
  process.env.NODE_ENV === "test" ? undefined : pairingFile(),
  shared.pyreEscalationSessions ??= new Map<string, Session>(),
);

export function subscribe(session: Session, subscriber: Subscriber) {
  session.subscribers.add(subscriber);
  broadcast(session);
  return () => {
    session.subscribers.delete(subscriber);
    if (subscriber.role === "phone") broadcast(session);
  };
}

function ended(call: PhoneCall) {
  return !!call.humanResponse || call.approvedAt !== undefined || call.acknowledgedAt !== undefined || call.resolvedAt !== undefined;
}

function updateDestination(session: Session, destination: DialDestination | undefined): boolean {
  if (session.destination?.number === destination?.number && session.destination?.name === destination?.name) return false;
  clearDestination(session);
  if (destination && session.call) {
    session.destination = destination;
    session.destinationSequence = (session.destinationSequence ?? 0) + 1;
    session.call.destinationVersion = session.destinationSequence;
  }
  return true;
}

export function readDialTarget(session: Session, role: Role, id: string, version: number): DialTarget | null {
  const { call, destination } = session;
  if (role !== "phone" || !call || !destination || call.alert.id !== id || call.destinationVersion !== version
    || call.dialedAt !== undefined || ended(call) || Date.now() >= session.expiresAt) return null;
  const digits = destination.number.slice(1);
  const name = destination.name && !destination.name.replace(/\D/g, "").includes(digits) ? destination.name : "on-call";
  const mask = maskPhoneNumber(destination.number).replace("··· ···", "···");
  return { href: "tel:" + destination.number, label: "Call " + name + " · " + mask };
}

export function receive(session: Session, role: Role, command: Exclude<CallCommand, { type: "pair" | "dial-target" }>): boolean {
  if (Date.now() >= session.expiresAt) return false;
  const now = Date.now();
  if (command.type === "message" || command.type === "clear-message") {
    if (role !== "desktop") return false;
    const messages = session.messages ?? [];
    const id = command.type === "message" ? command.message.id : command.id;
    const remaining = messages.filter((message) => message.id !== id);
    session.messages = command.type === "message" ? [...remaining, command.message].slice(-12) : remaining;
    broadcast(session);
    return true;
  }
  if (command.type === "ring") {
    if (role !== "desktop") return false;
    if (session.call?.alert.id === command.alert.id) {
      if (!ended(session.call) && session.call.dialedAt === undefined && updateDestination(session, command.destination)) broadcast(session);
      return true;
    }
    if (session.call && !ended(session.call)) return false;
    clearDestination(session);
    session.call = { alert: command.alert, ringingAt: now };
    updateDestination(session, command.destination);
    broadcast(session);
    return true;
  }
  const call = session.call;
  if (!call || call.alert.id !== command.id) return false;

  switch (command.type) {
    case "respond":
      if (ended(call) || call.alert.decision === undefined || (role === "phone" && !call.answeredAt)) return false;
      if (command.response.kind === "approve" && call.alert.decision?.choice !== command.response.action) return false;
      call.humanResponse = command.response;
      break;
    case "answer":
      if (role !== "phone" || call.resolvedAt) return false;
      call.answeredAt ??= now;
      break;
    case "acknowledge":
      if (role !== "phone" || !call.answeredAt || call.resolvedAt || (call.approvalRequestedAt && !call.approvalUnavailableAt)) return false;
      call.acknowledgedAt ??= now;
      break;
    case "approve":
      if (role !== "phone" || !call.answeredAt || !call.alert.canApprove || call.alert.decision !== undefined || call.resolvedAt || call.acknowledgedAt) return false;
      call.approvalRequestedAt ??= now;
      break;
    case "approval-applied":
    case "approval-unavailable":
      if (role !== "desktop" || !call.approvalRequestedAt || call.resolvedAt || call.approvedAt || call.approvalUnavailableAt) return false;
      if (command.type === "approval-applied") call.approvedAt = now;
      else call.approvalUnavailableAt = now;
      break;
    case "resolve":
      if (role !== "desktop") return false;
      call.resolvedAt ??= now;
      break;
    case "dial":
      if (role !== "phone" || ended(call) || (!call.answeredAt && !session.destination && call.dialedAt === undefined)) return false;
      call.dialedAt ??= now;
      clearDestination(session);
      break;
    case "audio-generated":
      if (role !== "phone" || !call.answeredAt) return false;
      call.audioGeneratedAt ??= now;
      break;
  }
  if (ended(call)) clearDestination(session);
  broadcast(session);
  return true;
}
