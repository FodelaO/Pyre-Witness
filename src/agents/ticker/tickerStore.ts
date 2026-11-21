/** Keeps one browser session's updates from the existing plant stores. */
import { create } from "zustand";
import { useEscalationStore } from "@/escalation/store";
import { useRunStore } from "@/pipeline/runStore";
import { useSimStore, type SimState } from "@/sim/simStore";
import type { SimRun } from "@/sim/types";
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import type { LiveCheck } from "@/watch/liveTypes";
import { useWatchStore } from "@/watch/watchStore";
import {
  approvedMitigation, escalationTickerItems, mitigationTickerItem, newestTickerItems,
  pipelineTickerItems, simulationTickerItem, type TickerItem,
} from "./items";
import { watchTickerItems } from "./watchItems";

export const useTickerStore = create<{ items: TickerItem[] }>(() => ({ items: [] }));

function publish(incoming: TickerItem[]) {
  if (!incoming.length) return;
  useTickerStore.setState((state) => {
    const prior = new Map(state.items.map((item) => [item.id, item]));
    const unchanged = (item: TickerItem) => {
      const old = prior.get(item.id);
      return old && old.at === item.at && old.title === item.title && old.tone === item.tone && old.assetId === item.assetId;
    };
    const updated = incoming.filter((item) => !unchanged(item));
    return updated.length ? { items: newestTickerItems([...updated, ...state.items]) } : state;
  });
}

const currentAssets = () => new Set(useTwinStore.getState().twin.assets.map(({ id }) => id));
const finishedRuns = new WeakSet<SimRun>();
let approvals: readonly Mitigation[] = [];
let sequence = 0;
let feedCheck: LiveCheck | undefined;

function recordSimulation({ run, mode }: SimState) {
  if (mode !== "finished" || !run || finishedRuns.has(run)) return;
  finishedRuns.add(run);
  publish([simulationTickerItem(run, `simulation:${++sequence}`, Date.now(), currentAssets())]);
}

function recordApprovals(mitigations: readonly Mitigation[]) {
  if (approvals === mitigations) return;
  const previouslyApproved = new Set(approvals.filter(approvedMitigation).map(({ id }) => id));
  approvals = mitigations;
  const added = mitigations.filter((item) => approvedMitigation(item) && !previouslyApproved.has(item.id));
  if (!added.length) return;
  const assets = currentAssets();
  const at = Date.now();
  publish(added.map((item) => mitigationTickerItem(item, `mitigation:${++sequence}`, at, assets)));
}

function recordWatch() {
  const { review, managed } = useWatchStore.getState();
  const reports = [review.report, managed.report].filter((report) => report !== undefined);
  if (!feedCheck && !reports.length) return;
  const { twin } = useTwinStore.getState();
  publish(watchTickerItems(feedCheck, reports, twin, useEscalationStore.getState().thresholds.loss));
}

function observeStores() {
  let request: AbortController | undefined;
  let requestedAt: number | undefined;

  function readPublicCheck() {
    const state = useWatchStore.getState();
    const at = state.local.checkedAt;
    if (!at || state.feedStatus !== "live" || at === requestedAt || at === feedCheck?.checkedAt) return;
    requestedAt = at;
    request?.abort();
    const active = new AbortController();
    request = active;
    // The watch store publishes check metadata. This route supplies the cached public records.
    void fetch("/api/watch/feeds", { signal: AbortSignal.any([active.signal, AbortSignal.timeout(25_000)]) })
      .then(async (response) => response.ok ? await response.json() as LiveCheck : undefined)
      .then((check) => {
        if (!check || active.signal.aborted) return;
        feedCheck = { ...check, checkedAt: at };
        recordWatch();
      })
      .catch(() => { /* The next completed check can refresh the ticker. */ });
  }

  publish(pipelineTickerItems(useRunStore.getState()));
  publish(escalationTickerItems(useEscalationStore.getState().records));
  recordSimulation(useSimStore.getState());
  recordApprovals(useTwinStore.getState().mitigations);
  recordWatch();
  readPublicCheck();

  const stop = [
    useRunStore.subscribe((state, previous) => {
      if (state.events !== previous.events || state.placedAssetId !== previous.placedAssetId) publish(pipelineTickerItems(state));
    }),
    useSimStore.subscribe((state, previous) => {
      if (state.mode !== previous.mode || state.run !== previous.run) recordSimulation(state);
    }),
    useEscalationStore.subscribe((state, previous) => {
      if (state.records !== previous.records) publish(escalationTickerItems(state.records));
      if (state.thresholds.loss !== previous.thresholds.loss) recordWatch();
    }),
    useTwinStore.subscribe((state, previous) => {
      if (state.mitigations !== previous.mitigations) recordApprovals(state.mitigations);
    }),
    useWatchStore.subscribe((state, previous) => {
      if (state.review.report !== previous.review.report || state.managed.report !== previous.managed.report) recordWatch();
      if (state.local.checkedAt !== previous.local.checkedAt || state.feedStatus !== previous.feedStatus) readPublicCheck();
    }),
  ];

  return () => {
    request?.abort();
    for (const unsubscribe of stop) unsubscribe();
  };
}

let mounts = 0;
let disconnect: (() => void) | undefined;

export function connectTicker() {
  if (mounts++ === 0) disconnect = observeStores();
  return () => {
    if (--mounts === 0) disconnect?.();
  };
}
