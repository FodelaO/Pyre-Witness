/** Starts admitted calls and tracks their masked receipts independently of which card is visible. */
"use client";

import { useEffect, useState } from "react";
import { createAutomaticCallDebounce } from "./automaticCalls";
import type { PhoneContact } from "./phoneContact";
import { maskPhoneNumber } from "./phoneNumber";
import { getCallMode, getCallStatus, openDeviceDialer, placeCall } from "./placeCall";
import { useEscalationStore } from "./store";
import { carrierCallPending, telephoneBusy, type CallMode, type CarrierCall, type TelephoneReceipt } from "./telephoneTypes";
import type { EscalationRecord } from "./types";

const takeAutomatic = createAutomaticCallDebounce();
const POLL_INTERVAL_MS = 1_500;
const POLL_LIMIT_MS = 2 * 60_000;
let receiptId = 0;

function updateReceipt(recordId: string, receipt: TelephoneReceipt) {
  const { records, update } = useEscalationStore.getState();
  const calls = records.find(({ id }) => id === recordId)?.telephoneCalls ?? [];
  const exists = calls.some(({ id }) => id === receipt.id);
  update(recordId, { telephoneCalls: exists
    ? calls.map((previous) => previous.id === receipt.id ? receipt : previous)
    : [...calls, receipt] });
}

function newReceipt(mode: CallMode, status: TelephoneReceipt["status"], number: string): TelephoneReceipt {
  const now = Date.now();
  return { id: ++receiptId, mode, status, maskedNumber: maskPhoneNumber(number), startedAt: now, updatedAt: now };
}

function carrierReceipt(receipt: TelephoneReceipt, { status, durationSeconds, reason }: CarrierCall): TelephoneReceipt {
  const now = Date.now();
  return {
    ...receipt, status, durationSeconds, reason, updatedAt: now,
    answeredAt: receipt.answeredAt ?? (status === "in-progress" ? now : undefined),
  };
}

async function pollCarrier(recordId: string, sid: string, receipt: TelephoneReceipt) {
  const stopAt = Date.now() + POLL_LIMIT_MS;
  let current = receipt;
  let misses = 0;
  while (carrierCallPending(current.status) && Date.now() < stopAt) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const outcome = await getCallStatus(sid);
      misses = 0;
      if (outcome.status === current.status) continue;
      current = carrierReceipt(current, outcome);
      updateReceipt(recordId, current);
    } catch {
      if (++misses >= 3) break;
    }
  }
  if (carrierCallPending(current.status)) {
    updateReceipt(recordId, { ...current, status: "status-unavailable", updatedAt: Date.now() });
  }
}

function liveRecord(id: string): EscalationRecord | undefined {
  return useEscalationStore.getState().records.find((record) => record.id === id && !record.resolvedAt && !record.dismissedAt);
}

async function dialCarrier(id: string, number: string, automatic: boolean): Promise<CallMode | undefined> {
  const record = liveRecord(id);
  if (!record || telephoneBusy(record.telephoneCalls?.at(-1))) return;
  const receipt = newReceipt("twilio", "requesting", number);
  updateReceipt(id, receipt);
  try {
    const outcome = await placeCall(number, record.script, automatic);
    if (outcome.mode === "device") {
      updateReceipt(id, { ...receipt, mode: "device", status: "device-ready", updatedAt: Date.now() });
    } else {
      const latest = carrierReceipt(receipt, outcome);
      updateReceipt(id, latest);
      if (carrierCallPending(outcome.status)) void pollCarrier(id, outcome.sid, latest);
    }
    return outcome.mode;
  } catch (error) {
    updateReceipt(id, { ...receipt, status: "failed", updatedAt: Date.now(),
      reason: error instanceof Error ? error.message : "Call could not be placed." });
  }
}

export function useTelephoneCalls(contact: PhoneContact | null, records: EscalationRecord[]) {
  const [mode, setMode] = useState<CallMode | null>(null);

  useEffect(() => {
    let mounted = true;
    void getCallMode().then((value) => { if (mounted) setMode(value); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (mode !== "twilio" || !contact?.consent) return;
    const eligible = records.filter((record) => !record.resolvedAt && !record.dismissedAt && !record.telephoneCalls?.length)
      .sort((a, b) => Number(!!b.trigger.test) - Number(!!a.trigger.test) || a.raisedAt - b.raisedAt);
    const record = takeAutomatic(eligible);
    if (record) void dialCarrier(record.id, contact.number, true).then((result) => {
      if (result === "device") setMode(result);
    });
  }, [contact, mode, records]);

  function callFromDevice(id: string) {
    const record = liveRecord(id);
    if (!contact || !record || telephoneBusy(record.telephoneCalls?.at(-1))) return;
    const receipt = newReceipt("device", "device-opened", contact.number);
    try { openDeviceDialer(contact.number); }
    catch { updateReceipt(id, { ...receipt, status: "failed", reason: "Could not open the device dialer." }); return; }
    updateReceipt(id, receipt);
  }

  function callNow(id: string) {
    if (mode === "twilio" && contact) {
      void dialCarrier(id, contact.number, false).then((result) => { if (result) setMode(result); });
    }
  }

  return { mode, callFromDevice, callNow };
}
