/** Records the feed, inventory, and provider work behind a watch report. */
import { performance } from "node:perf_hooks";
import { evaluateTwin } from "@/rules/engine";
import type { Twin } from "@/twin/types";
import { loadFeeds } from "./feeds";
import { inventoryForTwin } from "./inventory";
import { matchThreats } from "./match";
import { threatKey, WATCH_SOURCES } from "./sources";
import type { WatchEvent, WatchEventData, WatchStage } from "./types";

export type WatchFeedSnapshot = Awaited<ReturnType<typeof loadFeeds>> & { startedAt: number };

export function watchProgress(runId: string, emit: (event: WatchEvent) => void) {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);
  const stages: WatchStage[] = [];
  const send = (event: WatchEventData) => emit({ ...event, runId, at: Date.now() });

  const begin = (name: WatchStage["name"], start = performance.now()) => {
    send({ type: "working", name });
    return (state: WatchStage["state"], detail: string, model?: string) => {
      const stage = { name, state, detail, model, ms: Math.round(performance.now() - start) };
      stages.push(stage);
      send({ type: "stage", stage });
    };
  };

  send({ type: "started", date });
  return { now, date, stages, send, begin };
}

export async function collectEvidence(twin: Twin, progress: ReturnType<typeof watchProgress>, signal: AbortSignal, feeds?: WatchFeedSnapshot) {
  const endFeeds = progress.begin("feeds", feeds?.startedAt);
  const sendSource = (result: WatchFeedSnapshot["sources"][number]) => progress.send({ type: "source", result });
  const { sources, items } = feeds ?? await loadFeeds(progress.now, sendSource);
  if (feeds) sources.forEach(sendSource);
  signal.throwIfAborted();
  const failures = sources.filter(({ error }) => error);
  endFeeds(failures.length === sources.length ? "failed" : "done", `${items.length} recent items · ${failures.length} sources unavailable`);
  const endMatches = progress.begin("matches");
  const inventory = inventoryForTwin(twin);
  const candidates = matchThreats(items, inventory);
  const news = items.filter(({ source }) => source === "ncsc-news");
  const matchedNews = new Set(matchThreats(news, inventory, Infinity).map(({ threat }) => threatKey(threat)));
  const unmatchedNews = news.filter((threat) => !matchedNews.has(threatKey(threat)));
  const risk = evaluateTwin(twin);
  progress.send({ type: "matches", candidates, unmatchedNews });
  endMatches("done", `${candidates.length} candidate matches`);
  return {
    sources, items, inventory, candidates, unmatchedNews, risk,
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
