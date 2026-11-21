/** Tracks the committed lens and its continuous drag position. */
"use client";

import { create } from "zustand";

export const LENS_MODES = ["material", "both", "data"] as const;
export type LensMode = (typeof LENS_MODES)[number];
export const LENS_LABELS: Record<LensMode, string> = { material: "Material", both: "Both", data: "Data" };
const STORAGE_KEY = "pyre-witness:pipeline-lens";

function clampPosition(position: number) {
  return Number.isFinite(position) ? Math.min(1, Math.max(0, position)) : 0;
}

export function lensModeAt(position: number): LensMode {
  return LENS_MODES[Math.round(clampPosition(position) * 2)];
}

export function lensWeights(position: number) {
  const clamped = clampPosition(position);
  const material = Math.min(1, (1 - clamped) * 2);
  const data = Math.min(1, clamped * 2);
  return { material, data, connectors: Math.min(material, data) };
}

function atMode(mode: LensMode) {
  const position = LENS_MODES.indexOf(mode) / 2;
  return { mode, position, weights: lensWeights(position) };
}

interface LensState {
  mode: LensMode;
  position: number;
  weights: ReturnType<typeof lensWeights>;
  dragging: boolean;
  setMode: (mode: LensMode) => void;
  setPosition: (position: number) => void;
  setDragging: (dragging: boolean) => void;
}

export const useLensStore = create<LensState>((set) => ({
  ...atMode("material"),
  dragging: false,
  setDragging: (dragging) => set({ dragging }),
  setMode: (mode) => {
    set(atMode(mode));
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The lens remains usable when browser storage is disabled.
    }
  },
  setPosition: (value) => {
    const position = clampPosition(value);
    set((state) => state.position === position ? state : { position, weights: lensWeights(position) });
  },
}));

let restored = false;

/** Restore after hydration so the first client render matches the server. */
export function restoreLensMode() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const mode = LENS_MODES.find((item) => item === stored);
    if (mode) useLensStore.setState(atMode(mode));
  } catch {
    // Storage is optional.
  }
}
