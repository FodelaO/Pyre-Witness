/** Prices each currently matched advisory asset using the live plant configuration. */
"use client";

import { useMemo } from "react";
import type { ThreatItem } from "@/watch/types";
import { LossFigure } from "./LossFigure";
import { estimateLoss } from "./model";
import { scenarioFromWatch } from "./scenarios";
import { useEconomicTwin } from "./useEconomicTwin";

export function WatchLoss({ item, assetIds }: { item: ThreatItem; assetIds: readonly string[] }) {
  const twin = useEconomicTwin();
  const estimates = useMemo(() => [...new Set(assetIds)].flatMap((id) => {
    if (!twin.assets.some((asset) => asset.id === id)) return [];
    const scenario = scenarioFromWatch(twin, item, id);
    return scenario ? [estimateLoss(twin, scenario)] : [];
  }), [twin, item, assetIds]);
  if (!estimates.length) return <p className="text-[11px] text-pw-dim">No exposed asset</p>;
  return estimates.map((estimate) => <LossFigure key={estimate.asset.id} estimate={estimate} />);
}
