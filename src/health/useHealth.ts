/** Shares health reads between the top-bar chip and the board. */
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { HealthSnapshot } from "./services";

export const useHealth = create<{
  snapshot: HealthSnapshot | null;
  error: string | null;
  requesting: boolean;
}>(() => ({ snapshot: null, error: null, requesting: false }));

let reading: Promise<void> | undefined;
let refreshing: Promise<void> | undefined;
let revision = 0;

async function load(method: "GET" | "POST", version: number) {
  try {
    const response = await fetch(method === "POST" ? "/api/health?all=1" : "/api/health", {
      method, cache: "no-store", signal: AbortSignal.timeout(method === "POST" ? 42_000 : 10_000),
    });
    if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}.`);
    const snapshot = await response.json() as HealthSnapshot;
    if (version === revision) useHealth.setState({ snapshot, error: null });
  } catch (error) {
    if (version === revision) useHealth.setState({ error: error instanceof Error ? error.message : "Health endpoint unavailable." });
  }
}

function read() {
  if (refreshing) return refreshing;
  reading ??= load("GET", revision).finally(() => { reading = undefined; });
  return reading;
}

export function refreshServices() {
  if (refreshing) return refreshing;
  useHealth.setState({ requesting: true, error: null });
  refreshing = load("POST", ++revision).finally(() => {
    refreshing = undefined;
    useHealth.setState({ requesting: false });
  });
  return refreshing;
}

export function useHealthPolling(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let generation = 0;
    let timer: number | undefined;

    async function poll(id: number, startedAt: number) {
      await read();
      if (generation !== id || document.hidden) return;
      const { snapshot, error } = useHealth.getState();
      const age = snapshot?.checkedAt ? Date.now() - Date.parse(snapshot.checkedAt) : Infinity;
      const waiting = !error && (snapshot?.refreshing || age >= 60_000) && Date.now() - startedAt < 35_000;
      // A stale GET returns immediately. Read its replacement promptly while it runs.
      timer = window.setTimeout(waiting ? () => void poll(id, startedAt) : restart, waiting ? 2_000 : 30_000);
    }

    function restart() {
      window.clearTimeout(timer);
      const id = ++generation;
      if (!document.hidden) void poll(id, Date.now());
    }

    restart();
    document.addEventListener("visibilitychange", restart);
    return () => {
      generation += 1;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [enabled]);
}
