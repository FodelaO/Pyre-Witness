/** Classifies historical baseline errors from the saved response bodies. */
import { baselineSchema } from "./baselineContract";
import { metricCounts } from "./metrics";
import { proportion } from "./statistics";
import type { EvaluatedItem } from "./types";

const original = baselineSchema(true);
const scoring = baselineSchema();

export function diagnoseBaseline(rows: readonly EvaluatedItem[]) {
  const observations = rows.flatMap(({ observations: { baseline } }) => baseline ? [baseline] : []);
  const failures = observations.filter(({ status }) => status === "error");
  const lengthOnly = [];
  const overages = new Map<string, number>();
  for (const observation of failures) {
    if (observation.error?.stage !== "baseline response" || !("raw" in observation)) continue;
    const raw = observation.raw as { status?: string; text?: string } | null;
    if (raw?.status !== "completed" || !raw.text) continue;
    let value: unknown;
    try { value = JSON.parse(raw.text); } catch { continue; }
    const parsed = original.safeParse(value);
    if (parsed.success || !scoring.safeParse(value).success
      || !parsed.error.issues.every((issue) => issue.code === "too_big" && (issue.origin === "array" || issue.origin === "string"))) continue;
    lengthOnly.push(observation);
    for (const field of new Set(parsed.error.issues.map(({ path }) => path.slice(0, 2).join(".")))) {
      overages.set(field, (overages.get(field) ?? 0) + 1);
    }
  }
  const latencies = lengthOnly.flatMap(({ latencyMs }) => latencyMs === null ? [] : [latencyMs]);
  const links = failures.filter(({ error }) => error?.stage === "link" && !error.timeout).length;
  const timeouts = failures.filter(({ error }) => error?.timeout).length;
  return {
    n: observations.length, failures: failures.length, lengthOnly: lengthOnly.length, links, timeouts,
    unclassified: failures.length - lengthOnly.length - links - timeouts,
    rateLimited: observations.reduce((total, { providerCalls }) => total + (providerCalls?.rateLimited ?? 0), 0),
    lengthLatencyMs: latencies.length ? [Math.min(...latencies), Math.max(...latencies)] as const : null,
    overages: [...overages].sort(([, a], [, b]) => b - a),
    area: proportion(rows.flatMap((row) => {
      const count = metricCounts(row, "baseline")?.physicalAreaAccuracy;
      return count ? [count] : [];
    })),
  };
}
