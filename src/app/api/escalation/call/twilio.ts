/** Server-only Twilio REST transport and short-lived registry of calls created by this app. */
import { normalizePhoneNumber } from "@/escalation/phoneNumber";
import type { CarrierCall, CarrierStatus } from "@/escalation/telephoneTypes";

const ACCOUNT_SID = /^AC[0-9a-fA-F]{32}$/;
export const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const statuses: readonly CarrierStatus[] = ["queued", "ringing", "in-progress", "completed", "busy", "no-answer", "failed"];
const STATUS_TTL_MS = 10 * 60_000;

const shared = globalThis as typeof globalThis & {
  pyreTelephoneReceipts?: Map<string, { maskedNumber: string; expiresAt: number }>;
};

export function rememberCall(sid: string, maskedNumber: string) {
  const calls = shared.pyreTelephoneReceipts ??= new Map();
  const now = Date.now();
  for (const [key, receipt] of calls) if (receipt.expiresAt <= now) calls.delete(key);
  calls.set(sid, { maskedNumber, expiresAt: now + STATUS_TTL_MS });
}

export function callMask(sid: string): string | undefined {
  const receipt = shared.pyreTelephoneReceipts?.get(sid);
  return receipt && receipt.expiresAt > Date.now() ? receipt.maskedNumber : undefined;
}

export function twilioConfig() {
  const account = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = normalizePhoneNumber(process.env.TWILIO_FROM_NUMBER ?? "");
  return ACCOUNT_SID.test(account) && token && from ? { account, token, from } : null;
}

type CallUpdate = Omit<CarrierCall, "mode" | "maskedNumber">;

function decodeCall(value: unknown): CallUpdate | null {
  if (!value || typeof value !== "object") return null;
  const { sid, status: rawStatus, duration } = value as Record<string, unknown>;
  if (typeof sid !== "string" || !CALL_SID.test(sid)) return null;
  const status = rawStatus === "initiated" ? "queued" : rawStatus === "canceled" ? "failed"
    : statuses.find((known) => known === rawStatus);
  if (!status) return null;

  const update: CallUpdate = { sid, status };
  if (status === "completed" && ((typeof duration === "string" && /^\d+$/.test(duration)) || typeof duration === "number")) {
    const seconds = Number(duration);
    if (Number.isSafeInteger(seconds) && seconds >= 0) update.durationSeconds = seconds;
  }
  if (status === "failed") update.reason = rawStatus === "canceled" ? "Call canceled." : "Twilio could not complete the call.";
  return update;
}

export async function requestTwilio(
  config: NonNullable<ReturnType<typeof twilioConfig>>,
  request: { number: string; twiml: string } | { sid: string },
): Promise<CallUpdate | { error: string }> {
  const creating = "number" in request;
  const resource = creating ? "Calls.json" : "Calls/" + request.sid + ".json";
  const headers = new Headers({ Authorization: "Basic " + Buffer.from(config.account + ":" + config.token).toString("base64") });
  let body: URLSearchParams | undefined;
  if (creating) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = new URLSearchParams({ To: request.number, From: config.from, Twiml: request.twiml });
  }
  try {
    const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + config.account + "/" + resource, {
      method: creating ? "POST" : "GET",
      headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      // Provider error bodies can include the dialed number. Keep all client messages local.
      if (response.status === 401 || response.status === 403) return { error: "Twilio authorization failed. Check the server configuration." };
      if (response.status === 429) return { error: "Twilio is rate limited. Try again shortly." };
      if (creating && response.status < 500) return { error: "Twilio rejected the call. Check the destination and voice permissions." };
      return { error: creating ? "Twilio could not confirm the call request." : "Twilio call status is unavailable." };
    }
    const update = decodeCall(await response.json());
    if (update && (creating || update.sid === request.sid)) return update;
  } catch { /* Transport errors can contain request metadata. Return a fixed message. */ }
  return { error: creating ? "Twilio could not confirm the call request." : "Twilio call status is unavailable." };
}

export function callJson(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
