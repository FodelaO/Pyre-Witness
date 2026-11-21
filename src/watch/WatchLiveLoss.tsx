/** Prices one conditional event per row with the shared economic model and figure. */
"use client";

import { useMemo } from "react";
import { LossFigure } from "@/econ/LossFigure";
import type { Twin } from "@/twin/types";
import type { WatchRelevance } from "./relevance";
import { estimateWatchLoss } from "./watchLoss";

export function WatchLiveLoss({ row, twin }: { row: WatchRelevance; twin: Twin }) {
  const estimate = useMemo(() => estimateWatchLoss(twin, row), [twin, row]);
  if (!estimate) return null;
  return <div className="pw-signal-loss"><LossFigure estimate={estimate} /></div>;
}
