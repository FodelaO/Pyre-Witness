/** Reports the dialing mode and accepts a bounded, rate-limited alert call request. */
import { z } from "zod";
import { BodyError, readBoundedJson } from "@/app/api/health/boundedJson";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { sharedRateLimit, tooManyRequests } from "@/app/api/health/rateLimit";
import { AUTOMATIC_CALL_COOLDOWN_MS } from "@/escalation/automaticCalls";
import { maskPhoneNumber, normalizePhoneNumber } from "@/escalation/phoneNumber";
import { buildTwiml } from "./twiml";
import { callJson, rememberCall, requestTwilio, twilioConfig } from "./twilio";

export const runtime = "nodejs";

const callRequest = z.strictObject({
  number: z.string().max(48),
  script: z.string().trim().min(1).max(480),
  automatic: z.boolean().default(false),
});

export function GET(request: Request) {
  return crossOriginRejection(request) ?? callJson({ mode: twilioConfig() ? "twilio" : "device" });
}

export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  let body: unknown;
  try { body = await readBoundedJson(request, 4_096); }
  catch (error) { return callJson({ error: "Send a valid call request." }, error instanceof BodyError ? error.status : 400); }

  const parsed = callRequest.safeParse(body);
  if (!parsed.success) return callJson({ error: "Send a valid call request." }, 400);
  const { script, automatic } = parsed.data;
  const number = normalizePhoneNumber(parsed.data.number);
  if (!number) return callJson({ error: "Enter an international phone number starting with +." }, 400);
  const maskedNumber = maskPhoneNumber(number);
  const config = twilioConfig();
  if (!config) return callJson({ mode: "device", maskedNumber });

  const twiml = buildTwiml(script);
  if (twiml.length > 4_000) return callJson({ error: "The alert is too long to read on a call." }, 400);
  const callLimit = sharedRateLimit("escalation-call", 3, 10 * 60_000);
  const autoLimit = automatic ? sharedRateLimit("escalation-auto-call", 1, AUTOMATIC_CALL_COOLDOWN_MS) : null;
  const wait = Math.max(callLimit.blocked(), autoLimit?.blocked() ?? 0);
  if (wait) return tooManyRequests(wait, "Calling");
  callLimit.take();
  autoLimit?.take();

  const outcome = await requestTwilio(config, { number, twiml });
  if ("error" in outcome) return callJson(outcome, 502);
  rememberCall(outcome.sid, maskedNumber);
  return callJson({ mode: "twilio", ...outcome, maskedNumber }, 201);
}
