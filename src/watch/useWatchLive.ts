/** Refreshes the public feeds on the visible schedule without waiting for a model. */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WATCH_FEED_STALE_MS, watchFeedStatus } from "./feedStatus";
import { recordLiveCheck } from "./liveHistory";
import { LIVE_CHECK_INTERVAL_MS, LIVE_SOURCE_LABELS, type LiveCheck, type LiveSourceResult } from "./liveTypes";
import { useWatchStore } from "./watchStore";
import { publishLiveWatchResolutions } from "./watchResolutions";

export async function refreshWatchFeeds(): Promise<{ check: LiveCheck; error?: string }> {
  const startedAt = Date.now();
  const { setFeedCheck } = useWatchStore.getState();
  try {
    const response = await fetch("/api/watch/feeds", { cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`Feed check HTTP ${response.status}`);
    const check: LiveCheck = await response.json();
    setFeedCheck(check);
    return { check };
  } catch (reason) {
    const error = reason instanceof Error && reason.message.startsWith("Feed check HTTP")
      ? reason.message : "Feed check unavailable";
    const checkedAt = Date.now();
    const sources = (Object.keys(LIVE_SOURCE_LABELS) as LiveSourceResult["source"][]).map((source) => ({
      source, count: 0, ms: checkedAt - startedAt, cached: false, error,
    }));
    const check = { checkedAt, items: [], sources };
    setFeedCheck(check);
    return { check, error };
  }
}

export function useWatchLive() {
  const inFlight = useRef(false);
  const initial = useRef(false);
  const [snapshot, setSnapshot] = useState<{ check: LiveCheck; added: Set<string> }>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [nextAt, setNextAt] = useState<number>();

  const checkNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    setError(undefined);
    try {
      const { check, error } = await refreshWatchFeeds();
      if (!error) publishLiveWatchResolutions(check, useWatchStore.getState().review.report?.candidates ?? []);
      setError(error);
      setSnapshot({ check, added: error ? new Set() : recordLiveCheck(check) });
      setNextAt(check.checkedAt + LIVE_CHECK_INTERVAL_MS);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (initial.current) return;
    initial.current = true;
    void checkNow();
  }, [checkNow]);

  useEffect(() => {
    if (!nextAt || checking) return;
    const timer = window.setTimeout(checkNow, Math.max(0, nextAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [checkNow, checking, nextAt]);

  useEffect(() => {
    const check = snapshot?.check;
    if (!check || watchFeedStatus(check) !== "live") return;
    const timer = window.setTimeout(() => {
      const { local, setFeedCheck } = useWatchStore.getState();
      if (local.sources === check.sources) setFeedCheck(check);
    }, Math.max(0, check.checkedAt + WATCH_FEED_STALE_MS + 1 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  return { snapshot, checking, error, nextAt, checkNow };
}
