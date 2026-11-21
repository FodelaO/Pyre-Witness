/** Owns the desktop pairing, publishes alerts, and applies confirmed phone approvals. */
"use client";

import { formatUsd } from "@/econ/format";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { callCommand, listenToCall, randomHex, type CallConnection } from "./connection.mjs";
import { readCauses } from "./evidence";
import { recommendedBriefing } from "./monitor";
import { thresholdCrossed } from "./policy";
import type { PairingSnapshot, PublicAlert } from "./protocol";
import { applyApproval, confirmApproval, type ApprovalPlan } from "./recommendation";
import { useEscalationStore } from "./store";
import type { EscalationMoment, EscalationRecord } from "./types";

interface Pairing {
  connection: CallConnection;
  addresses: string[];
  port: number;
}

function publicAlert(record: EscalationRecord): PublicAlert {
  const { trigger } = record;
  return {
    id: record.id, kind: trigger.kind, tag: trigger.assetId?.slice(0, 64) ?? null,
    room: trigger.room?.slice(0, 72) ?? null, title: trigger.title.slice(0, 120), loss: trigger.loss,
    lossText: trigger.loss === null ? undefined : formatUsd(trigger.loss),
    action: record.action.slice(0, 100), script: record.script, canApprove: record.canApprove,
  };
}

export function useCallPairing(responderLabel: string) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [snapshot, setSnapshot] = useState<PairingSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pairingRef = useRef<Pairing | null>(null);
  const opening = useRef<Promise<Pairing> | null>(null);
  const plans = useRef(new Map<string, ApprovalPlan>());
  const decisions = useRef(new Map<string, "approval-applied" | "approval-unavailable">());
  const sentDecisions = useRef(new Set<string>());
  const activeId = snapshot?.call?.alert.id;
  const activeRecord = useEscalationStore((state) => state.records.find((record) => record.id === activeId));

  async function openPairing(reset = false): Promise<Pairing> {
    if (opening.current) return opening.current;
    if (!reset && pairingRef.current && (!snapshot || snapshot.expiresAt > Date.now())) return pairingRef.current;
    opening.current = (async () => {
      const connection: CallConnection = { code: randomHex(12), key: randomHex(16), role: "desktop" };
      const info = fetch("/api/escalation/info", { cache: "no-store", signal: AbortSignal.timeout(5000) })
        .then(async (response) => response.ok ? await response.json() as Pick<Pairing, "addresses" | "port"> : null)
        .catch(() => null);
      await callCommand(connection, { type: "pair" });
      const lan = await info;
      const next = { connection, addresses: lan?.addresses ?? [], port: lan?.port ?? Number(location.port) };
      pairingRef.current = next;
      setSnapshot(null);
      setPairing(next);
      return next;
    })();
    try { return await opening.current; } finally { opening.current = null; }
  }

  async function preparePairing(reset = false) {
    setError("");
    setBusy(true);
    try { await openPairing(reset); }
    catch { setError("Could not open the phone link."); }
    finally { setBusy(false); }
  }

  async function ring(record: EscalationRecord) {
    setError("");
    setBusy(true);
    const { update } = useEscalationStore.getState();
    try {
      const next = await openPairing();
      const cause = readCauses(record.trigger.assetId).find((current) => current.key === record.trigger.key);
      if (!cause || !thresholdCrossed(cause, useEscalationStore.getState().thresholds)) {
        setError("The threshold has cleared.");
        return;
      }
      const { plan, action, script } = recommendedBriefing(cause, record.thresholds);
      if (plan) plans.current.set(record.id, plan);
      const changed = { trigger: cause, action, script, canApprove: plan !== null };
      update(record.id, changed);
      await callCommand(next.connection, { type: "ring", alert: publicAlert({ ...record, ...changed }) });
    } catch {
      setError("Could not ring the paired phone.");
    } finally {
      setBusy(false);
    }
  }

  const onFrame = useEffectEvent((frame: PairingSnapshot, connection: CallConnection) => {
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
    if (Object.keys(patch).length) update(id, patch);

    if (!call.approvalRequestedAt || call.approvedAt || call.approvalUnavailableAt || call.resolvedAt) return;
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

  useEffect(() => {
    if (!pairing) return;
    return listenToCall(pairing.connection, (frame) => onFrame(frame, pairing.connection), setError);
  }, [pairing]);

  useEffect(() => {
    if (!pairing || !activeRecord?.resolvedAt || !snapshot?.call || snapshot.call.resolvedAt) return;
    const call = snapshot.call;
    if (call.approvalRequestedAt && !call.approvalUnavailableAt && !call.approvedAt) return;
    void callCommand(pairing.connection, { type: "resolve", id: activeRecord.id }).catch(() => {});
  }, [pairing, activeRecord?.id, activeRecord?.resolvedAt, snapshot?.call]);

  return { pairing, snapshot, busy, error, preparePairing, ring };
}
