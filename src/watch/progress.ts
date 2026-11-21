/** Records the feed, inventory, and provider work behind a watch report. */
import { performance } from "node:perf_hooks";
import { evaluateTwin } from "@/rules/engine";
import type { Twin } from "@/twin/types";
import { loadFeeds } from "./feeds";
import { inventoryForTwin } from "./inventory";
import { matchThreats } from "./match";
import { WATCH_SOURCES } from "./sources";
import type { WatchEvent, WatchEventData, WatchStage } from "./types";

export function watchProgress(runId: string, emit: (event: WatchEvent) => void) {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);
  const stages: WatchStage[] = [];
  const send = (event: WatchEventData) => emit({ ...event, runId, at: Date.now() });

  const begin = (name: WatchStage["name"]) => {
    send({ type: "working", name });
    const start = performance.now();
    return (state: WatchStage["state"], detail: string, model?: string) => {
      const stage = { name, state, detail, model, ms: Math.round(performance.now() - start) };
      stages.push(stage);
      send({ type: "stage", stage });
    };
  };

  send({ type: "started", date });
  return { now, date, stages, send, begin };
}

export async function collectEvidence(twin: Twin, progress: ReturnType<typeof watchProgress>, signal: AbortSignal) {
  const endFeeds = progress.begin("feeds");
  const { sources, items } = await loadFeeds(progress.now, (result) => progress.send({ type: "source", result }));
  signal.throwIfAborted();
  const failures = sources.filter(({ error }) => error);
  endFeeds(failures.length === sources.length ? "failed" : "done", `${items.length} recent items · ${failures.length} sources unavailable`);
  const endMatches = progress.begin("matches");
  const inventory = inventoryForTwin(twin);
  const candidates = matchThreats(items, inventory);
  const risk = evaluateTwin(twin);
  progress.send({ type: "matches", candidates });
  endMatches("done", `${candidates.length} candidate matches`);
  return {
    sources, items, inventory, candidates, risk,
    warnings: failures.map(({ source, error }) => `${WATCH_SOURCES[source].label} · ${error}.`),
  };
}

export function modelError(model: string, error: unknown, signal: AbortSignal): string {
  if (signal.aborted) return `${model} timed out.`;
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 400) return `${model} rejected the request.`;
  if (status === 401 || status === 403) return `${model} access denied by Gemini.`;
  if (status === 404) return `${model} is unavailable to this Gemini project.`;
  if (status === 429) return `${model} rate limit or quota reached.`;
  return `${model} request failed or returned invalid data.`;
}
