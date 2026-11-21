/** Recommended floor and network placement, with linked references and one move action. */
"use client";

import { ArrowRight, Check, LocateFixed, MapPin } from "lucide-react";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import { moveToRecommended } from "@/pipeline/client";
import type { Assessment } from "@/pipeline/types";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { PanelHeading, PurdueBadge, readableId, TextPreview } from "./PanelParts";

export function PlacementAnswer({ assessment, placedAssetId, pending }: {
  assessment: Assessment;
  placedAssetId: string | null;
  pending: boolean;
}) {
  const { placement, physical_placement: physical } = assessment;
  const twin = useTwinStore((state) => state.twin);
  const area = areaById(twin, physical.area);
  const near = physical.near_asset_id ? assetById(twin, physical.near_asset_id) : undefined;
  const placed = placedAssetId ? assetById(twin, placedAssetId) : undefined;
  const select = useTwinStore((state) => state.select);
  const target = placed && !pending ? atRecommendedPlacement(twin, placed, assessment) : null;
  const atTarget = placed && target && placed.physical.x === target.physical.x && placed.physical.y === target.physical.y
    && placed.physical.area === target.physical.area && placed.network.level === target.network.level
    && placed.network.area === target.network.area && placed.network.conduit === target.network.conduit
    && placed.physical.connections.length === target.physical.connections.length
    && target.physical.connections.every(({ to, medium }) => placed.physical.connections.some((edge) => edge.to === to && edge.medium === medium));
  return (
    <>
      <PanelHeading icon={MapPin}>Where it goes</PanelHeading>
      <div className="pw-panel-placement">
        <div className="pw-panel-placement-zone"><PurdueBadge level={placement.level} /><span>{placement.network_area}</span></div>
        <div className="pw-panel-location">
          {area ? <button type="button" className="pw-panel-link" onClick={() => select(area.id)}>{area.name}</button> : readableId(physical.area)}
          {near && <span>near <button type="button" className="pw-panel-link pw-mono" title={near.name} onClick={() => select(near.id)}>{near.id}</button></span>}
        </div>
        {placement.why && <TextPreview text={placement.why} label="Placement rationale" />}
        <button type="button" className="pw-panel-button pw-panel-move" disabled={!target}
          title={!placed ? "Available when the device is on the twin" : pending ? "Requires a completed placement check"
            : !target ? "No valid spot for this recommendation" : atTarget ? "Select the device on the twin" : undefined}
          onClick={() => {
            if (!placed) return;
            if (!atTarget) moveToRecommended(placed.id);
            select(placed.id);
          }}>
          {atTarget ? <><Check size={14} aria-hidden />At recommended location</> : <><LocateFixed size={14} aria-hidden />Move there<ArrowRight size={14} aria-hidden /></>}
        </button>
      </div>
    </>
  );
}
