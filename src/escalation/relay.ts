/** Short-lived LAN pairing relay. The desktop owns all decisions that change the twin. */
import { PAIRING_TTL, type CallCommand, type PairingSnapshot, type PhoneCall } from "./protocol";

type Role = "desktop" | "phone";
type Subscriber = { role: Role; send: (snapshot: PairingSnapshot) => void; close: () => void };
interface Session {
  owner: string;
  phone: string | null;
  expiresAt: number;
  call: PhoneCall | null;
  subscribers: Set<Subscriber>;
}

const limit = 32;
const shared = globalThis as typeof globalThis & { pyreEscalationSessions?: Map<string, Session> };
const sessions = shared.pyreEscalationSessions ??= new Map<string, Session>();

function snapshot(session: Session): PairingSnapshot {
  return {
    expiresAt: session.expiresAt,
    phoneConnected: [...session.subscribers].some(({ role }) => role === "phone"),
    call: session.call,
  };
}

function broadcast(session: Session) {
  const frame = snapshot(session);
  for (const subscriber of session.subscribers) subscriber.send(frame);
}

function prune(now = Date.now()) {
  for (const [code, session] of sessions) {
    if (session.expiresAt > now) continue;
    sessions.delete(code);
    for (const subscriber of session.subscribers) subscriber.close();
  }
}

export function register(code: string, owner: string): Session | undefined {
  prune();
  const existing = sessions.get(code);
  if (existing) return existing.owner === owner ? existing : undefined;
  if (sessions.size >= limit) return undefined;
  const session: Session = { owner, phone: null, expiresAt: Date.now() + PAIRING_TTL, call: null, subscribers: new Set() };
  sessions.set(code, session);
  return session;
}

export function authorize(code: string, role: Role, key: string, allowJoin = false) {
  prune();
  const session = sessions.get(code);
  if (!session) return null;
  if (role === "desktop") return session.owner === key ? session : null;
  if (allowJoin && !session.phone) session.phone = key;
  return session.phone === key ? session : null;
}

export function subscribe(session: Session, subscriber: Subscriber) {
  session.subscribers.add(subscriber);
  broadcast(session);
  return () => {
    session.subscribers.delete(subscriber);
    if (subscriber.role === "phone") broadcast(session);
  };
}

export function receive(session: Session, role: Role, command: Exclude<CallCommand, { type: "pair" }>): boolean {
  const now = Date.now();
  if (command.type === "ring") {
    if (role !== "desktop") return false;
    if (session.call?.alert.id === command.alert.id) return true;
    if (session.call && !session.call.acknowledgedAt && !session.call.approvedAt && !session.call.resolvedAt) return false;
    session.call = { alert: command.alert, ringingAt: now };
    broadcast(session);
    return true;
  }
  const call = session.call;
  if (!call || call.alert.id !== command.id) return false;

  switch (command.type) {
    case "answer":
      if (role !== "phone" || call.resolvedAt) return false;
      call.answeredAt ??= now;
      break;
    case "acknowledge":
      if (role !== "phone" || !call.answeredAt || call.resolvedAt || (call.approvalRequestedAt && !call.approvalUnavailableAt)) return false;
      call.acknowledgedAt ??= now;
      break;
    case "approve":
      if (role !== "phone" || !call.answeredAt || !call.alert.canApprove || call.resolvedAt || call.acknowledgedAt) return false;
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
      if (role !== "phone" || !call.answeredAt) return false;
      call.dialedAt ??= now;
      break;
    case "audio-generated":
      if (role !== "phone" || !call.answeredAt) return false;
      call.audioGeneratedAt ??= now;
      break;
  }
  broadcast(session);
  return true;
}
