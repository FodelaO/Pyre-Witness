/** Owns the desktop pairing, publishes alerts, and applies confirmed phone approvals. */
"use client";

import { formatUsd } from "@/econ/format";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { callCommand, listenToCall, randomHex, type CallConnection } from "./connection.mjs";
import type { HumanResponse } from "./decision";
import { rememberDeskConnection, restoreDeskConnection } from "./deskPairing";
import { ensureDecision } from "./requestDecision";
import { readCauses } from "./evidence";
import { recommendedBriefing } from "./monitor";
import { readPhoneContact, type PhoneContact } from "./phoneContact";
import { thresholdCrossed } from "./policy";
import type { DialDestination, PairingSnapshot, PublicAlert } from "./protocol";
import { applyApproval, confirmApproval, type ApprovalPlan } from "./recommendation";
import { buildEscalationScript } from "./script";
import { canRingEscalation, selectEscalationRecord, useEscalationStore } from "./store";
import type { EscalationMoment, EscalationRecord } from "./types";

interface Pairing {
  connection: CallConnection;
  addresses: string[];
  wifiAddresses?: string[];
  port: number;
}

function publicAlert(record: EscalationRecord): PublicAlert {
  const { trigger } = record;
  return {
    id: record.id, kind: trigger.kind, test: trigger.test, tag: trigger.assetId?.slice(0, 64) ?? null,
    room: trigger.room?.slice(0, 72) ?? null, title: trigger.title.slice(0, 120), loss: trigger.loss,
    lossText: trigger.loss === null ? undefined : formatUsd(trigger.loss),
    action: record.action.slice(0, 100), script: record.script, canApprove: record.canApprove, decision: record.decision,
  };
}

export function useCallPairing(responderLabel: string, contact: PhoneContact | null) {
  const [pairing, setPairing] = useState<Pairing | null>(() => {
    const connection = restoreDeskConnection();
    return connection ? { connection, addresses: [], port: Number(location.port) } : null;
  });
  const [snapshot, setSnapshot] = useState<PairingSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pairingRef = useRef(pairing);
  const opening = useRef<Promise<Pairing> | null>(null);
  const plans = useRef(new Map<string, ApprovalPlan>());
  const decisions = useRef(new Map<string, "approval-applied" | "approval-unavailable">());
  const sentDecisions = useRef(new Set<string>());
  const automaticRing = useRef("");
  const publishedMessages = useRef(new Set<string>());
  const ringingNow = useRef(false);
  const published = useRef<{ code: string; id: string; destination?: DialDestination } | null>(null);
  const activeId = snapshot?.call?.alert.id;
  const records = useEscalationStore((state) => state.records);
  const activeRecord = records.find((record) => record.id === activeId);
  const record = selectEscalationRecord(records, activeRecord);

  async function openPairing(reset = false, refreshAddresses = false): Promise<Pairing> {
    if (opening.current) return opening.current;
    const current = !reset && (!snapshot || snapshot.expiresAt > Date.now()) ? pairingRef.current : null;
    if (current && !refreshAddresses) return current;
    opening.current = (async () => {
      const connection: CallConnection = current?.connection ?? { code: randomHex(12), key: randomHex(16), role: "desktop" };
      const info = fetch("/api/escalation/info", { cache: "no-store", signal: AbortSignal.timeout(5000) })
        .then(async (response) => response.ok ? await response.json() as Omit<Pairing, "connection"> : null)
        .catch(() => null);
      if (!current) await callCommand(connection, { type: "pair" });
      const lan = await info;
      const next = {
        connection,
        addresses: lan?.addresses ?? current?.addresses ?? [],
        wifiAddresses: lan ? lan.wifiAddresses : current?.wifiAddresses,
        port: lan?.port ?? current?.port ?? Number(location.port),
      };
      pairingRef.current = next;
      if (!current) {
        rememberDeskConnection(null);
        setSnapshot(null);
      }
      setPairing(next);
      return next;
    })();
    try { return await opening.current; } finally { opening.current = null; }
  }

  async function preparePairing(reset = false) {
    setError("");
    setBusy(true);
    try { await openPairing(reset, true); }
    catch { setError("Could not open the phone link."); }
    finally { setBusy(false); }
  }

  async function publishRing(connection: CallConnection, alert: PublicAlert) {
    const saved = readPhoneContact();
    const destination = saved ? { number: saved.number, name: saved.name || undefined } : undefined;
    const sent = { code: connection.code, id: alert.id, destination };
    published.current = sent;
    try {
      await callCommand(connection, { type: "ring", alert, destination });
    } catch (error) {
      if (published.current === sent) published.current = null;
      throw error;
    }
  }

  async function ring(record: EscalationRecord) {
    if (ringingNow.current || !canRingEscalation(record)) return;
    ringingNow.current = true;
    setError("");
    setBusy(true);
    const { update } = useEscalationStore.getState();
    try {
      const next = await openPairing();
      if (record.level === 3) {
        const decision = await ensureDecision(record);
        const fresh = useEscalationStore.getState().records.find(({ id }) => id === record.id);
        if (!fresh || !canRingEscalation(fresh)) return;
        const action = decision?.choice ?? "Choose a response";
        const instruction = decision ? `Review whether to ${decision.choice}` : "Choose a response on the call screen";
        const script = buildEscalationScript(fresh.trigger, instruction, fresh.thresholds);
        await publishRing(next.connection, publicAlert({ ...fresh, decision, action, script, canApprove: false }));
        return;
      }
      const cause = readCauses(record.trigger.assetId).find((current) => current.key === record.trigger.key);
      if (!cause || !thresholdCrossed(cause, useEscalationStore.getState().thresholds)) {
        setError("The threshold has cleared.");
        return;
      }
      const { plan, action, script } = recommendedBriefing(cause, record.thresholds);
      if (plan) plans.current.set(record.id, plan);
      const changed = { trigger: cause, action, script, canApprove: plan !== null };
      update(record.id, changed);
      await publishRing(next.connection, publicAlert({ ...record, ...changed }));
    } catch {
      setError("Could not ring the paired phone.");
    } finally {
      ringingNow.current = false;
      setBusy(false);
    }
  }

  const publishPending = useEffectEvent(() => {
    if (!pairing || !snapshot?.phoneConnected || busy) return;
    const call = snapshot.call;
    if (call && !call.resolvedAt && !call.acknowledgedAt && !call.approvedAt && !call.humanResponse) {
      const sent = published.current;
      if (call.dialedAt || activeRecord?.resolvedAt) { published.current = null; return; }
      if (sent?.code === pairing.connection.code && sent.id === call.alert.id
        && sent.destination?.number === contact?.number && sent.destination?.name === (contact?.name || undefined)) return;
      if (contact || call.destinationVersion) {
        void publishRing(pairing.connection, call.alert).catch(() => setError("Could not update the paired phone's destination."));
      }
      return;
    }
    published.current = null;
    if (!record || !canRingEscalation(record) || (!contact && record.level !== 3)) return;
    const key = pairing.connection.code + ":" + record.id;
    if (automaticRing.current === key) return;
    automaticRing.current = key;
    void ring(record);
  });

  useEffect(() => { publishPending(); }, [pairing, snapshot, busy, contact, records]);

  useEffect(() => {
    if (record?.level === 3 && canRingEscalation(record) && record.decision === undefined) {
      void ensureDecision(record);
    }
  }, [record]);

  useEffect(() => {
    if (!pairing || !snapshot?.phoneConnected) return;
    const { connection } = pairing;
    const { update } = useEscalationStore.getState();
    for (const { id, level, trigger, resolvedAt, dismissedAt } of records) {
      if (level !== 2) continue;
      const key = connection.code + ":" + id;
      if (resolvedAt || dismissedAt) {
        if (snapshot.messages?.some((message) => message.id === id)) {
          void callCommand(connection, { type: "clear-message", id }).catch(() => {});
        }
        continue;
      }
      if (publishedMessages.current.has(key)) continue;
      publishedMessages.current.add(key);
      update(id, { messageStatus: "pending" });
      void callCommand(connection, { type: "message", message: {
        id, tag: trigger.assetId?.slice(0, 64) ?? "Line 3", title: trigger.title.slice(0, 120),
        lossText: trigger.loss === null ? undefined : formatUsd(trigger.loss), test: trigger.test,
        simulated: trigger.kind === "simulation",
      } }).then(() => update(id, { messageStatus: "sent" }))
        .catch(() => update(id, { messageStatus: "failed" }));
    }
  }, [pairing, snapshot, records]);

  async function respond(record: EscalationRecord, response: HumanResponse) {
    const { records, update } = useEscalationStore.getState();
    const fresh = records.find(({ id }) => id === record.id);
    if (!fresh || fresh.humanResponse || fresh.resolvedAt || fresh.dismissedAt || fresh.decision === undefined) return;
    if (response.kind === "approve" && fresh.decision?.choice !== response.action) return;
    if (published.current?.id === record.id && pairing) {
      try { await callCommand(pairing.connection, { type: "respond", id: record.id, response }); }
      catch { setError("Could not record the response on the paired phone."); return; }
    }
    update(record.id, { humanResponse: response });
  }

  const onFrame = useEffectEvent((frame: PairingSnapshot, connection: CallConnection) => {
    if (pairingRef.current?.connection !== connection) return;
    rememberDeskConnection(connection, frame.expiresAt);
    setError("");
    setSnapshot(frame);
    const call = frame.call;
    if (!call) return;
    const { records, thresholds, update } = useEscalationStore.getState();
    const id = call.alert.id;
    const record = records.find((entry) => entry.id === id);
    if (!record) return;

    const actor = responderLabel.trim() || `Paired phone ${connection.code.slice(-4).toUpperCase()}`;
    const moment = (at: number): EscalationMoment => ({ at, channel: "paired-phone", actor });
    const patch: Parameters<typeof update>[1] = {};
    if (!record.ringing) patch.ringing = { at: call.ringingAt, channel: "desktop" };
    if (call.answeredAt && !record.answered) patch.answered = moment(call.answeredAt);
    if (call.audioGeneratedAt && !record.audioGenerated) patch.audioGenerated = moment(call.audioGeneratedAt);
    if (call.acknowledgedAt && !record.acknowledged) patch.acknowledged = moment(call.acknowledgedAt);
    if (call.dialedAt && !record.dialed) patch.dialed = moment(call.dialedAt);
    if (call.approvedAt && !record.approved) patch.approved = moment(call.approvedAt);
    if (call.humanResponse && !record.humanResponse) patch.humanResponse = call.humanResponse;
    if (Object.keys(patch).length) update(id, patch);

    if (record.level === 3 || !call.approvalRequestedAt || call.approvedAt || call.approvalUnavailableAt || call.resolvedAt) return;
    let decision = decisions.current.get(id);
    if (!decision) {
      const plan = plans.current.get(id);
      const cause = readCauses(record.trigger.assetId).find((current) => current.key === record.trigger.key);
      const fresh = plan && cause && thresholdCrossed(cause, thresholds) ? confirmApproval(plan, cause) : null;
      const applied = fresh !== null && applyApproval(fresh);
      decision = applied ? "approval-applied" : "approval-unavailable";
      decisions.current.set(id, decision);
      if (applied) update(id, { approved: moment(Date.now()) });
    }
    if (sentDecisions.current.has(id)) return;
    sentDecisions.current.add(id);
    void callCommand(connection, { type: decision, id }).catch(() => {
      sentDecisions.current.delete(id);
      setError("Phone approval receipt could not reach the phone.");
    });
  });

  const connection = pairing?.connection;
  useEffect(() => {
    if (!connection) return;
    return listenToCall(connection, (frame) => onFrame(frame, connection), (message, terminal) => {
      if (pairingRef.current?.connection !== connection) return;
      if (terminal) {
        rememberDeskConnection(null);
        pairingRef.current = null;
        setPairing(null);
      }
      setError(message);
      setSnapshot((current) => current && { ...current, phoneConnected: false });
    }, 1500);
  }, [connection]);

  useEffect(() => {
    if (!pairing || !activeRecord?.resolvedAt || !snapshot?.call || snapshot.call.resolvedAt) return;
    const call = snapshot.call;
    if (call.approvalRequestedAt && !call.approvalUnavailableAt && !call.approvedAt) return;
    void callCommand(pairing.connection, { type: "resolve", id: activeRecord.id }).catch(() => {});
  }, [pairing, activeRecord?.id, activeRecord?.resolvedAt, snapshot?.call]);

  return { pairing, snapshot, busy, error, preparePairing, ring, respond, record, activeRecord };
}
