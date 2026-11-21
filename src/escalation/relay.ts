/** Short-lived LAN pairing relay. The desktop owns all decisions that change the twin. */
import { maskPhoneNumber } from "./phoneNumber";
import { PAIRING_TTL, type CallCommand, type DialDestination, type DialTarget, type PairingSnapshot, type PhoneCall } from "./protocol";

type Role = "desktop" | "phone";
type Subscriber = { role: Role; send: (snapshot: PairingSnapshot) => void; close: () => void };
interface Session {
  owner: string;
  phone: string | null;
  expiresAt: number;
  call: PhoneCall | null;
  subscribers: Set<Subscriber>;
  expiry?: ReturnType<typeof setTimeout>;
  destination?: DialDestination;
  destinationSequence?: number;
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

function clearDestination(session: Session) {
  delete session.destination;
  if (session.call) delete session.call.destinationVersion;
}

function expire(code: string, session: Session) {
  if (sessions.get(code) !== session) return;
  sessions.delete(code);
  clearTimeout(session.expiry);
  clearDestination(session);
  for (const subscriber of session.subscribers) subscriber.close();
}

function prune(now = Date.now()) {
  for (const [code, session] of sessions) if (session.expiresAt <= now) expire(code, session);
}

export function register(code: string, owner: string): Session | undefined {
  prune();
  const existing = sessions.get(code);
  if (existing) return existing.owner === owner ? existing : undefined;
  if (sessions.size >= limit) return undefined;
  const session: Session = { owner, phone: null, expiresAt: Date.now() + PAIRING_TTL, call: null, subscribers: new Set() };
  sessions.set(code, session);
  session.expiry = setTimeout(() => expire(code, session), PAIRING_TTL);
  session.expiry.unref?.();
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

function ended(call: PhoneCall) {
  return call.approvedAt !== undefined || call.acknowledgedAt !== undefined || call.resolvedAt !== undefined;
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
