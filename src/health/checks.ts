/** Exercises each Google integration and the three Watch publishers with tiny real requests. */
import { GoogleGenAI, type Interactions } from "@google/genai";
import { z } from "zod";
import { MODEL_IDS } from "@/gemini/models";
import { geminiClients, noSdkRetries, structuredInteraction } from "@/gemini/transport";
import { GEMINI_OUTPUT_RATE } from "@/voice/wav";
import { WATCH_SOURCES } from "@/watch/sources";
import { checkFiles, checkLive } from "./mediaChecks";
import { classifyProbeFailure, healthErrorDetail, runCheck, type Probe } from "./probe";
import { probePng } from "./probePng";
import { HEALTH_PROBE_TIMEOUT_MS, SERVICES, type HealthResult, type HealthService } from "./services";

export interface HealthCheck {
  service: HealthService;
  run: () => Promise<HealthResult>;
}

const options = (signal: AbortSignal) => ({ signal, retries: noSdkRetries });
const shortGeneration = { thinking_level: "low", max_output_tokens: 512 } as const;

async function decisions(signal: AbortSignal): Promise<string> {
  const result = await geminiClients().decisions.create({
    model: MODEL_IDS.decisions,
    input: "This is a photo of a temperature sensor.",
    questions: { equipment: { type: "noul", instructions: "Is equipment described?" } },
  }, options(signal));
  const answer = result.answers?.equipment;
  if (answer?.type !== "noul" || !Number.isFinite(answer.noul) || answer.noul <= 0.5 || answer.noul > 1) {
    throw new Error("Expected a yes score for the equipment question.");
  }
  return `Yes/no score returned (${answer.noul.toFixed(2)} yes).`;
}

async function perception(signal: AbortSignal): Promise<string> {
  const { value } = await structuredInteraction(geminiClients().interactions, z.object({ color: z.string(), shape: z.string() }), {
    model: MODEL_IDS.perception,
    input: [
      { type: "text", text: "Name the center shape and its basic color. Use one word per field." },
      { type: "image", mime_type: "image/png", data: probePng().toString("base64") },
    ],
    generation_config: shortGeneration,
    store: false,
  }, signal, undefined, { attempts: 1 });
  if (!/\bgreen\b/i.test(value.color) || !/\bsquare\b/i.test(value.shape)) throw new Error("Expected a green square in the PNG.");
  return "Identified the green square in a 64 × 64 PNG.";
}

async function reasoning(signal: AbortSignal): Promise<string> {
  const { value } = await structuredInteraction(geminiClients().interactions, z.object({ sum: z.number().int() }), {
    model: MODEL_IDS.reasoning,
    input: "Add 2 and 3.",
    generation_config: shortGeneration,
    store: false,
  }, signal, undefined, { attempts: 1 });
  if (value.sum !== 5) throw new Error("Expected the structured sum to be 5.");
  return "Returned the correct structured sum with low thinking.";
}

async function briefing(signal: AbortSignal): Promise<string> {
  const result = await geminiClients().interactions.create({
    model: MODEL_IDS.chief,
    input: "Say 'The pump is ready.' in one short sentence.",
    generation_config: shortGeneration,
    store: false,
    stream: false,
    automatic_continuation: false,
  }, options(signal));
  const text = result.output_text?.trim();
  if (result.status !== "completed" || !text || text.length > 120 || /[\r\n]/.test(text)) {
    throw new Error(`Expected one short sentence (interaction ${result.status}).`);
  }
  return "Returned a short briefing with low thinking.";
}

async function speech(signal: AbortSignal): Promise<string> {
  const stream = await geminiClients().interactions.create({
    model: MODEL_IDS.tts,
    input: [{ type: "user_input", content: [{ type: "text", text: "Systems ready." }] }],
    response_format: { type: "audio", mime_type: "audio/l16", sample_rate: GEMINI_OUTPUT_RATE },
    generation_config: { speech_config: [{ voice: "Charon" }] },
    stream: true,
    store: false,
  }, options(signal));
  let bytes = 0;
  for await (const event of stream) {
    if (event.event_type === "error") throw new Error(event.error?.message ?? "Gemini interrupted speech generation.");
    if (event.event_type === "step.delta" && event.delta.type === "audio" && event.delta.data) {
      bytes += Buffer.from(event.delta.data, "base64").byteLength;
    }
    if (event.event_type === "interaction.completed") {
      if (event.interaction?.status === "completed" && bytes > 0 && bytes % 2 === 0) return `Received ${bytes} bytes of speech audio.`;
      break;
    }
  }
  throw new Error("Gemini finished without complete speech audio.");
}

async function image(signal: AbortSignal): Promise<string> {
  const size = "512" satisfies Interactions.ImageResponseFormat["image_size"];
  const result = await geminiClients().interactions.create({
    model: MODEL_IDS.image,
    input: "A solid blue square on a plain white background.",
    generation_config: { thinking_level: "minimal" },
    response_format: { type: "image", aspect_ratio: "1:1", image_size: size, mime_type: "image/jpeg" },
    store: false,
    stream: false,
    automatic_continuation: false,
  }, options(signal));
  const output = Buffer.from(result.output_image?.data ?? "", "base64");
  if (result.status !== "completed" || !output.length) throw new Error(`No image bytes returned (interaction ${result.status}).`);
  return `Received ${output.length} image bytes at ${size} resolution.`;
}

async function managedAgent(signal: AbortSignal): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing on the server.");
  const client = new GoogleGenAI({ apiKey, apiVersion: "v1beta", vertexai: false });
  await client.agents.list({ page_size: 1 }, options(signal));
  return "Agents API list responded (metadata only).";
}

async function feeds(signal: AbortSignal): Promise<string> {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS - 500)]);
  const probes = Object.entries(WATCH_SOURCES).map(async ([source, { label, url }]) => {
    try {
      const headSignal = AbortSignal.any([deadline, AbortSignal.timeout(4_000)]);
      let response = await fetch(url, { method: "HEAD", signal: headSignal, cache: "no-store" }).catch(() => null);
      if (!response || response.status === 405 || response.status === 501) {
        response = await fetch(url, { headers: { Range: "bytes=0-511" }, signal: deadline, cache: "no-store" });
      }
      const type = response.headers.get("content-type") ?? "";
      await response.body?.cancel();
      if (!response.ok) return { label, ok: false, status: response.status, detail: `HTTP ${response.status}` };
      const expected = source === "cisa-kev" ? /\bjson\b/i : /\bxml\b/i;
      if (!expected.test(type)) return { label, ok: false, detail: `Unexpected content type (${type || "missing"})` };
      return { label, ok: true, detail: `HTTP ${response.status}` };
    } catch (error) {
      return { label, ok: false, failure: classifyProbeFailure(error), detail: deadline.aborted ? "Timed out" : healthErrorDetail(error) };
    }
  });
  const results = await Promise.all(probes);
  const detail = results.map(({ label, detail }) => `${label} ${detail}`).join(" · ");
  const httpStatus = results.find(({ status }) => status && status >= 400 && status < 600)?.status;
  if (httpStatus) throw Object.assign(new Error(detail), { status: httpStatus });
  if (results.some(({ failure }) => failure === "timeout")) throw new DOMException(detail, "TimeoutError");
  if (results.some(({ failure }) => failure === "aborted")) throw new DOMException(detail, "AbortError");
  if (results.some(({ ok }) => !ok)) throw new Error(detail);
  return detail;
}

const probes = {
  decisions, perception, reasoning, briefing, speech, live: checkLive, image,
  files_video: checkFiles, managed_agent: managedAgent, feeds,
} satisfies Record<(typeof SERVICES)[number]["id"], Probe>;

export const HEALTH_CHECKS: readonly HealthCheck[] = SERVICES.map((service) => ({
  service,
  run: () => runCheck(service, probes[service.id], service.id === "image" ? 30_000 : HEALTH_PROBE_TIMEOUT_MS),
}));
