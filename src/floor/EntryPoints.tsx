/** Quiet symbols for the twin's existing exposure origins. */
import { memo } from "react";
import { Antenna, Badge, Cloud, PersonStanding, Truck, Wrench } from "lucide-react";
import type { EntryPoint } from "@/twin/types";

const icons = { internet: Cloud, rf: Antenna, physical: PersonStanding, remote: Wrench, supply: Truck };

export default memo(function EntryPoints({ points }: { points: EntryPoint[] }) {
  return (
    <g className="pw-floor-entries" pointerEvents="none" aria-label="Exposure entry points">
      {points.map((point) => {
        const Icon = point.id === "insider" ? Badge : icons[point.kind];
        return (
          <g key={point.id} transform={`translate(${point.x} ${point.y})`} className="pw-floor-entry">
            <circle r={14} />
            <Icon x={-9} y={-9} width={18} height={18} strokeWidth={1.6} aria-hidden="true" />
            <text y={29} textAnchor="middle">{point.name}</text>
          </g>
        );
      })}
    </g>
  );
});
