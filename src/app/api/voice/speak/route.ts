/** Synthesizes the Chief's briefing and keeps a bounded, process-local WAV cache. */
import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { MODEL_IDS } from "@/gemini/models";
import { GEMINI_OUTPUT_RATE, isWav, pcmToWav } from "@/voice/wav";
import { VOICE_HEADERS, VoiceHttpError, voiceError, voiceKey } from "../response";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 1_200;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const STYLE = "Calm, clear, and professional. Speak evenly, with a brief pause between sentences.";
const cache = new Map<string, Uint8Array<ArrayBuffer>>();
let cacheBytes = 0;

function remember(hash: string, wav: Uint8Array<ArrayBuffer>) {
  if (wav.length > MAX_CACHE_BYTES) return;
  cacheBytes -= cache.get(hash)?.length ?? 0;
  cache.delete(hash);
  while (cacheBytes + wav.length > MAX_CACHE_BYTES) {
    const oldest = cache.entries().next().value;
    if (!oldest) break;
    cache.delete(oldest[0]);
    cacheBytes -= oldest[1].length;
  }
  cache.set(hash, wav);
  cacheBytes += wav.length;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const key = voiceKey(request);
    const body: unknown = await request.json().catch(() => null);
    const text = body && typeof body === "object" && "text" in body && typeof body.text === "string"
      ? body.text.trim()
      : "";
    if (!text || text.length > MAX_TEXT_LENGTH) {
      throw new VoiceHttpError(400, `Provide briefing text of 1–${MAX_TEXT_LENGTH} characters.`);
    }

    const hash = createHash("sha256").update(text).digest("hex");
    let wav = cache.get(hash);
    if (!wav) {
      const ai = new GoogleGenAI({ apiKey: key, apiVersion: "v1beta", vertexai: false });
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
      const result = await ai.interactions.create({
        model: MODEL_IDS.tts,
        input: [{
          type: "user_input",
          content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: STYLE }] }],
        }],
        response_format: { type: "audio", mime_type: "audio/wav", sample_rate: GEMINI_OUTPUT_RATE },
        generation_config: { speech_config: [{ voice: "Charon" }] },
        stream: false,
        store: false,
      }, { signal });
      const audio = result.output_audio;
      if (result.status !== "completed" || !audio?.data) {
        throw new VoiceHttpError(502, "Gemini returned no briefing audio.");
      }
      const bytes = Uint8Array.from(Buffer.from(audio.data, "base64"));
      const mimeType = audio.mime_type?.split(";", 1)[0]?.toLowerCase();
      if (isWav(bytes)) wav = bytes;
      else if (mimeType === "audio/l16" || mimeType === "audio/pcm") wav = pcmToWav(bytes);
      else throw new VoiceHttpError(502, "Gemini returned an unsupported briefing audio format.");
    }

    remember(hash, wav);
    return new Response(wav, { headers: { ...VOICE_HEADERS, "Content-Type": "audio/wav" } });
  } catch (error) {
    return voiceError(error);
  }
}
