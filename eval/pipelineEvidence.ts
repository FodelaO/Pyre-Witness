/** Counts recorded deterministic checks and user-visible rule paths without replaying the pipeline. */
import type { PipelineEvent } from "@/pipeline/types";
import { quantile } from "./statistics";
import type { EvaluatedItem, Observation } from "./types";

export function systemEvents(observation?: Observation): readonly PipelineEvent[] {
  return observation && "raw" in observation && Array.isArray(observation.raw) ? observation.raw : [];
}

export function summarizePipelineEvidence(rows: readonly EvaluatedItem[]) {
  const observations = rows.flatMap(({ observations: { system } }) => system ? [system] : []);
  const streams = observations.map(systemEvents);
  const checks = streams.map((events) => events.filter((event) => event.type === "selfcheck.done"));
  const times = checks.flatMap((events) => events.map(({ latencyMs }) => latencyMs));
  const captureTimes = checks.filter((events) => events.length > 0).map((events) =>
    events.reduce((total, { latencyMs }) => total + latencyMs, 0));
  const pathCounts = checks.map((events) => {
    const asDropped = events.find(({ phase }) => phase === "as-dropped");
    const final = events.findLast(({ phase }) => phase === "recommendation" || phase === "post-revision");
    const visible = [asDropped, final].flatMap((event) => event?.result.paths ?? []);
    return new Set(visible.map(({ id }) => id)).size;
  });
  const ruleIds = new Set(checks.flatMap((events) => events.flatMap(({ result }) => result.findings.map(({ ruleId }) => ruleId))));
  const visiblePaths = pathCounts.reduce((total, count) => total + count, 0);
  const n = observations.length;
  const traceCounts = streams.map((events) => events.filter((event) => event.type === "transcript.entry"
    && event.entry.engine.startsWith("gemini-") && event.entry.request).length);
  const requestEntries = traceCounts.reduce((total, count) => total + count, 0);
  return {
    n, visiblePaths, pathsPerCapture: n ? visiblePaths / n : null,
    capturesWithPaths: pathCounts.filter((count) => count > 0).length,
    checks: times.length, checksPerCapture: n ? times.length / n : null, checkedCaptures: captureTimes.length,
    distinctTriggeredRules: ruleIds.size, medianCheckMs: quantile(times, 0.5), medianCheckedCaptureMs: quantile(captureTimes, 0.5),
    requestTraces: requestEntries ? {
      n, total: requestEntries, perCapture: requestEntries / n,
      shorterCounters: traceCounts.filter((count, index) => count > (observations[index].providerCalls?.attempts ?? 0)).length,
    } : undefined,
  };
}

export type PipelineEvidence = ReturnType<typeof summarizePipelineEvidence>;
