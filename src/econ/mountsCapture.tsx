/** Compares conditional losses on the two rules-engine-checked capture placements. */
"use client";

import { useMemo } from "react";
import { assetFromProfile, atRecommendedPlacement, networkAt } from "@/pipeline/assetFromProfile";
import { useRunStore } from "@/pipeline/runStore";
import type { SelfCheckResult } from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import { LossFigure } from "./LossFigure";
import { displayedEventLoss } from "./displayLedger";
import { estimateLoss } from "./model";
import { scenarioFromFinding, scenarioFromPath } from "./scenarios";
import type { LossEstimate } from "./types";
import { useEconomicTwin } from "./useEconomicTwin";

type CheckedPlacement = "as-dropped" | "recommendation";

function withPlacement(twin: Twin, placed: Asset): Twin {
  return {
    ...twin,
    assets: twin.assets.map((asset) => asset.id === placed.id ? placed : asset),
  };
}

function useAsDroppedAsset(twin: Twin, assetId: string | null) {
  const started = useRunStore((state) => state.events[0]);
  const profile = useRunStore((state) => state.profile);
  return useMemo(() => {
    const asset = assetId ? assetById(twin, assetId) : undefined;
    if (!asset || started?.type !== "run.started" || !started.dropPoint) return asset;
    const point = started.dropPoint;
    if (asset.physical.area === point.area && asset.physical.x === point.x && asset.physical.y === point.y) {
      return asset;
    }
    const surroundings = { ...twin, assets: twin.assets.filter(({ id }) => id !== asset.id) };
    if (started.mode !== "reassess" && profile) return assetFromProfile(profile, surroundings, asset.id, point);
    return {
      ...asset,
      physical: { ...asset.physical, ...point },
      network: networkAt(surroundings, point, asset.physical.kind, asset.network.level),
    };
  }, [twin, assetId, started, profile]);
}

export function useCaptureAssessmentTwin(placement?: CheckedPlacement): Twin {
  const twin = useEconomicTwin();
  const assetId = useRunStore((state) => state.placedAssetId);
  const assessment = useRunStore((state) => state.assessment);
  const objectClass = useRunStore((state) => state.profile?.object_class);
  const dropped = useAsDroppedAsset(twin, assetId);
  return useMemo(() => {
    if (!placement || !dropped) return twin;
    const candidate = placement === "recommendation" && assessment
      ? atRecommendedPlacement(twin, dropped, assessment, objectClass) : dropped;
    return candidate ? withPlacement(twin, candidate) : twin;
  }, [twin, dropped, placement, assessment, objectClass]);
}

function highestCheckedLoss(twin: Twin, checked: SelfCheckResult): LossEstimate | undefined {
  const scenarios = [
    ...checked.findings.map((finding) => scenarioFromFinding(twin, finding)),
    ...checked.paths.filter(({ source }) => source === "rules").map((path) => scenarioFromPath(twin, path)),
  ];
  let highest: LossEstimate | undefined;
  for (const scenario of scenarios) {
    if (!scenario || !assetById(twin, scenario.assetId)) continue;
    const estimate = estimateLoss(twin, scenario);
    if (!highest || estimate.lossIfManifests > highest.lossIfManifests) highest = estimate;
  }
  return highest;
}

export function CapturePlacementLoss({ target, dropped, checked }: {
  target: Asset | null;
  dropped: SelfCheckResult | null;
  checked: SelfCheckResult | null;
}) {
  const beforeTwin = useCaptureAssessmentTwin("as-dropped");
  const currentTwin = useEconomicTwin();
  const estimates = useMemo(() => {
    if (!target || !dropped || !checked?.passed) return null;
    const before = highestCheckedLoss(beforeTwin, dropped);
    const after = highestCheckedLoss(withPlacement(currentTwin, target), checked);
    return { before, after };
  }, [target, dropped, checked, beforeTwin, currentTwin]);
  if (!target || !estimates) return null;

  const before = displayedEventLoss(estimates.before);
  const after = displayedEventLoss(estimates.after);
  const estimate = estimates.before ?? estimates.after;
  if (!estimate) return <span className="pw-panel-muted pw-mono text-[11px]">No modeled loss change</span>;
  return <LossFigure estimate={estimate}
    qualifier={after > before ? "more if moved" : "if moved"}
    subtitleAsset={{ id: target.id, tag: target.id, name: target.name, kind: target.physical.kind }}
    difference={estimates} />;
}
