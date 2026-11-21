/**
 * Drop pin: where the user intends to put the device being captured.
 * The capture card arms it; the plant floor handles the click and draws the pin; the pipeline
 * sends it with the analysis so Scout walks there and the Inspector checks THAT location.
 * Shared contract — see AGENTS.md.
 */
import { create } from "zustand";
import type { DropPoint } from "@/pipeline/types";

/** Used when the user does not pin a spot: beside the Filler 3 operator station. */
export const DEFAULT_DROP: DropPoint = { x: 700, y: 640, area: "filler3" };

export interface DropState {
  /** True while the floor is waiting for the user to click a spot. */
  armed: boolean;
  point: DropPoint | null;
  arm: () => void;
  disarm: () => void;
  /** Setting a point also disarms. */
  setPoint: (point: DropPoint | null) => void;
}

export const useDropStore = create<DropState>((set) => ({
  armed: false,
  point: null,
  arm: () => set({ armed: true }),
  disarm: () => set({ armed: false }),
  setPoint: (point) => set({ point, armed: false }),
}));
