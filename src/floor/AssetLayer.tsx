/** Places equipment symbols and subscribes each symbol to its own linked highlight. */
import { memo } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";

const capacityFormat = new Intl.NumberFormat("en-US");

const AssetSymbol = memo(function AssetSymbol({ asset }: { asset: Asset }) {
  const selected = useTwinStore((state) => state.selectedId === asset.id);
  const highlighted = useTwinStore((state) => state.hoveredId === asset.id);
  const { physical, process } = asset;
  const { w, h } = FOOTPRINT[physical.kind];
  const added = asset.origin === "added";
  const capacityLabel = asset.specs?.capacity ?? (process?.capacityL === undefined
    ? undefined
    : `${capacityFormat.format(process.capacityL)} L`);

  return (
    <g
      transform={`translate(${physical.x} ${physical.y}) rotate(${physical.rotation}) scale(${physical.scale ?? 1})`}
      className="pw-floor-asset"
      data-floor-asset={asset.id}
      data-floor-added={added || undefined}
      role="button"
      tabIndex={0}
      aria-label={`${asset.id} · ${asset.name}`}
      aria-pressed={selected}
    >
      <rect className="pw-floor-asset-hit" x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} rx={4} />
      <g className={added ? "pw-placed" : undefined}>
        <Equipment
          kind={physical.kind}
          label={asset.id}
          level={process?.levelPct === undefined ? undefined : process.levelPct / 100}
          medium={process?.medium}
          running={process?.running}
          status={asset.status}
          capacityLabel={capacityLabel}
          letters={physical.kind === "instrument" ? asset.id.split("-")[0] : undefined}
          selected={selected}
          highlighted={highlighted}
          placement={asset.placement}
        />
      </g>
    </g>
  );
});

export default memo(function AssetLayer({ assets }: { assets: Asset[] }) {
  return (
    <g className="pw-floor-assets" aria-label="Plant equipment">
      {assets.map((asset) => <AssetSymbol key={asset.id} asset={asset} />)}
    </g>
  );
});
