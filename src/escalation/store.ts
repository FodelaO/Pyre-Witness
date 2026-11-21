/** Keeps browser-local threshold settings and the escalation transcript records. */
import { create } from "zustand";
import { DEFAULT_THRESHOLDS, validThresholds } from "./policy";
import type { EscalationRecord, Thresholds } from "./types";

const SETTINGS_KEY = "pw:escalation-thresholds";
type RecordUpdate = Partial<Omit<EscalationRecord, "id" | "thresholds" | "raisedAt">>;

interface EscalationState {
  thresholds: Thresholds;
  records: EscalationRecord[];
  initialize: () => void;
  setThresholds: (thresholds: Thresholds) => void;
  add: (records: EscalationRecord[]) => void;
  update: (id: string, patch: RecordUpdate) => void;
}

export const useEscalationStore = create<EscalationState>((set) => ({
  thresholds: DEFAULT_THRESHOLDS,
  records: [],
  initialize() {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (value && validThresholds(value)) set({ thresholds: { loss: value.loss, risk: value.risk } });
    } catch {
      // Leave the defaults available when browser storage is unavailable.
    }
  },
  setThresholds(thresholds) {
    if (!validThresholds(thresholds)) return;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(thresholds)); } catch { /* Session settings still work. */ }
    set({ thresholds });
  },
  add(records) {
    if (records.length) set((state) => ({ records: [...state.records, ...records] }));
  },
  update(id, patch) {
    set((state) => ({ records: state.records.map((record) => record.id === id ? { ...record, ...patch } : record) }));
  },
}));
