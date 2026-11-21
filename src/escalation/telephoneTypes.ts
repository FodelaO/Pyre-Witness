/** Status vocabulary used by the call API, card, and masked escalation receipts. */
export type CallMode = "twilio" | "device";
export type CarrierStatus = "queued" | "ringing" | "in-progress" | "completed" | "busy" | "no-answer" | "failed";

export interface CarrierCall {
  mode: "twilio";
  sid: string;
  status: CarrierStatus;
  maskedNumber: string;
  durationSeconds?: number;
  reason?: string;
}

export type CallResult = CarrierCall | { mode: "device"; maskedNumber: string };

export interface TelephoneReceipt {
  id: number;
  mode: CallMode;
  maskedNumber: string;
  status: CarrierStatus | "requesting" | "device-ready" | "device-opened" | "status-unavailable";
  startedAt: number;
  updatedAt: number;
  answeredAt?: number;
  durationSeconds?: number;
  reason?: string;
}

export function carrierCallPending(status: TelephoneReceipt["status"]): boolean {
  return status === "queued" || status === "ringing" || status === "in-progress";
}

export function telephoneBusy(receipt: TelephoneReceipt | undefined): boolean {
  return !!receipt && (receipt.status === "requesting" || carrierCallPending(receipt.status));
}
