/** Projects the capture review's checked floor, network and wiring changes together. */
import { placementChecks } from "@/panel/runEvidence";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { RunState } from "@/pipeline/runStore";
import { evaluatePlacement } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { assetById, areaById } from "@/twin/geometry";
import type { MitigationEffect, Twin } from "@/twin/types";

export type CaptureReview = Pick<RunState, "runId" | "assessment" | "placedAssetId"> & {
  objectClass?: NonNullable<RunState["profile"]>["object_class"];
};

export function captureIsChecked(state: Pick<RunState, "status" | "events">): boolean {
  return state.status !== "running" && placementChecks(state.events).recommendation?.passed === true;
}

export function checkedCapture(state: RunState): CaptureReview | null {
  const { runId, assessment, placedAssetId, profile } = state;
  return captureIsChecked(state) ? { runId, assessment, placedAssetId, objectClass: profile?.object_class } : null;
}

export function captureProposal(twin: Twin, { placedAssetId, assessment, objectClass }: CaptureReview) {
  if (!assessment || !placedAssetId) return null;
  const asset = assetById(twin, placedAssetId);
  if (!asset || asset.origin !== "added") return null;
  const target = atRecommendedPlacement(twin, asset, assessment, objectClass);
  if (!target || evaluatePlacement(twin, target).findings.some(({ severity }) => severity >= 4)) return null;

  const { area, x, y, connections } = target.physical;
  const { level, area: networkArea, conduit } = target.network;
  const here = asset.physical;
  if (here.area === area && here.x === x && here.y === y
    && asset.network.level === level && asset.network.area === networkArea && asset.network.conduit === conduit
    && here.connections.length === connections.length
    && connections.every((next) => here.connections.some((link) => link.to === next.to && link.medium === next.medium
      && (link.active !== false) === (next.active !== false)))) return null;

  const effects: MitigationEffect[] = [{ type: "move_asset", assetId: asset.id, area, x, y, level, networkArea, conduit }];
  // Prepare the capture-specific wiring and passive classification before applying the move.
  const prepared: Twin = { ...twin, assets: twin.assets.map((item) => item.id === asset.id ? {
    ...item, placement: "recommended", cyber: target.cyber, process: target.process,
    physical: { ...item.physical, kind: target.physical.kind, connections },
    network: { ...target.network, level: item.network.level, area: item.network.area, conduit: item.network.conduit },
  } : item) };
  return {
    effects,
    assetId: asset.id,
    description: `Move ${asset.id} to ${areaById(twin, area)?.name ?? area}.`,
    twin: applyEffects(prepared, effects),
  };
}
