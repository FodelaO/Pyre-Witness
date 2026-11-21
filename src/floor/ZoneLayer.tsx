/** Room boundaries, operating notes and quiet context markings. */
import { memo, useId, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { FOOTPRINT } from "@/equipment/types";
import { useTwinStore } from "@/twin/store";
import type { Area, PhysicalPresence } from "@/twin/types";
import type { LabelBox } from "./labelPlacement";
import ZoneLabel from "./ZoneLabel";

function ParkingMarks({ bounds: { x, y, w, h } }: { bounds: Area["bounds"] }) {
  const spacing = Math.min(76, w / 8);
  const scale = Math.min(1, h / 100, spacing / 58);
  return (
    <g className="pw-floor-parking" transform={`translate(${x + w * 0.51} ${y + h * 0.68})`}>
      {[0, 1, 2, 3].map((index) => (
        <g key={index} transform={`translate(${index * spacing} 0) scale(${scale})`}>
          <path d="M-31 -24v48 M31 -24v48" className="pw-floor-parking-mark" />
          {index !== 2 && (
            <g transform={index === 1 ? "rotate(180)" : undefined}>
              <rect x={-24} y={-12} width={48} height={24} rx={8} />
              <path d="M-11 -11l5 6v10l-5 6m22-22l-5 6v10l5 6M-6 -5H6m-12 10H6M-18 -8v16m36-16v16" />
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

function reservedSpace(physical: PhysicalPresence): LabelBox {
  const footprint = FOOTPRINT[physical.kind];
  const angle = physical.rotation * Math.PI / 180;
  const scale = physical.scale ?? 1;
  const halfW = scale * (Math.abs(footprint.w * Math.cos(angle)) + Math.abs(footprint.h * Math.sin(angle))) / 2 + 5;
  const halfH = scale * (Math.abs(footprint.w * Math.sin(angle)) + Math.abs(footprint.h * Math.cos(angle))) / 2 + 5;
  return { x: physical.x - halfW, y: physical.y - halfH, w: halfW * 2, h: halfH * 2 };
}

interface ZoneLayerProps {
  areas: Area[];
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
}

export default memo(function ZoneLayer({ areas, selectedId, highlighted }: ZoneLayerProps) {
  const id = useId();
  const ordered = useMemo(() => [...areas.filter((area) => area.kind !== "context"), ...areas.filter((area) => area.kind === "context")], [areas]);

  return (
    <g className="pw-floor-zones" pointerEvents="none" aria-label="Plant zones">
      <defs>
        <pattern id={`${id}-hazard`} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0v12" className="pw-floor-hatch-hazard" />
        </pattern>
        <pattern id={`${id}-public`} width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 0v18" className="pw-floor-hatch-visitor" />
        </pattern>
        <pattern id={`${id}-washdown`} width={9} height={9} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={0.85} className="pw-floor-dot-washdown" />
        </pattern>
      </defs>
      {ordered.map((area) => {
        const { x, y, w, h } = area.bounds;
        const pattern = area.attrs.hazard ? "hazard"
          : area.attrs.publicAccess ? "public"
            : area.kind === "context" && area.attrs.washdown ? "washdown" : undefined;
        const selected = area.id === selectedId;
        const linked = highlighted.has(area.id);
        return (
          <g key={area.id} data-zone={area.id} data-kind={area.kind} data-status={area.status}
            data-selected={selected || undefined} data-highlighted={linked || undefined}>
            <rect x={x} y={y} width={w} height={h} rx={3} className="pw-floor-zone-boundary" />
            {pattern && <rect x={x} y={y} width={w} height={h} rx={3} fill={`url(#${id}-${pattern})`} />}
            {(selected || linked) && <rect x={x} y={y} width={w} height={h} rx={3} className="pw-floor-zone-outline" />}
            {area.id === "parking_lot" && <ParkingMarks bounds={area.bounds} />}
          </g>
        );
      })}
    </g>
  );
});

const smallEquipment = new Set(["instrument", "network_switch", "valve"]);

export const ZoneLabels = memo(function ZoneLabels({ areas, scale, selectedId, highlighted }: ZoneLayerProps & { scale: number }) {
  const fixtures = useTwinStore(useShallow((state) => state.twin.assets
    .filter(({ origin, physical }) => origin === "seed" && !smallEquipment.has(physical.kind))
    .map(({ physical }) => physical)));
  const entries = useTwinStore((state) => state.twin.entryPoints);
  // Walk-in entry symbols carry a screen-sized name below them; room labels must not land on either.
  const obstacles = useMemo(() => [
    ...fixtures.map(reservedSpace),
    ...entries.filter(({ kind }) => kind === "physical" || kind === "supply").map(({ x, y, name }): LabelBox => {
      const halfW = Math.max(16, name.length * 2.9 / scale);
      return { x: x - halfW, y: y - 16, w: halfW * 2, h: 32 + 14 / scale };
    }),
  ], [fixtures, entries, scale]);
  return (
    <g className="pw-floor-zone-labels" pointerEvents="none">
      {areas.map((area) => (
        <ZoneLabel key={area.id} area={area} obstacles={obstacles} scale={scale}
          selected={area.id === selectedId} highlighted={highlighted.has(area.id)} />
      ))}
    </g>
  );
});
