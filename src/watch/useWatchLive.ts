/** Refreshes the public feeds on the visible schedule without waiting for a model. */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordLiveCheck } from "./liveHistory";
import { LIVE_CHECK_INTERVAL_MS, type LiveCheck } from "./liveTypes";

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
      const response = await fetch("/api/watch/feeds", { cache: "no-store", signal: AbortSignal.timeout(25_000) });
      if (!response.ok) throw new Error(`Feed check HTTP ${response.status}`);
      const check: LiveCheck = await response.json();
      setSnapshot({ check, added: recordLiveCheck(check) });
      setNextAt(check.checkedAt + LIVE_CHECK_INTERVAL_MS);
    } catch (reason) {
      setError(reason instanceof Error && reason.message.startsWith("Feed check HTTP") ? reason.message : "Feed check unavailable");
      setNextAt(Date.now() + LIVE_CHECK_INTERVAL_MS);
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

  return { snapshot, checking, error, nextAt, checkNow };
}
