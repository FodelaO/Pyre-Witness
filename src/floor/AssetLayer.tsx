/** Places equipment symbols and upright, zoom-aware equipment tags. */
import { memo, useMemo } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import { lensAssetClass } from "@/layers/lensClassification";
import type { Area, Asset, EquipmentKind } from "@/twin/types";
import { assetLabel, labelAboveWashdown } from "./assetLabel";
import { isClear, type LabelBox } from "./labelPlacement";
import { formatTelemetry } from "./telemetryFormat";

const primaryKinds = new Set<EquipmentKind>([
  "vertical_tank", "agitated_tank", "bullet_tank", "ro_skid", "carbo_cooler",
  "rotary_filler", "labeler", "palletizer", "condenser", "firewall",
]);
const secondaryKinds = new Set<EquipmentKind>(["plc_cabinet", "hmi", "chiller_compressor", "conveyor", "gateway"]);
const fieldKinds = new Set<EquipmentKind>(["instrument", "valve", "network_switch"]);
const tankKinds = new Set<EquipmentKind>(["vertical_tank", "agitated_tank", "bullet_tank"]);

const AssetSymbol = memo(function AssetSymbol({ asset, selected, highlighted, direct, instrumentDetail, washdown, fitScale }: {
  asset: Asset; selected: boolean; highlighted: boolean; direct: boolean; instrumentDetail: boolean;
  washdown?: Area["bounds"]; fitScale: number;
}) {
  const { physical, process } = asset;
  const { kind, rotation, scale = 1 } = physical;
  const { w, h } = FOOTPRINT[kind];
  const added = asset.origin === "added";
  const label = assetLabel(asset);
  const accessibleName = label === asset.name ? label : `${label} · ${asset.name}`;
  const angle = rotation * Math.PI / 180;
  const bottom = scale * (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
  const aboveBorder = labelAboveWashdown(physical.x, physical.y + bottom, washdown, fitScale);
  const tankLevel = tankKinds.has(kind) ? process?.levelPct : undefined;
  const capacityLabel = asset.specs?.capacity ?? (process?.capacityL === undefined
    ? undefined
    : formatTelemetry(process.capacityL, "L"));
  const reading = process?.telemetry?.[0];
  const telemetry = reading && (reading.unit !== "%" || reading.value !== tankLevel) ? formatTelemetry(reading.value, reading.unit) : capacityLabel;
  const primary = added || primaryKinds.has(kind) || (kind === "generic_device" && scale > 1);
  const tag = primary ? "primary" : secondaryKinds.has(kind) ? "secondary" : "detail";
  const running = process?.running ?? ((kind === "wifi_ap" || kind === "gateway") && !!asset.cyber?.radios.length && asset.status !== "offline" ? true : undefined);

  return (
    <g
      transform={`translate(${physical.x} ${physical.y})`}
      className={`pw-floor-asset ${lensAssetClass(asset)}`}
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
      aria-label={accessibleName}
      aria-pressed={selected}
    >
      <title>{accessibleName}</title>
      <g transform={`rotate(${rotation}) scale(${scale})`}>
        <rect className="pw-floor-asset-hit" x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} rx={4} />
        <g className={added ? "pw-floor-symbol pw-placed" : "pw-floor-symbol"}>
          {kind === "instrument" && !instrumentDetail ? <path className="pw-floor-field-mark" d="M-3.5 0h7" data-placement={asset.placement} /> : <Equipment
            kind={kind}
            level={process?.levelPct === undefined ? undefined : process.levelPct / 100}
            medium={process?.medium}
            running={asset.status === "offline" ? false : running}
            status={asset.status}
            letters={kind === "instrument" ? asset.id.split("-")[0] : undefined}
            selected={selected}
            highlighted={highlighted}
            placement={asset.placement}
          />}
        </g>
      </g>
      {tankLevel !== undefined && <g className="lens-material-only" pointerEvents="none" aria-hidden="true">
        <text className="pw-floor-tank-level pw-floor-screen-label" y={4}>{formatTelemetry(Math.round(tankLevel), "%")}</text>
      </g>}
      <g transform={`translate(0 ${aboveBorder ? -bottom : bottom})`} pointerEvents="none" aria-hidden="true">
        <g className="pw-floor-screen-label">
          <text y={aboveBorder ? -6 : 10} className="pw-floor-asset-tag">{label}</text>
          {telemetry && <g className="lens-material-only"><text y={aboveBorder ? -17 : 21} className="pw-floor-asset-reading">{telemetry}</text></g>}
        </g>
      </g>
    </g>
  );
});

/** Neighbour tags that stay readable at the fitted size: the selected tag first, then larger equipment; a tag that would land on a kept one is left out. */
function clearNeighbourTags(assets: Asset[], selectedId: string | null, direct: ReadonlySet<string>, fitScale: number): ReadonlySet<string> {
  const kept = new Set<string>();
  if (!direct.size) return kept;
  const px = fitScale > 0 ? fitScale : 1;
  const rank = ({ id, physical: { kind } }: Asset) =>
    id === selectedId ? 0 : primaryKinds.has(kind) ? 1 : secondaryKinds.has(kind) ? 2 : fieldKinds.has(kind) ? 4 : 3;
  const boxes: LabelBox[] = [];
  const candidates = assets.filter(({ id }) => id === selectedId || direct.has(id)).sort((a, b) => rank(a) - rank(b));
  for (const asset of candidates) {
    const { x, y, kind, rotation, scale = 1 } = asset.physical;
    const { w, h } = FOOTPRINT[kind];
    const angle = rotation * Math.PI / 180;
    const bottom = scale * (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
    const width = (assetLabel(asset).length * 5.8 + 4) / px;
    const box = { x: x - width / 2, y: y + bottom + 1 / px, w: width, h: 11 / px };
    if (asset.id !== selectedId && !isClear(box, boxes)) continue;
    kept.add(asset.id);
    boxes.push(box);
  }
  return kept;
}

interface AssetLayerProps {
  assets: Asset[];
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  direct: ReadonlySet<string>;
  instrumentDetail: boolean;
  washdown?: Area["bounds"];
  fitScale: number;
}

export default memo(function AssetLayer({ assets, selectedId, highlighted, direct, instrumentDetail, washdown, fitScale }: AssetLayerProps) {
  const tagged = useMemo(() => clearNeighbourTags(assets, selectedId, direct, fitScale), [assets, selectedId, direct, fitScale]);
  return (
    <g className="pw-floor-assets" aria-label="Plant equipment">
      {assets.map((asset) => (
        <AssetSymbol key={asset.id} asset={asset} selected={asset.id === selectedId}
          highlighted={highlighted.has(asset.id)} direct={tagged.has(asset.id)} {...{ instrumentDetail, washdown, fitScale }} />
      ))}
    </g>
  );
});
