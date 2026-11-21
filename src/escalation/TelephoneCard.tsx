/** Displays call controls and masked carrier or dialer receipts on the escalation card. */
"use client";

import { Phone } from "lucide-react";
import { telephoneBusy, type CallMode, type TelephoneReceipt } from "./telephoneTypes";

function receiptText({ status, maskedNumber, durationSeconds, reason }: TelephoneReceipt): string {
  switch (status) {
    case "requesting": return "Calling " + maskedNumber;
    case "queued":
    case "ringing": return "Calling " + maskedNumber + " · " + status;
    case "in-progress": return maskedNumber + " · answered";
    case "completed": return maskedNumber + " · completed" + (durationSeconds === undefined ? "" : " (" + durationSeconds + " s)");
    case "no-answer": return maskedNumber + " · no answer";
    case "busy": return maskedNumber + " · busy";
    case "device-opened": return maskedNumber + " · dialer requested";
    case "device-ready": return maskedNumber + " · call from this device";
    case "failed": return maskedNumber + " · failed: " + (reason ?? "Call could not be placed.");
    case "status-unavailable": return maskedNumber + " · status unavailable";
  }
}

export function TelephoneCard({ mode, maskedNumber, receipt, resolved, onCall, onDevice }: {
  mode: CallMode | null;
  maskedNumber?: string;
  receipt?: TelephoneReceipt;
  resolved: boolean;
  onCall: () => void;
  onDevice: () => void;
}) {
  const channel = receipt?.mode ?? mode;
  const label = channel === "twilio" ? "Automatic call via Twilio" : channel === "device"
    ? receipt?.status === "device-opened" ? "Call placed from this device · no carrier integration" : null
    : null;

  return <div className="pw-es-telephone">
    {receipt ? <div className="pw-es-tel-status" role="status">
      <span>{receiptText(receipt)}</span>
      <time dateTime={new Date(receipt.updatedAt).toISOString()}>
        {new Date(receipt.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </time>
    </div> : maskedNumber && <div className="pw-es-tel-status">{maskedNumber}</div>}
    {label && <div className="pw-es-note">{label}</div>}
    {!resolved && <div className="pw-es-tel-actions">
      <button type="button" className="pw-es-text-button" onClick={onDevice} disabled={telephoneBusy(receipt)}>
        <Phone size={14} aria-hidden /> {maskedNumber ? "Call from this device" : "Add your phone"}
      </button>
      {mode === "twilio" && maskedNumber && <button type="button" className="pw-es-text-button" onClick={onCall}
        disabled={telephoneBusy(receipt)}>Call now</button>}
    </div>}
  </div>;
}
