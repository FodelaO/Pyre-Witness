/** Recommended floor and network placement, with linked references and one move action. */
"use client";

import { ArrowRight, LocateFixed, MapPin } from "lucide-react";
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
  const area = useTwinStore((state) => areaById(state.twin, physical.area));
  const near = useTwinStore((state) => physical.near_asset_id ? assetById(state.twin, physical.near_asset_id) : undefined);
  const placed = useTwinStore((state) => placedAssetId ? assetById(state.twin, placedAssetId) : undefined);
  const select = useTwinStore((state) => state.select);
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
        <button type="button" className="pw-panel-button pw-panel-move" disabled={!placed || pending}
          title={!placed ? "Available when the device is on the twin" : pending ? "Requires a completed placement check" : undefined}
          onClick={() => {
            if (!placed) return;
            moveToRecommended(placed.id);
            select(placed.id);
          }}>
          <LocateFixed size={14} aria-hidden />Move there<ArrowRight size={14} aria-hidden />
        </button>
      </div>
    </>
  );
}
