/** 2D / 3D switch state. The 3D view is optional: any failure flips back to 2D with a one-line notice. */
"use client";

import { create } from "zustand";

interface View3DState {
  enabled: boolean;
  /** One-line message after a fallback to 2D, cleared on the next toggle. */
  notice: string | null;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  /** Called by the error boundary / renderer: switch back to 2D and say why, briefly. */
  fail: (reason?: string) => void;
  /** A flow that is drawn in 2D only (simulation) started: switch back and say so in one line. */
  showIn2D: (notice: string) => void;
  clearNotice: () => void;
}

export const FALLBACK_NOTICE = "3D view unavailable on this device. Showing 2D.";
export const SIMULATION_NOTICE = "Simulation shown in 2D";

export const useView3DStore = create<View3DState>((set) => ({
  enabled: false,
  notice: null,
  toggle: () => set((state) => ({ enabled: !state.enabled, notice: null })),
  setEnabled: (enabled) => set({ enabled, notice: null }),
  fail: (reason) => {
    if (reason) console.warn("[view3d]", reason);
    set({ enabled: false, notice: FALLBACK_NOTICE });
  },
  showIn2D: (notice) => set({ enabled: false, notice }),
  clearNotice: () => set({ notice: null }),
}));
