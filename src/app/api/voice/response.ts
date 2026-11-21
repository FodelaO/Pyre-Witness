/** Gives both server-side voice routes bounded requests and sanitized JSON errors. */
export const VOICE_HEADERS = { "Cache-Control": "no-store" };

export class VoiceHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function voiceKey(request: Request): string {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
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
