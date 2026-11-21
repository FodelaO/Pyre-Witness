/** Sends the destination only in a call POST and hands device-mode dialing to the browser. */
import type { CallMode, CallResult, CarrierCall } from "./telephoneTypes";

const ENDPOINT = "/api/escalation/call";

async function requestCall<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  let payload: T & { error?: string };
  try {
    response = await fetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      ...init,
    });
    payload = await response.json();
  } catch {
    throw new Error("Could not reach the call service.");
  }
  if (!response.ok) throw new Error(payload?.error || "Call service unavailable.");
  return payload;
}

export async function getCallMode(): Promise<CallMode> {
  return (await requestCall<{ mode: CallMode }>(ENDPOINT)).mode;
}

export function placeCall(number: string, script: string, automatic: boolean): Promise<CallResult> {
  return requestCall(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number, script, automatic }),
  });
}

export function getCallStatus(sid: string): Promise<CarrierCall> {
  return requestCall(ENDPOINT + "/" + encodeURIComponent(sid));
}

/** Must run directly inside the operator's click to keep browser user activation. */
export function openDeviceDialer(number: string) {
  const link = document.createElement("a");
  link.href = "tel:" + number;
  link.hidden = true;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); }
}
