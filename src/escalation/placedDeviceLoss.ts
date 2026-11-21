/**
 * Prices the captured device with the results panel's per-event figure: the largest loss among the
 * rules-engine-checked findings and paths of the placement it is in, rounded as displayed.
 * Same econ functions and run evidence as `src/panel/PlacementLoss.tsx` (`Here` / `est. loss now`).
 */
import { displayedEventLoss } from "@/econ/displayLedger";
import { estimateLoss } from "@/econ/model";
import { scenarioFromFinding, scenarioFromPath } from "@/econ/scenarios";
import type { LossEstimate } from "@/econ/types";
import { samePlacement } from "@/panel/PlacementLoss";
import { placementChecks } from "@/panel/runEvidence";
import { assetFromProfile, atRecommendedPlacement, networkAt } from "@/pipeline/assetFromProfile";
import type { RunState } from "@/pipeline/runStore";
import type { SelfCheckResult } from "@/pipeline/types";
import { evaluatePlacement } from "@/rules/engine";
import { assetById } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";

export type RunEvidence = Pick<RunState, "status" | "events" | "profile" | "assessment" | "placedAssetId">;

export interface PlacedDeviceLoss {
  /** The device in the placement that was priced. */
  asset: Asset;
  /** "here" = where it was dropped, "moved" = at the checked recommendation. */
  placement: "here" | "moved";
  /** Rounded per-event loss exactly as the panel prints it. */
  loss: number;
  /** The panel's `There` figure while the device is still where it was dropped. */
  lossIfMoved: number | null;
  /** Scenario behind the figure, when the check found one. */
  estimate: LossEstimate | undefined;
}

function highestChecked(twin: Twin, check: SelfCheckResult): LossEstimate | undefined {
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
  return highest;
}

function withAsset(twin: Twin, placed: Asset): Twin {
  return { ...twin, assets: twin.assets.map((asset) => asset.id === placed.id ? placed : asset) };
}

function asDropped(twin: Twin, asset: Asset, run: RunEvidence): Asset {
  const started = run.events[0];
  if (started?.type !== "run.started" || !started.dropPoint) return asset;
  const point = started.dropPoint;
  if (asset.physical.area === point.area && asset.physical.x === point.x && asset.physical.y === point.y) return asset;
  const surroundings = { ...twin, assets: twin.assets.filter(({ id }) => id !== asset.id) };
  if (started.mode !== "reassess" && run.profile) return assetFromProfile(run.profile, surroundings, asset.id, point);
  return {
    ...asset,
    physical: { ...asset.physical, ...point },
    network: networkAt(surroundings, point, asset.physical.kind, asset.network.level),
  };
}

/** Null while the panel shows no placement figure: run in progress, held, or no checked recommendation. */
export function placedDeviceLoss(twin: Twin, run: RunEvidence): PlacedDeviceLoss | null {
  if (run.status === "running" || !run.assessment || !run.placedAssetId) return null;
  const placed = assetById(twin, run.placedAssetId);
  const { dropped, recommendation: checked } = placementChecks(run.events);
  if (!placed || !checked?.passed) return null;
  const candidate = atRecommendedPlacement(twin, placed, run.assessment, run.profile?.object_class);
  if (!candidate || evaluatePlacement(twin, candidate).findings.some(({ severity }) => severity >= 4)) return null;

  if (samePlacement(placed, candidate)) {
    const estimate = highestChecked(twin, checked);
    return { asset: placed, placement: "moved", loss: displayedEventLoss(estimate), lossIfMoved: null, estimate };
  }
  if (!dropped) return null;
  const origin = asDropped(twin, placed, run);
  const estimate = highestChecked(withAsset(twin, origin), dropped);
  return {
    asset: origin, placement: "here", loss: displayedEventLoss(estimate),
    lossIfMoved: displayedEventLoss(highestChecked(withAsset(twin, candidate), checked)), estimate,
  };
}
