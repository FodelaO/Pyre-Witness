/** Subscribes economic figures to configuration changes rather than live telemetry ticks. */
"use client";

import { useTwinStore } from "@/twin/store";
import type { RiskReport, Twin } from "@/twin/types";

const economicSnapshots = new WeakMap<RiskReport, Twin>();

export function useEconomicTwin() {
  return useTwinStore((state) => {
    const snapshot = economicSnapshots.get(state.risk);
    if (snapshot) return snapshot;
    economicSnapshots.set(state.risk, state.twin);
    return state.twin;
  });
}
