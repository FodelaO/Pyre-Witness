/** Gives both server-side voice routes bounded requests and sanitized JSON errors. */
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { sharedRateLimit, type RateLimit } from "@/app/api/health/rateLimit";

export const VOICE_HEADERS = { "Cache-Control": "no-store" };

export class VoiceHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/** Per-process budgets: Live sessions are billed per minute of audio, speech per uncached text. */
// The client keeps one Live link open across turns and reconnects after 90 s idle or an error,
// so twenty new sessions in five minutes leaves room for a talkative demo on a poor network.
export const voiceSessions = sharedRateLimit("voice-session", 20, 5 * 60_000);
export const voiceSpeech = sharedRateLimit("voice-speak", 30, 5 * 60_000);

export function voiceBudget(limit: RateLimit, what: string): void {
  const wait = limit.take();
  if (wait) throw new VoiceHttpError(429, `${what} is rate limited on this server. Try again in ${wait} s.`);
}

export function voiceKey(request: Request): string {
  if (crossOriginRejection(request)) {
    throw new VoiceHttpError(403, "Open Pyre Witness to use Chief voice.");
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new VoiceHttpError(503, "Chief voice needs GEMINI_API_KEY on the server.");
  return key;
}

export function voiceError(error: unknown): Response {
  let status = 502;
  let message = "Gemini voice is unavailable. Try again shortly.";
  if (error instanceof VoiceHttpError) {
    ({ status, message } = error);
  } else if (error instanceof Error && error.name === "TimeoutError") {
    status = 504;
    message = "Gemini voice took too long. Try again.";
  } else if (error && typeof error === "object" && "status" in error) {
    switch (error.status) {
      case 401:
      case 403:
        message = "Gemini denied voice access. Check the server key and its model permissions.";
        break;
      case 404:
        message = "The configured Gemini voice model is unavailable.";
        break;
      case 429:
        status = 429;
        message = "Gemini voice is rate limited or out of quota. Try again shortly.";
        break;
      case 400:
        message = "Gemini rejected the voice request. Check the configured model.";
        break;
    }
  }
  return Response.json({ error: message }, { status, headers: VOICE_HEADERS });
}
