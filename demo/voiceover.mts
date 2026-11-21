/** Narrates the demo cut with Gemini TTS: one WAV per scene, timed to demo/out/timeline.json, then mixed onto the video. */
// Usage: npx tsx --env-file=.env demo/voiceover.mts [--mix-only]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MODEL_IDS } from "../src/gemini/models";

const OUT = join(import.meta.dirname, "out");
const VOICE = join(OUT, "voice");
const RATE = 24_000;
const STYLE = "Cinematic film-trailer narrator: deep, warm and steady, with weight on key words and short dramatic pauses between sentences. Not rushed.";

// start: seconds into the cut; end: the narration must finish before this point.
const SCENES = [
  { id: "a-open", start: 0.4, end: 10.9, text: "Every week, something new walks onto the factory floor. Pyre Witness watches two fronts at once: the machines we bring in, and the threats we hear about." },
  { id: "b-equipment", start: 11.1, end: 31.7, text: "One photo of a controller. Gemini 4 reads it, and the crew drops it into a living twin of the plant. The rules engine walks every path. Visitors could reach its ports: thirty-four thousand dollars, per event. So the crew moves it somewhere safer." },
  { id: "c-information", start: 32.1, end: 45.2, text: "Meanwhile, the world keeps talking: advisories, recalls, new software. Each threat finds its machine. The crew answers with a fix." },
  { id: "d-alerts", start: 45.6, end: 55.3, text: "When danger rises: a flag, a message, a call. A human decides." },
  { id: "e-close", start: 55.6, end: 59.4, text: "Pyre Witness. Know the risk first." },
];

async function speak(ai: GoogleGenAI, text: string): Promise<Buffer> {
  const stream = await ai.interactions.create({
    model: MODEL_IDS.tts,
    input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: STYLE }] }] }],
    response_format: { type: "audio", mime_type: "audio/l16", sample_rate: RATE },
    generation_config: { speech_config: [{ voice: "Charon" }] },
    stream: true,
    store: false,
  });
  const parts: Buffer[] = [];
  for await (const event of stream) {
    if (event.event_type === "error") throw new Error("Gemini TTS returned an error event");
    if (event.event_type === "step.delta" && event.delta.type === "audio" && event.delta.data) parts.push(Buffer.from(event.delta.data, "base64"));
  }
  const pcm = Buffer.concat(parts);
  if (!pcm.length) throw new Error("Gemini TTS returned no audio");
  return pcm;
}

const seconds = (file: string) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

mkdirSync(VOICE, { recursive: true });
if (!process.argv.includes("--mix-only")) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta", vertexai: false });
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  await Promise.all(SCENES.filter((s) => !only || only.includes(s.id)).map(async (scene) => {
    const pcm = await speak(ai, scene.text);
    const raw = join(VOICE, `${scene.id}.pcm`);
    writeFileSync(raw, pcm);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", String(RATE), "-ac", "1", "-i", raw, join(VOICE, `${scene.id}.wav`)]);
    console.log(`${scene.id}: ${seconds(join(VOICE, `${scene.id}.wav`)).toFixed(2)} s (slot ${(scene.end - scene.start).toFixed(2)} s)`);
  }));
}

// Mix: each scene starts at its slot; if it runs long it is sped up (at most 1.25x) to fit.
const video = join(OUT, "pyre-witness-demo.mp4");
const total = seconds(video);
const inputs: string[] = ["-i", video];
const chains: string[] = [];
SCENES.forEach((scene, i) => {
  const wav = join(VOICE, `${scene.id}.wav`);
  if (!existsSync(wav)) throw new Error(`missing ${wav}`);
  inputs.push("-i", wav);
  const tempo = Math.min(1.3, Math.max(1, seconds(wav) / (scene.end - scene.start)));
  const ms = Math.round(scene.start * 1000);
  chains.push(`[${i + 1}:a]atempo=${tempo.toFixed(3)},adelay=${ms}|${ms}[v${i}]`);
  if (tempo > 1) console.log(`${scene.id}: sped up ${tempo.toFixed(2)}x to fit`);
});
const mix = `${chains.join(";")};${SCENES.map((_, i) => `[v${i}]`).join("")}amix=inputs=${SCENES.length}:normalize=0,volume=1.6,apad[a]`;
const out = join(OUT, "pyre-witness-demo-voice.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", total.toFixed(3), out]);
console.log(`output ${out} (${seconds(out).toFixed(2)} s)`);
JSON.parse(readFileSync(join(OUT, "timeline.json"), "utf8")); // the cut this narration was timed against
