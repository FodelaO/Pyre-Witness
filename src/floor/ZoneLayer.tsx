/** Room boundaries, operating notes and quiet context markings. */
import { memo, useId, useMemo } from "react";
import { Droplet, LockKeyhole, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FOOTPRINT } from "@/equipment/types";
import { useTwinStore } from "@/twin/store";
import type { Area, PhysicalPresence } from "@/twin/types";
import { chooseLabelBox, type LabelBox } from "./labelPlacement";

const statusLabels = { normal: "Normal", attention: "Attention", alarm: "Alarm" } as const;

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
  return { x: physical.x - halfW, y: physical.y - halfH, w: halfW * 2, h: halfH * 2 + 13 * scale };
}

function ZoneLabel({ area, obstacles }: { area: Area; obstacles: LabelBox[] }) {
  const { bounds, attrs } = area;
  const isOverlay = area.id === "washdown" || area.id === "nh3_hazard";
  const ammonia = attrs.hazard === "NH3";
  const Mark = area.id === "washdown" ? Droplet : attrs.hazard ? TriangleAlert : attrs.restricted ? LockKeyhole : null;
  const note = area.statusNote ?? statusLabels[area.status];
  const markerWidth = ammonia ? 34 : Mark ? 19 : 0;
  const nameWidth = Math.max(1, Math.min(bounds.w - 26 - markerWidth, area.name.length * 8.1));
  const chipWidth = Math.max(1, Math.min(bounds.w - 26, note.length * 6.4 + 22));
  const labelWidth = nameWidth + markerWidth;
  const left = bounds.x + 13;
  const right = bounds.x + bounds.w - 13;
  const top = bounds.y + 11;
  const bottom = bounds.y + bounds.h - 24;
  const startX = isOverlay ? right - labelWidth : left;
  const otherX = isOverlay ? left : right - labelWidth;
  const nameAt = (x: number, y: number): LabelBox => ({ x, y, w: labelWidth, h: 14 });
  const name = chooseLabelBox(nameAt(startX, top), [nameAt(otherX, top), nameAt(startX, bottom), nameAt(otherX, bottom)], obstacles);

  const chipAt = (x: number, y: number): LabelBox => ({ x, y, w: chipWidth, h: 16 });
  const adjacentX = isOverlay ? name.x - chipWidth - 10 : name.x + name.w + 10;
  const beside = adjacentX >= left && adjacentX + chipWidth <= right ? [chipAt(adjacentX, name.y - 1)] : [];
  const below = name.y + 33 <= bottom ? [chipAt(name.x, name.y + 17)] : [];
  const above = name.y - 18 >= top ? [chipAt(name.x, name.y - 18)] : [];
  const chipOptions = [...beside, ...below, ...above, chipAt(right - chipWidth, top), chipAt(left, bottom), chipAt(right - chipWidth, bottom)];
  const chip = chooseLabelBox(chipOptions[0], chipOptions.slice(1), [name, ...obstacles]);

  return (
    <g className="pw-floor-zone-label">
      <g transform={`translate(${name.x} ${name.y})`}>
        {ammonia ? (
          <g className="pw-floor-ammonia-mark" aria-hidden="true">
            <rect width={28} height={13} rx={2} />
            <text x={14} y={9.6} textAnchor="middle">NH₃</text>
          </g>
        ) : Mark && <Mark x={0} y={0} width={13} height={13} strokeWidth={1.6} className="pw-floor-zone-mark" />}
        <text
          x={markerWidth}
          y={11}
          textLength={area.name.length * 7.6 > nameWidth ? nameWidth : undefined}
          lengthAdjust="spacingAndGlyphs"
          className="pw-floor-zone-name"
        >
          {area.name}
        </text>
      </g>
      <g transform={`translate(${chip.x} ${chip.y})`} className="pw-floor-zone-chip" data-status={area.status}>
        <rect width={chipWidth} height={16} rx={3} />
        <circle cx={7} cy={8} r={1.7} />
        <text
          x={14}
          y={11.4}
          textLength={note.length * 6.4 + 22 > chipWidth ? Math.max(1, chipWidth - 18) : undefined}
          lengthAdjust="spacingAndGlyphs"
        >
          {note}
        </text>
      </g>
    </g>
  );
}

export default memo(function ZoneLayer({ areas }: { areas: Area[] }) {
  const id = useId();
  const fixtures = useTwinStore(useShallow((state) => state.twin.assets.filter((asset) => asset.origin === "seed").map((asset) => asset.physical)));
  const obstacles = useMemo(() => fixtures.map(reservedSpace), [fixtures]);
  const ordered = [...areas.filter((area) => area.kind !== "context"), ...areas.filter((area) => area.kind === "context")];
  const patterns: Partial<Record<Area["id"], string>> = {
    washdown: `${id}-washdown`,
    nh3_hazard: `${id}-hazard`,
    visitor_corridor: `${id}-visitor`,
  };

  return (
    <g className="pw-floor-zones" pointerEvents="none" aria-label="Plant zones">
      <defs>
        <pattern id={patterns.nh3_hazard} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0v12" className="pw-floor-hatch-hazard" />
        </pattern>
        <pattern id={patterns.visitor_corridor} width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 0v18" className="pw-floor-hatch-visitor" />
        </pattern>
        <pattern id={patterns.washdown} width={9} height={9} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={0.85} className="pw-floor-dot-washdown" />
        </pattern>
      </defs>
      {ordered.map((area) => {
        const { x, y, w, h } = area.bounds;
        const pattern = patterns[area.id];
        return (
          <g key={area.id} data-zone={area.id} data-kind={area.kind} data-status={area.status}>
            <rect x={x} y={y} width={w} height={h} rx={3} className="pw-floor-zone-boundary" />
            {pattern && <rect x={x} y={y} width={w} height={h} rx={3} fill={`url(#${pattern})`} />}
            {area.id === "parking_lot" && <ParkingMarks bounds={area.bounds} />}
          </g>
        );
      })}
      {ordered.map((area) => <ZoneLabel key={area.id} area={area} obstacles={obstacles} />)}
    </g>
  );
});
