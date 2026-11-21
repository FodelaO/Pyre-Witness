/** Places equipment symbols and upright, zoom-aware equipment tags. */
import { memo } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import type { Asset, EquipmentKind } from "@/twin/types";
import { formatTelemetry } from "./telemetryFormat";

const primaryKinds = new Set<EquipmentKind>([
  "vertical_tank", "agitated_tank", "bullet_tank", "ro_skid", "carbo_cooler",
  "rotary_filler", "labeler", "palletizer", "condenser", "firewall",
]);
const secondaryKinds = new Set<EquipmentKind>(["plc_cabinet", "hmi", "chiller_compressor", "conveyor", "gateway"]);
const fieldKinds = new Set<EquipmentKind>(["instrument", "valve", "network_switch"]);

const AssetSymbol = memo(function AssetSymbol({ asset, selected, highlighted, direct }: {
  asset: Asset; selected: boolean; highlighted: boolean; direct: boolean;
}) {
  const { physical, process } = asset;
  const { kind, rotation, scale = 1 } = physical;
  const { w, h } = FOOTPRINT[kind];
  const added = asset.origin === "added";
  const angle = rotation * Math.PI / 180;
  const bottom = scale * (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
  const capacityLabel = asset.specs?.capacity ?? (process?.capacityL === undefined
    ? undefined
    : formatTelemetry(process.capacityL, "L"));
  const reading = process?.telemetry?.[0];
  const telemetry = reading ? formatTelemetry(reading.value, reading.unit) : capacityLabel;
  const primary = added || primaryKinds.has(kind) || (kind === "generic_device" && scale > 1);
  const tag = primary ? "primary" : secondaryKinds.has(kind) ? "secondary" : "detail";
  const running = process?.running ?? ((kind === "wifi_ap" || kind === "gateway") && !!asset.cyber?.radios.length && asset.status !== "offline" ? true : undefined);

  return (
    <g
      transform={`translate(${physical.x} ${physical.y})`}
      className="pw-floor-asset"
      data-floor-asset={asset.id}
      data-floor-target={asset.id}
      data-floor-added={added || undefined}
      data-tag={tag}
      data-field={fieldKinds.has(kind) || undefined}
      data-focused={selected || highlighted || undefined}
      data-tag-focus={selected || direct || undefined}
      data-highlighted={highlighted || undefined}
      data-status={asset.status}
      role="button"
      tabIndex={0}
      aria-label={`${asset.id} · ${asset.name}`}
      aria-pressed={selected}
    >
      <title>{asset.id} · {asset.name}</title>
      <g transform={`rotate(${rotation}) scale(${scale})`}>
        <rect className="pw-floor-asset-hit" x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} rx={4} />
        <g className={added ? "pw-floor-symbol pw-placed" : "pw-floor-symbol"}>
          <Equipment
            kind={kind}
            level={process?.levelPct === undefined ? undefined : process.levelPct / 100}
            medium={process?.medium}
            running={asset.status === "offline" ? false : running}
            status={asset.status}
            letters={kind === "instrument" ? asset.id.split("-")[0] : undefined}
            selected={selected}
            highlighted={highlighted}
            placement={asset.placement}
          />
        </g>
      </g>
      <g transform={`translate(0 ${bottom})`} pointerEvents="none" aria-hidden="true">
        <g className="pw-floor-screen-label">
          <text y={10} className="pw-floor-asset-tag" textAnchor="middle" fontSize={9} fill="var(--pw-text-dim)">{asset.id}</text>
          {telemetry && <text y={21} className="pw-floor-asset-reading" textAnchor="middle" fontSize={9} opacity={0}>{telemetry}</text>}
        </g>
      </g>
    </g>
  );
});

interface AssetLayerProps {
  assets: Asset[];
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  direct: ReadonlySet<string>;
}

export default memo(function AssetLayer({ assets, selectedId, highlighted, direct }: AssetLayerProps) {
  return (
    <g className="pw-floor-assets" aria-label="Plant equipment">
      {assets.map((asset) => (
        <AssetSymbol key={asset.id} asset={asset} selected={asset.id === selectedId}
          highlighted={highlighted.has(asset.id)} direct={direct.has(asset.id)} />
      ))}
    </g>
  );
});
