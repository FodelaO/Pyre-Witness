/**
 * The living twin (browser state). One store shared by the plant floor, the Purdue map, the
 * side panel and the crew. Every mutation re-runs the deterministic rules engine, so the risk
 * score and attack paths are always in sync with what is drawn.
 */
import { create } from "zustand";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "./effects";
import { SEED_TWIN } from "./seed";
import type { Asset, Mitigation, RiskReport, Twin, ViewMode } from "./types";

export interface TwinState {
  twin: Twin;
  risk: RiskReport;
  /** Risk score of the untouched seed plant, for "before / after" deltas. */
  baselineScore: number;
  selectedId: string | null;
  hoveredId: string | null;
  /**
   * Extra ids to highlight together on both views (every node of a hovered attack path, the
   * members of an area...). Asset ids, entry-point ids or area ids. Views treat these like hover.
   */
  highlightIds: string[];
  view: ViewMode;
  mitigations: Mitigation[];

  /** Linked selection: both views read and write this. */
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setHighlight: (ids: string[]) => void;
  setView: (view: ViewMode) => void;

  addAsset: (asset: Asset) => void;
  /** Functional update of one asset (move, re-level, telemetry, status...). */
  updateAsset: (id: string, fn: (asset: Asset) => Asset) => void;
  removeAsset: (id: string) => void;
  /** Replace the whole twin (simulation scenarios, reset). */
  setTwin: (twin: Twin) => void;
  /** Mutate the twin WITHOUT re-running the rules engine (high-frequency telemetry ticks). */
  patchTwinQuiet: (fn: (twin: Twin) => Twin) => void;

  proposeMitigations: (items: Mitigation[]) => void;
  /** Human decision. "approved" applies the effects to the twin; "rejected" discards them. */
  decideMitigation: (id: string, decision: "approved" | "rejected") => void;

  reset: () => void;
}

const seedRisk = evaluateTwin(SEED_TWIN);

function withRisk(twin: Twin): Pick<TwinState, "twin" | "risk"> {
  return { twin, risk: evaluateTwin(twin) };
}

export const useTwinStore = create<TwinState>((set, get) => ({
  twin: SEED_TWIN,
  risk: seedRisk,
  baselineScore: seedRisk.score,
  selectedId: null,
  hoveredId: null,
  highlightIds: [],
  view: "floor",
  mitigations: [],

  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  setHighlight: (ids) => set({ highlightIds: ids }),
  setView: (view) => set({ view }),

  addAsset: (asset) => {
    const twin = get().twin;
    const assets = twin.assets.some((a) => a.id === asset.id)
      ? twin.assets.map((a) => (a.id === asset.id ? asset : a))
      : [...twin.assets, asset];
    set(withRisk({ ...twin, assets }));
  },

  updateAsset: (id, fn) => {
    const twin = get().twin;
    set(withRisk({ ...twin, assets: twin.assets.map((a) => (a.id === id ? fn(a) : a)) }));
  },

  removeAsset: (id) => {
    const twin = get().twin;
    set({
      ...withRisk(applyEffects(twin, [{ type: "remove_asset", assetId: id }])),
      selectedId: get().selectedId === id ? null : get().selectedId,
      hoveredId: get().hoveredId === id ? null : get().hoveredId,
    });
  },

  setTwin: (twin) => {
    const ids = new Set(twin.assets.map((a) => a.id));
    const keep = (id: string | null) => (id && ids.has(id) ? id : null);
    set({ ...withRisk(twin), selectedId: keep(get().selectedId), hoveredId: keep(get().hoveredId) });
  },

  patchTwinQuiet: (fn) => set({ twin: fn(get().twin) }),

  proposeMitigations: (items) => {
    // Models reuse generic ids ("M1") across runs: make every proposal's id unique instead of
    // dropping later ones, and never trust an incoming status (only a human click can apply).
    const taken = new Set(get().mitigations.map((m) => m.id));
    const fresh = items.map((item) => {
      let id = item.id;
      for (let n = 2; taken.has(id); n += 1) id = `${item.id}-${n}`;
      taken.add(id);
      return { ...item, id, status: "proposed" as const, riskDelta: item.riskDelta };
    });
    set({ mitigations: [...get().mitigations, ...fresh] });
  },

  decideMitigation: (id, decision) => {
    const mitigation = get().mitigations.find((m) => m.id === id);
    if (!mitigation || mitigation.status === "applied" || mitigation.status === "rejected") return;
    if (decision === "rejected") {
      set({ mitigations: get().mitigations.map((m) => (m.id === id ? { ...m, status: "rejected" } : m)) });
      return;
    }
    const before = get().risk.score;
    const next = withRisk(applyEffects(get().twin, mitigation.effects));
    set({
      ...next,
      mitigations: get().mitigations.map((m) =>
        m.id === id ? { ...m, status: "applied", riskDelta: next.risk.score - before } : m,
      ),
    });
  },

  reset: () =>
    set({
      ...withRisk(SEED_TWIN),
      selectedId: null,
      hoveredId: null,
      highlightIds: [],
      mitigations: [],
      baselineScore: seedRisk.score,
    }),
}));
