/** Runs the production analysis directly and records its original events. */
import { runAnalyze } from "@/pipeline/server/run";
import type { CaptureInput, PipelineEvent } from "@/pipeline/types";
import type { Twin } from "@/twin/types";
import { checkRules, makePrediction } from "./prediction";
import type { RunArtifact } from "./types";

export async function runSystem(input: CaptureInput, twin: Twin): Promise<RunArtifact> {
  const raw: PipelineEvent[] = [];
  const start = performance.now();
  const signal = AbortSignal.timeout(370_000);
  await runAnalyze({ input, twin }, (event) => raw.push(event), signal);
  const last = raw.at(-1);
  const latencyMs = last?.type === "run.completed" ? last.totalMs : Math.round(performance.now() - start);
  const accepted = raw.find((event) => event.type === "gate.done")?.gate.proceed ?? null;
  const profile = raw.find((event) => event.type === "perception.done")?.profile ?? null;
  const assessment = raw.findLast((event) => event.type === "reasoning.done" || event.type === "revision.done")?.assessment;
  const filtered = raw.flatMap((event) => event.type === "selfcheck.done" ? event.result.disagreements.flatMap((detail) => {
    const match = /^Removed unknown ATT&CK for ICS technique (.+)\.$/.exec(detail);
    return match ? [match[1]] : [];
  }) : []);
  const prediction = makePrediction(accepted, profile, assessment, filtered);
  const ruleCheck = checkRules(twin, prediction);
  if (accepted === false) return { status: "rejected", latencyMs, prediction, ruleCheck, raw };
  if (last?.type === "run.completed") return { status: "ok", latencyMs, prediction, ruleCheck, raw };

  const stage = last?.type === "run.error" ? last.stage : "system";
  const message = last?.type === "run.error" ? last.message : signal.aborted ? "The system run timed out." : "The pipeline did not finish.";
  return { status: "error", latencyMs, prediction, ruleCheck, error: { stage, message, timeout: /timed?\s*out|timeout/i.test(message) }, raw };
}
