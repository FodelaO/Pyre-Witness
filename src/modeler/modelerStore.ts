/** Holds one modeler review, session provenance and the human approval action. */
"use client";

import { create } from "zustand";
import { appendActivity } from "@/crew/feedStore";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { planAccepted, withAddedLinks } from "./approval";
import { requestModel } from "./client";
import { inspectFiles, ModelerError } from "./limits";
import type { ModelDrop, ModelEvent, ModelProposal, ModelSource, ModelSourceKind, ObservedItem } from "./types";

export type ModelPhase = "idle" | "upload" | "gate" | "extract" | "reconcile" | "review" | "error";
export type ModelVote = "accept" | "reject" | "applied";

interface ModelerState {
  phase: ModelPhase;
  source: ModelSource | null;
  observations: ObservedItem[];
  proposal: ModelProposal | null;
  votes: Record<string, ModelVote>;
  sessionCounts: Partial<Record<ModelSourceKind, number>>;
  previewId: string | null;
  error: string | null;
  applied: string | null;
  applyIssues: ModelDrop[];
  ingest: (files: File[]) => Promise<void>;
  cancel: () => void;
  vote: (id: string, vote: "accept" | "reject") => void;
  preview: (id: string | null) => void;
  applyAccepted: () => void;
}

const emptyReview = {
  source: null, observations: [], proposal: null, votes: {},
  previewId: null, error: null, applied: null, applyIssues: [],
};
let active: AbortController | undefined;
let modelHighlight: { ids: string[]; before: string[] } | undefined;

function clearHighlight() {
  const store = useTwinStore.getState();
  if (modelHighlight && store.highlightIds === modelHighlight.ids) store.setHighlight(modelHighlight.before);
  modelHighlight = undefined;
}

export function modelerBusy(phase: ModelPhase): boolean {
  return phase === "upload" || phase === "gate" || phase === "extract" || phase === "reconcile";
}

export const useModelerStore = create<ModelerState>((set, get) => ({
  ...emptyReview, phase: "idle", sessionCounts: {},

  async ingest(files) {
    active?.abort();
    clearHighlight();
    const run = new AbortController();
    active = run;
    set({ ...emptyReview, phase: "upload" });
    function receive(event: ModelEvent) {
      if (active !== run) return;
      switch (event.type) {
        case "source.received": return set({ source: event.source });
        case "source.ready":
        case "gate.started": return set({ phase: "gate" });
        case "gate.done": return set({ source: event.source });
        case "extraction.started": return set({ phase: "extract" });
        case "extraction.done": return set({ observations: event.items });
        case "reconciliation.started": return set({ phase: "reconcile" });
        case "complete": {
          const { proposal } = event;
          const { kind } = proposal.source;
          return set((state) => ({
            phase: "review",
            source: proposal.source,
            proposal,
            sessionCounts: { ...state.sessionCounts, [kind]: (state.sessionCounts[kind] ?? 0) + proposal.items.length },
          }));
        }
        case "error": return set({ phase: "error", error: event.message });
      }
    }
    try {
      inspectFiles(files);
      const signal = AbortSignal.any([run.signal, AbortSignal.timeout(235_000)]);
      await requestModel(files, useTwinStore.getState().twin, receive, signal);
    } catch (error) {
      if (active === run) set({
        phase: "error",
        error: error instanceof ModelerError ? error.message : "The upload could not finish. Retry the source.",
      });
    } finally {
      if (active === run) active = undefined;
    }
  },

  cancel() {
    if (!modelerBusy(get().phase)) return;
    active?.abort();
    active = undefined;
    set({ ...emptyReview, phase: "idle" });
  },

  vote(id, vote) {
    const { proposal, votes } = get();
    const item = proposal?.items.find((candidate) => candidate.id === id);
    if (!item || item.outcome.action === "unplaced" || votes[id] === "applied") return;
    const next = { ...votes };
    if (next[id] === vote) delete next[id];
    else next[id] = vote;
    set({ votes: next });
  },

  preview(id) {
    clearHighlight();
    const outcome = get().proposal?.items.find((item) => item.id === id)?.outcome;
    if (outcome && (outcome.action === "match_existing" || outcome.action === "update_existing")) {
      const store = useTwinStore.getState();
      const ids = [outcome.assetId];
      modelHighlight = { ids, before: store.highlightIds };
      store.setHighlight(ids);
    }
    set({ previewId: id });
  },

  applyAccepted() {
    const { proposal, votes } = get();
    if (!proposal) return;
    const accepted = new Set(Object.keys(votes).filter((id) => votes[id] === "accept"));
    if (!accepted.size) return;
    const store = useTwinStore.getState();
    const plan = planAccepted(store.twin, proposal, accepted);
    const present = new Set(store.twin.assets.map(({ id }) => id));
    const deferred: Asset[] = [];
    for (const { change } of plan.additions) {
      const links = change.physical.connections.filter(({ to }) => present.has(to));
      store.addAsset({ ...change, physical: { ...change.physical, connections: links } });
      present.add(change.id);
      if (links.length !== change.physical.connections.length) deferred.push(change);
    }
    for (const asset of deferred) store.updateAsset(asset.id, (current) => withAddedLinks(current, asset.physical.connections));
    for (const { change } of plan.updates) {
      store.updateAsset(change.assetId, (current) => ({
        ...withAddedLinks(current, change.connections), name: change.name ?? current.name,
      }));
    }
    const completed = [...plan.additions.map(({ itemId }) => itemId), ...plan.updates.map(({ itemId }) => itemId), ...plan.matches];
    const next = { ...votes };
    for (const id of accepted) delete next[id];
    for (const id of completed) next[id] = "applied";
    const status = [
      plan.additions.length ? `${plan.additions.length} added` : "",
      plan.updates.length ? `${plan.updates.length} updated` : "",
      plan.matches.length ? `${plan.matches.length} matched` : "",
    ].filter(Boolean).join(" · ");
    if (status) appendActivity({ at: Date.now(), crew: "scout", kind: "pipeline", text: `Modeler review applied · ${status}` });
    clearHighlight();
    set({ votes: next, applied: status || null, applyIssues: plan.issues, previewId: null });
  },
}));
