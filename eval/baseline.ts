/** Runs one Hydrogen interaction with the evidence and a prose description of the plant. */
import { z } from "zod";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { MODEL_ATTEMPTS, noSdkRetries, providerDiagnostic, providerFailure, waitForRetry, type GeminiClients } from "@/gemini/transport";
import { fetchProductPage } from "@/link/fetchProductPage";
import { interruptible } from "@/pipeline/server/deadline";
import { captureImageSchema } from "@/pipeline/server/requests";
import type { CaptureInput, LinkSnapshot } from "@/pipeline/types";
import { PURDUE_LEVELS, type Twin } from "@/twin/types";
import { BASELINE_PROMPT, baselineEvidence, baselineResponseSchema, baselineSchema } from "./baselineContract";
import { checkRules, makePrediction } from "./prediction";
import type { RunArtifact } from "./types";

export { BASELINE_CONTRACT } from "./baselineContract";
export const BASELINE_DEADLINE_MS = 45_000;
const schema = baselineSchema();

function describePlant(twin: Twin): string {
  const rooms = twin.areas.map(({ id, name, attrs, typicalLevels, statusNote }) => {
    const conditions = [attrs.outdoor && "outdoors", attrs.publicAccess && "public access", attrs.restricted && "restricted access",
      attrs.washdown && "high-pressure washdown", attrs.hazard && `${attrs.hazard} hazard`, attrs.foodContact && "food contact"].filter(Boolean);
    return `- ${name} (${id}) typically houses Purdue ${typicalLevels.join(" or ")} equipment.`
      + (conditions.length ? ` Conditions include ${conditions.join(", ")}.` : "") + (statusNote ? ` ${statusNote}.` : "");
  });
  const zones = new Map<number, Set<string>>();
  for (const { network } of twin.assets) {
    const names = zones.get(network.level) ?? new Set();
    names.add(network.area);
    zones.set(network.level, names);
  }
  const network = PURDUE_LEVELS.map(({ level, name, blurb }) => {
    const names = [...(zones.get(level) ?? [])];
    return `- Purdue ${level}, ${name}. ${blurb}.` + (names.length ? ` Named zones include ${names.join(", ")}.` : "");
  });
  const conduits = twin.conduits.map(({ id, from, to }) => `- ${id} connects ${from} and ${to}.`);
  return [
    `${twin.plant.name}, ${twin.plant.line}, is a fictional cola bottling plant. Water treatment and the syrup room supply blending and carbonation, then filling and packaging. Utilities provide cooling and cleaning.`,
    "Plant rooms and conditions", ...rooms, "Purdue networks", ...network, "Named conduits", ...conduits,
  ].join("\n");
}

const fetchLink: (url: string, options?: { signal: AbortSignal }) => Promise<LinkSnapshot> = fetchProductPage;

async function oneInteraction<T>(request: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await interruptible(signal, request);
    } catch (error) {
      if (attempt + 1 >= MODEL_ATTEMPTS) throw error;
      await waitForRetry(error, signal, attempt);
    }
  }
}

export async function runBaseline(client: GeminiClients["interactions"], input: CaptureInput, twin: Twin, stop: AbortSignal): Promise<RunArtifact> {
  const start = performance.now();
  let stage = input.kind === "link" ? "link" : "baseline";
  let signal = AbortSignal.any([stop, AbortSignal.timeout(input.kind === "link" ? 18_000 : BASELINE_DEADLINE_MS)]);
  let raw: unknown = null;
  try {
    let snapshot: LinkSnapshot | undefined;
    if (input.kind === "link") {
      const link = await fetchLink(input.url, { signal });
      signal.throwIfAborted();
      const image = captureImageSchema.safeParse(link.image);
      snapshot = { ...link, image: image.success ? image.data : null };
      stage = "baseline";
      signal = AbortSignal.any([stop, AbortSignal.timeout(BASELINE_DEADLINE_MS)]);
    }
    const response = await oneInteraction(() => client.create({
      model: MODEL_IDS.perception,
      system_instruction: BASELINE_PROMPT,
      input: [{ type: "text", text: `${describePlant(twin)}\n\nCapture evidence\n` }, ...baselineEvidence(input, snapshot)],
      generation_config: { thinking_level: THINKING.perception },
      response_format: { type: "text", mime_type: "application/json", schema: baselineResponseSchema },
      stream: false,
      store: false,
      automatic_continuation: false,
    }, { signal, retries: noSdkRetries }), signal);
    const text = response.output_text?.trim() || response.steps?.findLast((step) => step.type === "model_output")
      ?.content?.map((part) => part.type === "text" ? part.text : "").join("");
    raw = { interactionId: response.id, status: response.status, usage: response.usage, text };
    signal.throwIfAborted();
    stage = "baseline response";
    if (response.status !== "completed" || !text) throw new Error("Incomplete structured output");
    const value = schema.parse(JSON.parse(text));
    if (value.is_device && !value.profile) throw new Error("Missing positive device profile");
    if (value.is_device && Boolean(value.placement) !== Boolean(value.physical_placement)) throw new Error("Incomplete recommendation");
    const assessment = value.is_device ? {
      ...value, placement: value.placement ?? undefined, physical_placement: value.physical_placement ?? undefined,
    } : null;
    const prediction = makePrediction(value.is_device, value.is_device ? value.profile : null, assessment);
    const latencyMs = Math.round(performance.now() - start);
    return { status: value.is_device ? "ok" : "rejected", latencyMs, prediction, ruleCheck: checkRules(twin, prediction), raw };
  } catch (error) {
    if (stage === "baseline" && !signal.aborted && raw === null) {
      const { status, code } = providerDiagnostic(error);
      raw = { providerStatus: status, providerCode: code };
    }
    const locations = error instanceof z.ZodError ? [...new Set(error.issues.map(({ path }) => path.join(".")))].slice(0, 5) : [];
    const message = signal.aborted ? `The ${stage} stage timed out.` : stage === "link" ? "Could not read this product page."
      : stage === "baseline response" ? `Hydrogen returned an invalid or incomplete structured response${locations.length ? ` in ${locations.join(", ")}` : ""}.`
        : providerFailure(error);
    return { status: "error", latencyMs: Math.round(performance.now() - start), prediction: null, ruleCheck: null,
      error: { stage, message, timeout: signal.aborted }, raw };
  }
}
