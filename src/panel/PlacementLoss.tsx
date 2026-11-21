/** Shows the checked single-event loss at each capture placement and acknowledges a completed move. */
"use client";

import { useMemo } from "react";
import { displayedEventLoss } from "@/econ/displayLedger";
import { formatUsd } from "@/econ/format";
import { LossGlyph } from "@/econ/LossGlyph";
import { estimateLoss } from "@/econ/model";
import { useCaptureAssessmentTwin } from "@/econ/mountsCapture";
import { scenarioFromFinding, scenarioFromPath } from "@/econ/scenarios";
import type { LossEstimate } from "@/econ/types";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import type { SelfCheckResult } from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import "./placementLoss.css";

export function samePlacement(asset: Asset, target: Asset): boolean {
  const here = asset.physical;
  const there = target.physical;
  return here.x === there.x && here.y === there.y && here.area === there.area
    && asset.network.level === target.network.level && asset.network.area === target.network.area
    && asset.network.conduit === target.network.conduit && here.connections.length === there.connections.length
    && there.connections.every(({ to, medium }) => here.connections.some((edge) => edge.to === to && edge.medium === medium));
}

function checkedEventLoss(twin: Twin, check: SelfCheckResult): number {
  const scenarios = [
    ...check.findings.map((finding) => scenarioFromFinding(twin, finding)),
    ...check.paths.filter(({ source }) => source === "rules").map((path) => scenarioFromPath(twin, path)),
  ];
  let highest: LossEstimate | undefined;
  for (const scenario of scenarios) {
    if (!scenario || !assetById(twin, scenario.assetId)) continue;
    const estimate = estimateLoss(twin, scenario);
    if (!highest || estimate.lossIfManifests > highest.lossIfManifests) highest = estimate;
  }
  return displayedEventLoss(highest);
}

export function PlacementLoss({ target, dropped, checked, atTarget, moveConfirmed }: {
  target: Asset | null;
  dropped: SelfCheckResult | null;
  checked: SelfCheckResult | null;
  atTarget: boolean;
  moveConfirmed: boolean;
}) {
  const liveTwin = useEconomicTwin();
  const droppedTwin = useCaptureAssessmentTwin("as-dropped");
  const amounts = useMemo(() => {
    if (!target || !checked?.passed) return null;
    const origin = assetById(droppedTwin, target.id);
    const there = atTarget ? liveTwin : {
      ...liveTwin, assets: liveTwin.assets.map((asset) => asset.id === target.id ? target : asset),
    };
    const now = checkedEventLoss(there, checked);
    if (atTarget) return { kind: "receipt" as const, moved: moveConfirmed || Boolean(origin && !samePlacement(origin, target)), now };
    return dropped ? { kind: "comparison" as const, here: checkedEventLoss(droppedTwin, dropped), there: now } : null;
  }, [target, dropped, checked, atTarget, moveConfirmed, liveTwin, droppedTwin]);

  if (!target || !amounts) return null;
  return (
    <div className="pw-placement-loss" data-placement-loss role="status" title="Largest modeled loss per event in each placement check">
      <LossGlyph kind={target.physical.kind} size={32} />
      <div>
        {amounts.kind === "receipt"
          ? <>{amounts.moved ? "Moved" : "At recommended spot"} · est. loss now <strong>{formatUsd(amounts.now)}</strong></>
          : <>Here <strong>{formatUsd(amounts.here)}</strong> · There <strong>{formatUsd(amounts.there)}</strong></>}
        <span className="pw-placement-loss-unit">{amounts.kind === "receipt" ? "per event" : "est. per event"}</span>
      </div>
    </div>
  );
}
