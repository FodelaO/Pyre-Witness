/** Places equipment symbols and upright, zoom-aware equipment tags. */
import { memo, useMemo } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import { lensAssetClass } from "@/layers/lensClassification";
import type { LensMode } from "@/layers/lensStore";
import type { Area, Asset, EquipmentKind } from "@/twin/types";
import { assetLabel, labelAboveWashdown } from "./assetLabel";
import { isClear, screenLabelBox, type LabelBox } from "./labelPlacement";
import { formatTelemetry } from "./telemetryFormat";

const primaryKinds = new Set<EquipmentKind>([
  "vertical_tank", "agitated_tank", "bullet_tank", "ro_skid", "carbo_cooler",
  "rotary_filler", "labeler", "palletizer", "condenser", "firewall",
]);
const secondaryKinds = new Set<EquipmentKind>(["plc_cabinet", "hmi", "chiller_compressor", "conveyor", "gateway"]);
const fieldKinds = new Set<EquipmentKind>(["instrument", "valve", "network_switch"]);
const tankKinds = new Set<EquipmentKind>(["vertical_tank", "agitated_tank", "bullet_tank"]);

function labelsForAsset(asset: Asset, washdown: Area["bounds"] | undefined, fitScale: number) {
  const { physical, process } = asset;
  const { kind, rotation, scale = 1 } = physical;
  const { w, h } = FOOTPRINT[kind];
  const added = asset.origin === "added";
  const label = assetLabel(asset);
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
  return {
    label, tag, telemetry, tankLevel,
    offset: aboveBorder ? -bottom : bottom,
    tagY: aboveBorder ? -6 : 10,
    readingY: aboveBorder ? -17 : 21,
  };
}

const AssetSymbol = memo(function AssetSymbol({
  asset, selected, highlighted, direct, instrumentDetail, label, tag, telemetry, tankLevel, offset, tagY, readingY, showTag, readingX,
}: {
  asset: Asset; selected: boolean; highlighted: boolean; direct: boolean; instrumentDetail: boolean;
  showTag: boolean; readingX?: number;
} & ReturnType<typeof labelsForAsset>) {
  const { physical, process } = asset;
  const { kind, rotation, scale = 1 } = physical;
  const { w, h } = FOOTPRINT[kind];
  const added = asset.origin === "added";
  const accessibleName = label === asset.name ? label : `${label} · ${asset.name}`;
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
        <rect className="pw-floor-asset-hit" x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} rx={kind === "instrument" ? 0 : 4}
          pointerEvents={kind === "instrument" ? "all" : undefined} />
      </g>
      {tankLevel !== undefined && <g className="lens-material-only" pointerEvents="none" aria-hidden="true">
        <text className="pw-floor-tank-level pw-floor-screen-label" y={4}>{formatTelemetry(Math.round(tankLevel), "%")}</text>
      </g>}
      <g transform={`translate(0 ${offset})`} pointerEvents="none" aria-hidden="true">
        <g className="pw-floor-screen-label">
          {showTag && <text y={tagY} className="pw-floor-asset-tag">{label}</text>}
          {telemetry && readingX !== undefined && (
            <g className="lens-material-only"><text x={readingX} y={readingY} className="pw-floor-asset-reading">{telemetry}</text></g>
          )}
        </g>
      </g>
    </g>
  );
});

/** Reserves the visible, fixed-size text in priority order at the current zoom. */
function placeAssetLabels(entries: { asset: Asset; labels: ReturnType<typeof labelsForAsset> }[],
  selectedId: string | null, direct: ReadonlySet<string>, lens: LensMode, relative: number, scale: number) {
  const tags = new Set<string>();
  const readings = new Map<string, number>();
  const rank = ({ asset, labels }: (typeof entries)[number]) => {
    if (asset.id === selectedId) return 0;
    const linked = direct.has(asset.id);
    if (lens === "both" && relative < 1.5 && asset.origin !== "added" && !linked) return Infinity;
    const alwaysOn = lens === "data" && labels.tag === "secondary" && lensAssetClass(asset) === "lens-ghost-in-material";
    if (labels.tag === "primary" || alwaysOn) return 1;
    if (linked) return 2;
    const detailed = relative > 1.12;
    if (labels.tag === "secondary" && (detailed || scale > 0.37)) return 3;
    return detailed ? 4 : Infinity;
  };
  const order = entries.map((entry) => ({ ...entry, rank: rank(entry) }))
    .sort((a, b) => a.rank - b.rank || b.asset.criticality - a.asset.criticality);
  const levels = lens === "data" ? [] : entries.flatMap(({ asset, labels }) => labels.tankLevel === undefined ? [] : [
    screenLabelBox(asset.physical.x, asset.physical.y + 4 / scale, formatTelemetry(Math.round(labels.tankLevel), "%"), scale),
  ]);
  const boxes: { id: string; box: LabelBox }[] = [];
  for (const { asset: { id, physical: { x, y } }, labels, rank } of order) {
    const box = screenLabelBox(x, y + labels.offset + labels.tagY / scale, labels.label, scale);
    if (rank !== 0 && (!isClear(box, levels, 2 / scale) || !isClear(box, boxes.map(({ box }) => box), 2 / scale))) continue;
    tags.add(id);
    // CSS reveals these otherwise hidden tags only on keyboard focus.
    if (Number.isFinite(rank)) boxes.push({ id, box });
  }
  if (lens !== "data" && relative > 1.55) {
    for (const { asset: { id, physical: { x, y } }, labels } of order) {
      if (!labels.telemetry || !tags.has(id)) continue;
      const others = boxes.filter((entry) => entry.id !== id).map(({ box }) => box);
      const preferred = screenLabelBox(x, y + labels.offset + labels.readingY / scale, labels.telemetry, scale);
      const candidate = [0, -6, 6, -12, 12].map((shift) => ({ shift, box: { ...preferred, x: preferred.x + shift / scale } }))
        .find(({ box }) => isClear(box, levels, 2 / scale) && isClear(box, others, 2 / scale));
      if (!candidate) continue;
      readings.set(id, candidate.shift);
      boxes.push({ id, box: candidate.box });
    }
  }
  return { tags, readings };
}

interface AssetLayerProps {
  assets: Asset[];
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  direct: ReadonlySet<string>;
  instrumentDetail: boolean;
  washdown?: Area["bounds"];
  fitScale: number;
  pixelsPerUnit: number;
  lens: LensMode;
}

export default memo(function AssetLayer({ assets, selectedId, highlighted, direct, instrumentDetail, washdown, fitScale, pixelsPerUnit, lens }: AssetLayerProps) {
  const entries = useMemo(() => assets.map((asset) => ({ asset, labels: labelsForAsset(asset, washdown, fitScale) })), [assets, washdown, fitScale]);
  const { tags, readings } = useMemo(() =>
    placeAssetLabels(entries, selectedId, direct, lens, pixelsPerUnit / fitScale, pixelsPerUnit),
  [entries, selectedId, direct, lens, fitScale, pixelsPerUnit]);
  return (
    <g className="pw-floor-assets" aria-label="Plant equipment">
      {entries.map(({ asset, labels }) => (
        <AssetSymbol key={asset.id} asset={asset} selected={asset.id === selectedId}
          highlighted={highlighted.has(asset.id)} direct={direct.has(asset.id)} instrumentDetail={instrumentDetail}
          {...labels} showTag={tags.has(asset.id)} readingX={readings.get(asset.id)} />
      ))}
    </g>
  );
});
