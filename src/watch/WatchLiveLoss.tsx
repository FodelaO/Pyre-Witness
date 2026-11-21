/** Prices one conditional event per row with the shared economic model and figure. */
"use client";

import { useMemo } from "react";
import { LossFigure } from "@/econ/LossFigure";
import { estimateLoss } from "@/econ/model";
import { scenarioFromWatch } from "@/econ/scenarios";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import type { Twin } from "@/twin/types";
import type { WatchRelevance } from "./relevance";
import type { ThreatItem } from "./types";
import { estimateWatchLoss } from "./watchLoss";

export function WatchLiveLoss({ row, twin }: { row: WatchRelevance; twin: Twin }) {
  const estimate = useMemo(() => estimateWatchLoss(twin, row), [twin, row]);
  if (!estimate) return null;
  const unit = row.item.source === "openfda" ? "per comparable event" : "per event";
  return <div className="pw-signal-loss"><LossFigure estimate={estimate} qualifier={unit} /></div>;
}

export function WatchAdvisoryLoss({ item, assetIds }: { item: ThreatItem; assetIds: readonly string[] }) {
  const twin = useEconomicTwin();
  const estimates = useMemo(() => [...new Set(assetIds)]
    .filter((id) => twin.assets.some((asset) => asset.id === id))
    .map((id) => estimateLoss(twin, scenarioFromWatch(twin, item, id))), [twin, item, assetIds]);
  return estimates.map((estimate) => <LossFigure key={estimate.asset.id} estimate={estimate} qualifier="per event" />);
}
