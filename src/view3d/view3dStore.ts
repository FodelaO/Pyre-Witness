/** 2D / 3D switch state. The 3D view is optional: any failure flips back to 2D with a one-line notice. */
"use client";

import { create } from "zustand";

interface View3DState {
  enabled: boolean;
  /** While playback requires 2D, remember which view to restore. Null outside playback. */
  resume3D: boolean | null;
  /** One-line message after a fallback to 2D, cleared on the next toggle. */
  notice: string | null;
  toggle: () => void;
  chooseView: (enabled: boolean) => void;
  /** Temporary switch for the placement flow and the standalone review. */
  setEnabled: (enabled: boolean) => void;
  /** Called by the error boundary / renderer: switch back to 2D and say why, briefly. */
  fail: (reason?: string) => void;
  /** A flow that is drawn in 2D only (simulation) started: switch back and say so in one line. */
  showIn2D: (notice: string) => void;
  restoreAfterSimulation: () => void;
  clearNotice: () => void;
}

export const FALLBACK_NOTICE = "3D view unavailable on this device. Showing 2D.";
export const SIMULATION_NOTICE = "Simulation shown in 2D";

const storageKey = "pw-view";

/** 3D is the default view; the viewer's own choice (2D or 3D) is remembered in this browser. */
function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey) !== "2d";
  } catch {
    return true;
  }
}

function remember(enabled: boolean) {
  try {
    window.localStorage.setItem(storageKey, enabled ? "3d" : "2d");
  } catch {
    // Storage can be blocked; the choice still applies to this page.
  }
}

export const useView3DStore = create<View3DState>((set, get) => ({
  enabled: readEnabled(),
  resume3D: null,
  notice: null,
  toggle: () => get().chooseView(!(get().resume3D ?? get().enabled)),
  chooseView: (enabled) => set((state) => {
    remember(enabled);
    return state.resume3D === null
      ? { enabled, notice: null }
      : { resume3D: enabled, notice: enabled ? SIMULATION_NOTICE : null };
  }),
  setEnabled: (enabled) => set((state) => {
    if (state.resume3D === null) return { enabled, notice: null };
    // Pinning can finish during playback. Hold its requested 3D return until playback ends.
    return enabled ? { resume3D: true } : state;
  }),
  fail: (reason) => {
    if (reason) console.warn("[view3d]", reason);
    set((state) => ({ enabled: false, resume3D: state.resume3D === null ? null : false, notice: FALLBACK_NOTICE }));
  },
  showIn2D: (notice) => set((state) => state.resume3D !== null ? state : {
    enabled: false,
    resume3D: state.enabled,
    notice: state.enabled ? notice : state.notice,
  }),
  restoreAfterSimulation: () => set((state) => state.resume3D === null ? state : {
    enabled: state.resume3D,
    resume3D: null,
    notice: state.notice === SIMULATION_NOTICE ? null : state.notice,
  }),
  clearNotice: () => set({ notice: null }),
}));
