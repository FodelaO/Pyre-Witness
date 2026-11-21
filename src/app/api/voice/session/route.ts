/** Mints a one-use Gemini Live token with a locked Chief session configuration. */
import { VOICE_HEADERS, VoiceHttpError, voiceError, voiceKey } from "../response";
import { chiefSetup } from "./setup";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const key = voiceKey(request);
    const now = Date.now();
    const expiresAt = new Date(now + 8 * 60_000).toISOString();
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime: expiresAt,
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        bidiGenerateContentSetup: chiefSetup,
      }),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return voiceError({ status: response.status });
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("name" in result)
      || typeof result.name !== "string" || !result.name.startsWith("auth_tokens/")) {
      throw new VoiceHttpError(502, "Gemini did not issue a Live voice token.");
    }
    return Response.json({ token: result.name, expiresAt }, { headers: VOICE_HEADERS });
  } catch (error) {
    return voiceError(error);
  }
}
