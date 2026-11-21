/** Runs the production analysis directly and records its original events. */
import { runAnalyze } from "@/pipeline/server/run";
import type { CaptureInput } from "@/pipeline/types";
import type { StreamEvent } from "@/pipeline/server/sse";
import type { Twin } from "@/twin/types";
import { checkRules, makePrediction } from "./prediction";
import { shownAssessment } from "./systemScoring";
import type { RunArtifact } from "./types";

export async function runSystem(input: CaptureInput, twin: Twin, stop: AbortSignal): Promise<RunArtifact> {
  const raw: StreamEvent[] = [];
  const start = performance.now();
  const signal = AbortSignal.any([stop, AbortSignal.timeout(370_000)]);
  await runAnalyze({ input, twin }, (event) => raw.push(event), signal);
  const last = raw.at(-1);
  const latencyMs = last?.type === "run.completed" ? last.totalMs : Math.round(performance.now() - start);
  const gate = raw.find((event) => event.type === "gate.done")?.gate;
  const accepted = gate?.proceed ?? null;
  const profile = raw.find((event) => event.type === "perception.done")?.profile ?? null;
  const assessment = shownAssessment(raw);
  const filtered = raw.flatMap((event) => event.type === "selfcheck.done" ? event.result.disagreements.flatMap((detail) => {
    const match = /^Removed unknown ATT&CK for ICS technique (.+)\.$/.exec(detail);
    return match ? [match[1]] : [];
  }) : []);
  const prediction = makePrediction(accepted, profile, assessment, filtered);
  const ruleCheck = checkRules(twin, prediction);
  const asDropped = raw.find((event) => event.type === "selfcheck.done" && event.phase === "as-dropped");
  const observed = {
    latencyMs, prediction, ruleCheck, raw,
    asDroppedPassed: asDropped?.type === "selfcheck.done" ? asDropped.result.passed : null,
    gateFallback: Boolean(gate?.proceed && Object.keys(gate.answers).length === 0),
  };
  if (accepted === false) return { status: "rejected", ...observed };
  if (last?.type === "run.completed") return { status: "ok", ...observed };

  const stage = last?.type === "run.error" ? last.stage : "system";
  const message = last?.type === "run.error" ? last.message : signal.aborted ? "The system run timed out." : "The pipeline did not finish.";
  return { status: "error", ...observed, error: { stage, message, timeout: /timed?\s*out|timeout/i.test(message) } };
}
