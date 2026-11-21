/** Prices conditional events for the live and reviewed advisory rows. */
"use client";

import { useMemo } from "react";
import { estimateLoss } from "@/econ/model";
import { scenarioFromWatch } from "@/econ/scenarios";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import type { Twin } from "@/twin/types";
import type { WatchRelevance } from "./relevance";
import type { ThreatItem } from "./types";
import { estimateWatchLoss } from "./watchLoss";

export function useWatchLiveEstimate(twin: Twin, row: WatchRelevance) {
  return useMemo(() => estimateWatchLoss(twin, row), [twin, row]);
}

export function useWatchAdvisoryEstimates(item: ThreatItem, assetIds: readonly string[]) {
  const twin = useEconomicTwin();
  const estimates = useMemo(() => [...new Set(assetIds)]
    .filter((id) => twin.assets.some((asset) => asset.id === id))
    .map((id) => estimateLoss(twin, scenarioFromWatch(twin, item, id))), [twin, item, assetIds]);
  return { twin, estimates };
}
