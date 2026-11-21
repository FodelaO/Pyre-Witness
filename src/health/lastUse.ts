/** Finds the latest observed product call for each model in the browser session. */
import type { PipelineEvent, PipelineStage } from "@/pipeline/types";
import type { TranscriptRun } from "@/transcript/transcriptStore";

interface ModelUse {
  at: number;
  latencyMs?: number;
  totalTokens?: number;
}

function completionStage(event: PipelineEvent): PipelineStage | undefined {
  switch (event.type) {
    case "gate.done": return Object.keys(event.gate.answers).length > 0 ? "gate" : undefined;
    case "perception.done": return "perception";
    case "reasoning.done": return "reasoning";
    case "revision.done": return "revision";
    case "summary.done": return "summary";
  }
}

export function latestModelUses(current: readonly PipelineEvent[], runs: readonly TranscriptRun[]) {
  const latest = new Map<string, ModelUse>();

  function record(model: string, observation: ModelUse) {
    const previous = latest.get(model);
    if (!previous || observation.at > previous.at) latest.set(model, observation);
  }

  function recordPipeline(events: readonly PipelineEvent[]) {
    const providerCalls = new Set<string>();
    for (const event of events) {
      if (event.type !== "transcript.entry") continue;
      const { engine, stage, usage, latencyMs, response } = event.entry;
      if (!response && !usage) continue;
      providerCalls.add(`${stage}:${engine}`);
      record(engine, { at: event.at, latencyMs, totalTokens: usage?.totalTokens });
    }
    for (const event of events) {
      const stage = completionStage(event);
      if (stage && "model" in event && "latencyMs" in event && !providerCalls.has(`${stage}:${event.model}`)) {
        record(event.model, { at: event.at, latencyMs: event.latencyMs });
      }
    }
  }

  recordPipeline(current);
  for (const run of runs) {
    if ("events" in run) {
      if (run.events !== current) recordPipeline(run.events);
      continue;
    }
    if (run.source !== "watch") continue;
    for (const observation of run.observations) {
      const raw = observation.raw;
      // Completed Watch stages carry a model ID even when other stages skip it.
      if (observation.origin === "model" && observation.engine && raw && typeof raw === "object"
        && "state" in raw && (raw.state === "done" || raw.state === "partial")) {
        record(observation.engine, { at: observation.at, latencyMs: observation.latencyMs });
      }
    }
  }
  return latest;
}
