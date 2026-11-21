/** Interactive asset symbols, tags, and chain focus for the standalone review floor. */
"use client";

import { memo, useMemo } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import { useTwinStore } from "@/twin/store";
import type { Asset, EquipmentKind } from "@/twin/types";
import { lensAssetClass } from "./lensClassification";

const visibleTags = new Set<EquipmentKind>([
  "vertical_tank", "bullet_tank", "agitated_tank", "ro_skid", "carbo_cooler", "rotary_filler",
  "labeler", "palletizer", "chiller_compressor", "condenser", "plc_cabinet", "hmi", "server_rack",
  "firewall", "gateway", "wifi_ap", "workstation", "network_switch",
]);

const Symbol = memo(function Symbol({ asset, current, highlighted, detailed }: {
  asset: Asset;
  current: boolean;
  highlighted: boolean;
  detailed: boolean;
}) {
  const { physical, process } = asset;
  const { kind, rotation, scale = 1, x, y } = physical;
  const { w, h } = FOOTPRINT[kind];
  const angle = rotation * Math.PI / 180;
  const bottom = scale * (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
  const reading = process?.telemetry?.[0];
  const remoteIndicator = (kind === "wifi_ap" || kind === "gateway") && Boolean(asset.cyber?.radios.length);
  const running = asset.status !== "offline" && (process?.running ?? remoteIndicator);

  return (
    <g
      className={`pwl-review-asset ${lensAssetClass(asset)}`}
      data-lens-review-asset={asset.id}
      data-highlighted={highlighted || undefined}
      data-current={current || undefined}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${asset.id} · ${asset.name}`}
      aria-pressed={current}
      onPointerEnter={() => useTwinStore.getState().hover(asset.id)}
      onPointerLeave={() => { if (useTwinStore.getState().hoveredId === asset.id) useTwinStore.getState().hover(null); }}
      onFocus={() => useTwinStore.getState().hover(asset.id)}
      onBlur={() => { if (useTwinStore.getState().hoveredId === asset.id) useTwinStore.getState().hover(null); }}
      onClick={() => {
        const store = useTwinStore.getState();
        store.select(store.selectedId === asset.id ? null : asset.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const store = useTwinStore.getState();
        store.select(store.selectedId === asset.id ? null : asset.id);
      }}
    >
      <title>{asset.id} · {asset.name}</title>
      <g className="pwl-review-asset-figure" transform={`rotate(${rotation}) scale(${scale})`}>
        <rect className="pwl-review-asset-hit" x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} rx={4} />
        <Equipment
          kind={kind}
          level={process?.levelPct === undefined ? undefined : process.levelPct / 100}
          medium={process?.medium}
          running={running}
          status={asset.status}
          letters={kind === "instrument" ? asset.id.split("-")[0] : undefined}
          selected={current}
          highlighted={highlighted}
          placement={asset.placement}
        />
      </g>
      {(detailed || current || highlighted || visibleTags.has(kind)) && (
        <g className="pwl-review-asset-tag" transform={`translate(0 ${bottom + 12})`} aria-hidden="true">
          <text textAnchor="middle">{asset.id}</text>
          {detailed && reading && <text className="pwl-review-reading lens-material-only" y={13} textAnchor="middle">{reading.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} {reading.unit}</text>}
        </g>
      )}
    </g>
  );
});

export default memo(function LensReviewEquipment({ assets, zoom }: { assets: Asset[]; zoom: number }) {
  const current = useTwinStore((state) => state.selectedId);
  const hovered = useTwinStore((state) => state.hoveredId);
  const chain = useTwinStore((state) => state.highlightIds);
  const highlighted = useMemo(() => new Set(chain), [chain]);

  return (
    <g className="pwl-review-equipment" aria-label="Plant equipment">
      {assets.map((asset) => (
        <Symbol key={asset.id} asset={asset} current={current === asset.id}
          highlighted={hovered === asset.id || highlighted.has(asset.id)} detailed={zoom >= 1.5} />
      ))}
    </g>
  );
});
