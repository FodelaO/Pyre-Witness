/** Shows the compact deduplicated annual loss exposure below the rule score. */
"use client";

import { useMemo } from "react";
import { useTwinStore } from "@/twin/store";
import { formatUsd, plantExposure } from "./model";
import { useEconomicTwin } from "./useEconomicTwin";

export function PlantLossExposure() {
  const twin = useEconomicTwin();
  const risk = useTwinStore((state) => state.risk);
  const amount = useMemo(() => plantExposure(twin, risk).totalAnnualised, [twin, risk]);
  return <div className="pw-panel-muted text-[11px]">Loss exposure <span className="pw-mono text-pw-text">{formatUsd(amount)}</span> est. / yr</div>;
}
