/** Streams Chief speech and serves complete WAV to callers that request a file. */
import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { MODEL_IDS } from "@/gemini/models";
import { GEMINI_OUTPUT_RATE, isWav, pcmToWav } from "@/voice/wav";
import { BodyError, readBoundedJson } from "@/app/api/health/boundedJson";
import { VOICE_HEADERS, VoiceHttpError, voiceBudget, voiceError, voiceKey, voiceSpeech } from "../response";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 1_200;
// 1,200 characters are at most 4.8 kB of UTF-8 and at most 7.2 kB when fully \u-escaped.
const MAX_BODY_BYTES = 16 * 1024;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const STYLE = "Calm, clear, and professional. Speak evenly, with a brief pause between sentences.";
const PCM_MIME = `audio/pcm;rate=${GEMINI_OUTPUT_RATE};channels=1`;
const cache = new Map<string, Uint8Array<ArrayBuffer>>();
let cacheBytes = 0;

function remember(hash: string, pcm: Uint8Array<ArrayBuffer>) {
  cacheBytes -= cache.get(hash)?.length ?? 0;
  cache.delete(hash);
  while (cacheBytes + pcm.length > MAX_CACHE_BYTES) {
    const oldest = cache.entries().next().value;
    if (!oldest) break;
    cache.delete(oldest[0]);
    cacheBytes -= oldest[1].length;
  }
  cache.set(hash, pcm);
  cacheBytes += pcm.length;
}

type BriefingAudio = AsyncGenerator<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>;

async function* generate(key: string, text: string, hash: string, signal: AbortSignal): BriefingAudio {
  const ai = new GoogleGenAI({ apiKey: key, apiVersion: "v1beta", vertexai: false });
  const stream = await ai.interactions.create({
    model: MODEL_IDS.tts,
    input: [{
      type: "user_input",
      content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: STYLE }] }],
    }],
    response_format: { type: "audio", mime_type: "audio/l16", sample_rate: GEMINI_OUTPUT_RATE },
    generation_config: { speech_config: [{ voice: "Charon" }] },
    stream: true,
    store: false,
  }, { signal });
  const fragments: Uint8Array[] = [];
  let bytes = 0;
  for await (const event of stream) {
    signal.throwIfAborted();
    if (event.event_type === "error") break;
    if (event.event_type === "interaction.completed") {
      if (event.interaction?.status !== "completed") break;
      if (!bytes || bytes % 2 !== 0) throw new VoiceHttpError(502, "Gemini returned incomplete briefing audio.");
      const pcm = new Uint8Array(bytes);
      let offset = 0;
      for (const fragment of fragments) {
        pcm.set(fragment, offset);
        offset += fragment.length;
      }
      remember(hash, pcm);
      return pcm;
    }
    if (event.event_type !== "step.delta" || event.delta.type !== "audio" || !event.delta.data) continue;
    const fragment = Uint8Array.from(Buffer.from(event.delta.data, "base64"));
    const mimeType = event.delta.mime_type?.split(";", 1)[0]?.toLowerCase();
    if ((mimeType && mimeType !== "audio/l16" && mimeType !== "audio/pcm") || (!bytes && isWav(fragment))) {
      throw new VoiceHttpError(502, "Gemini returned an unsupported briefing audio format.");
    }
    if (!fragment.length) continue;
    bytes += fragment.length;
    if (bytes > MAX_CACHE_BYTES) throw new VoiceHttpError(502, "Gemini returned a briefing that is too long.");
    fragments.push(fragment);
    yield fragment;
  }
  throw new VoiceHttpError(502, "Gemini could not finish the briefing audio.");
}

function streamAudio(audio: BriefingAudio, first: Uint8Array<ArrayBuffer>, abort: AbortController) {
  return new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) { controller.enqueue(first); },
    async pull(controller) {
      try {
        const next = await audio.next();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch {
        controller.error(new Error("Gemini could not finish the briefing audio."));
      }
    },
    async cancel() {
      abort.abort();
      await audio.return(new Uint8Array(0)).catch(() => undefined);
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const key = voiceKey(request);
    const body: unknown = await readBoundedJson(request, MAX_BODY_BYTES).catch((error: unknown) => {
      if (error instanceof BodyError && error.status !== 400) throw new VoiceHttpError(error.status, error.message);
      return null;
    });
    const text = body && typeof body === "object" && "text" in body && typeof body.text === "string"
      ? body.text.trim()
      : "";
    if (!text || text.length > MAX_TEXT_LENGTH) {
      throw new VoiceHttpError(400, `Provide briefing text of 1–${MAX_TEXT_LENGTH} characters.`);
    }

    const wantsPcm = request.headers.get("accept")?.split(",").some((type) => type.split(";")[0].trim() === "audio/pcm");
    const headers = { ...VOICE_HEADERS, Vary: "Accept", "Content-Type": wantsPcm ? PCM_MIME : "audio/wav" };
    const hash = createHash("sha256").update(text).digest("hex");
    const cached = cache.get(hash);
    if (cached) {
      remember(hash, cached);
      return new Response(wantsPcm ? cached : pcmToWav(cached), { headers });
    }
    // Only uncached text reaches the speech model, so only that uses the budget.
    voiceBudget(voiceSpeech, "Chief speech");

    const abort = new AbortController();
    const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(30_000)]);
    const audio = generate(key, text, hash, signal);
    let next = await audio.next();
    if (wantsPcm && !next.done) return new Response(streamAudio(audio, next.value, abort), { headers });
    while (!next.done) next = await audio.next();
    return new Response(pcmToWav(next.value), { headers });
  } catch (error) {
    return voiceError(error);
  }
}
