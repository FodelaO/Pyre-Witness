/** Exercises the real pipeline directly and prints event timing without dumping capture data. */
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { withGeminiUsage } from "@/gemini/usage";
import type { CaptureInput, PipelineEvent } from "@/pipeline/types";
import { runAnalyze } from "@/pipeline/server/run";
import { analyzeRequestSchema } from "@/pipeline/server/requests";
import { SEED_TWIN } from "@/twin/seed";

const MIME: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".heic": "image/heic", ".heif": "image/heif", ".gif": "image/gif", ".bmp": "image/bmp", ".tiff": "image/tiff",
  ".tif": "image/tiff",
};

function eventDetail(event: PipelineEvent): string {
  switch (event.type) {
    case "link.fetched":
      return event.snapshot.title;
    case "gate.done":
      return Object.entries(event.gate.answers).map(([id, answer]) =>
        `${id}=${answer.value} (confidence ${answer.confidence.toFixed(2)})`,
      ).join(", ");
    case "perception.done":
      return [event.profile.device_type, event.profile.object_class].filter(Boolean).join(" · ");
    case "reasoning.done":
    case "revision.done":
      return `${event.assessment.physical_placement.area}, Purdue ${event.assessment.placement.level}`;
    case "selfcheck.done":
      return `${event.result.passed ? "passed" : "blocked"}, ${event.result.findings.length} findings, ${event.result.paths.length} paths, ${event.result.disagreements.length} disagreements`;
    case "summary.done":
      return event.text.replace(/\n/g, " | ");
    case "run.error":
      return `${event.stage} | ${event.message}`;
    default:
      return "";
  }
}

async function main(): Promise<void> {
  const [, , description, imagePath, ...extra] = process.argv;
  const link = description === "--link";
  if (extra.length || !description?.trim() || (link && !imagePath?.trim())) {
    console.error('Usage: tsx --env-file=.env scripts/smoke-pipeline.ts "<text description>" [image-path] | --link <product-url>');
    process.exitCode = 1;
    return;
  }
  let input: CaptureInput = { kind: "text", description };
  if (link && imagePath) {
    input = { kind: "link", url: imagePath };
  } else if (imagePath) {
    const mimeType = MIME[extname(imagePath).toLowerCase()];
    if (!mimeType) throw new Error("Use an image with a supported file extension, such as .jpg, .png, or .webp.");
    const dataBase64 = await readFile(imagePath, "base64");
    input = { kind: "photo", note: description, images: [{ mimeType, dataBase64 }] };
  }
  const validated = analyzeRequestSchema.safeParse({ input, twin: SEED_TWIN });
  if (!validated.success) throw new Error("Invalid smoke capture. Use a short description, an image under 4 MB, or an HTTP(S) product URL.");

  const controller = new AbortController();
  const abort = () => {
    controller.abort();
    process.exitCode = 130;
  };
  process.once("SIGINT", abort);
  let completed = false;
  let inspectorPhase = "as-dropped";
  const start = performance.now();
  try {
    await withGeminiUsage((model, usage) => {
      console.log(`${Math.round(performance.now() - start)}ms tokens | ${model} ${JSON.stringify(usage)}`);
    }, () => runAnalyze(validated.data, (event) => {
      const time = Math.round(performance.now() - start);
      const latency = "latencyMs" in event ? ` +${event.latencyMs}ms` : "";
      const detail = eventDetail(event);
      if (event.type === "reasoning.started") inspectorPhase = "recommendation";
      if (event.type === "revision.done") inspectorPhase = "post-revision";
      const phase = event.type.startsWith("selfcheck.")
        ? ` [${"phase" in event && typeof event.phase === "string" ? event.phase : inspectorPhase}]`
        : "";
      console.log(`${time}ms ${event.type}${phase}${latency}${detail ? ` | ${detail}` : ""}`);
      if (event.type === "run.completed") completed = true;
    }, controller.signal));
  } finally {
    process.off("SIGINT", abort);
  }
  if (!completed && !controller.signal.aborted) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Smoke pipeline failed.");
  process.exitCode = 1;
});
