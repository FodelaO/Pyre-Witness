/** Shares health reads between the crew dock and the services board. */
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useRunStore } from "@/pipeline/runStore";
import { HEALTH_REFRESH_MS, type HealthSnapshot } from "./services";

const SESSION_KEY = "pyre-witness:health:v2";

function readSessionSnapshot(): HealthSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    const value = stored ? JSON.parse(stored) as HealthSnapshot : null;
    return value?.checkedAt && Number.isFinite(Date.parse(value.checkedAt)) && Array.isArray(value.services) ? value : null;
  } catch {
    return null;
  }
}

function saveSessionSnapshot(snapshot: HealthSnapshot) {
  if (!snapshot.checkedAt || snapshot.refreshing) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...snapshot, history: [] }));
  } catch { /* The live cache remains available with browser storage disabled. */ }
}

export const useHealth = create<{
  snapshot: HealthSnapshot | null;
  fromSession: boolean;
  error: string | null;
  requesting: boolean;
}>(() => {
  const snapshot = readSessionSnapshot();
  return { snapshot, fromSession: snapshot !== null, error: null, requesting: false };
});

let reading: Promise<HealthSnapshot | undefined> | undefined;
let refreshing: Promise<void> | undefined;
let revision = 0;

async function load(method: "GET" | "POST", version: number): Promise<HealthSnapshot | undefined> {
  try {
    const response = await fetch(method === "POST" ? "/api/health?all=1" : "/api/health", {
      method, cache: "no-store", signal: AbortSignal.timeout(method === "POST" ? 125_000 : 10_000),
    });
    if (method === "POST" && response.status === 429) return load("GET", version);
    if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}.`);
    const snapshot = await response.json() as HealthSnapshot;
    if (version !== revision) return;
    if (!snapshot.checkedAt && useHealth.getState().snapshot?.checkedAt) {
      // Retain the dated snapshot when the server process has just restarted.
      useHealth.setState({ fromSession: true, error: null });
      return snapshot;
    }
    useHealth.setState({ snapshot, fromSession: false, error: null });
    saveSessionSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    if (version === revision) useHealth.setState({ error: error instanceof Error ? error.message : "Health endpoint unavailable." });
  }
}

function read() {
  if (useRunStore.getState().status === "running") return;
  if (refreshing) return refreshing;
  reading ??= load("GET", revision).finally(() => { reading = undefined; });
  return reading;
}

export function refreshServices() {
  if (useRunStore.getState().status === "running") return;
  if (refreshing) return refreshing;
  useHealth.setState({ requesting: true, error: null });
  refreshing = (async () => {
    const cached = await (reading ?? load("GET", revision));
    if (cached?.checkedAt && Date.now() - Date.parse(cached.checkedAt) >= HEALTH_REFRESH_MS
      && useRunStore.getState().status !== "running") {
      await load("POST", ++revision);
    }
  })().finally(() => {
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
      const { snapshot, error, fromSession } = useHealth.getState();
      const age = snapshot?.checkedAt ? Date.now() - Date.parse(snapshot.checkedAt) : Infinity;
      const waiting = useRunStore.getState().status !== "running" && !error
        && (fromSession || snapshot?.refreshing || age >= HEALTH_REFRESH_MS) && Date.now() - startedAt < 90_000;
      // A stale GET returns immediately. Read its replacement promptly while it runs.
      timer = window.setTimeout(waiting ? () => void poll(id, startedAt) : restart, waiting ? 2_000 : 30_000);
    }

    function restart() {
      window.clearTimeout(timer);
      const id = ++generation;
      if (!document.hidden) void poll(id, Date.now());
    }

    restart();
    const unsubscribe = useRunStore.subscribe((state, previous) => {
      if (state.status !== previous.status && (state.status === "running" || previous.status === "running")) restart();
    });
    document.addEventListener("visibilitychange", restart);
    return () => {
      generation += 1;
      window.clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", restart);
    };
  }, [enabled]);
}
