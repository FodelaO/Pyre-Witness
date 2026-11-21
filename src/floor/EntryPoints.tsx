/** Quiet symbols for the twin's existing exposure origins. */
import { memo } from "react";
import { Antenna, Badge, Cloud, PersonStanding, Truck, Wrench } from "lucide-react";
import type { EntryPoint } from "@/twin/types";

const icons = { internet: Cloud, rf: Antenna, physical: PersonStanding, remote: Wrench, supply: Truck };

interface EntryPointProps {
  points: EntryPoint[];
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  /** Right edge of the drawing: names next to it are right-aligned so they stay inside the sheet. */
  rightEdge?: number;
}

export default memo(function EntryPoints({ points, selectedId, highlighted, rightEdge = Infinity }: EntryPointProps) {
  return (
    <g className="pw-floor-entries" aria-label="Exposure entry points">
      {points.map((point) => {
        const Icon = point.id === "insider" ? Badge : icons[point.kind];
        const atEdge = rightEdge - point.x < 110;
        return (
          <g key={point.id} transform={`translate(${point.x} ${point.y})`} className="pw-floor-entry"
            data-floor-target={point.id} data-highlighted={highlighted.has(point.id) || undefined}
            role="button" tabIndex={0} aria-pressed={point.id === selectedId} aria-label={point.name}>
            <title>{point.name}</title>
            <circle r={14} />
            <Icon x={-9} y={-9} width={18} height={18} strokeWidth={1.6} aria-hidden="true" />
            <g transform="translate(0 14)" pointerEvents="none">
              <text className="pw-floor-screen-label" x={atEdge ? 14 : 0} y={11} textAnchor={atEdge ? "end" : "middle"}>{point.name}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
});
