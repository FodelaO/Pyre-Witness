/** Physical rooms, hazard overlays, process pipes and access markers for the review floor. */
"use client";

import { memo, useId, useMemo } from "react";
import { Badge, PersonStanding, Truck } from "lucide-react";
import { MEDIA, type Twin } from "@/twin/types";

export default memo(function LensReviewBackdrop({ twin }: { twin: Twin }) {
  const gridId = useId();
  const hatchId = useId();
  const { canvas, building } = twin.plant;
  const pipes = useMemo(() => {
    const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
    return twin.assets.flatMap((asset) => asset.physical.connections.flatMap((connection, index) => {
      const target = assets.get(connection.to);
      if (!target || !MEDIA[connection.medium].process) return [];
      const { x, y } = asset.physical;
      const { x: tx, y: ty } = target.physical;
      const points = [[x, y], ...(connection.via ?? [[tx, y]]), [tx, ty]];
      return [{
        id: `${asset.id}:${index}`,
        points: points.map((point) => point.join(",")).join(" "),
        color: `var(${MEDIA[connection.medium].cssVar})`,
        label: connection.label ?? MEDIA[connection.medium].label,
        active: connection.active !== false && asset.process?.running === true && asset.status !== "offline",
        isolated: connection.active === false,
      }];
    }));
  }, [twin.assets]);

  return (
    <g className="pwl-review-backdrop" pointerEvents="none">
      <defs>
        <pattern id={gridId} width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M25 0H0V25" fill="none" stroke="var(--pw-grid)" strokeWidth="1" />
        </pattern>
        <pattern id={hatchId} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V12" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width={canvas.w} height={canvas.h} fill={`url(#${gridId})`} />
      <rect className="pwl-review-building" x={building.x} y={building.y} width={building.w} height={building.h} rx={4} />
      {twin.areas.map((area) => {
        const { x, y, w, h } = area.bounds;
        const hazard = area.id === "nh3_hazard";
        const washdown = area.id === "washdown";
        const controlRoom = area.id === "control_room";
        if (hazard || washdown) {
          return (
            <g key={area.id} className={`pwl-review-boundary lens-material-only ${hazard ? "pwl-review-hazard" : "pwl-review-washdown"}`}>
              {!hazard && <rect x={x} y={y} width={w} height={h} rx={4} />}
              {hazard && <rect x={x} y={y} width={w} height={h} rx={4} fill={`url(#${hatchId})`} />}
              <text x={x + w - 9} y={y + h - 10} textAnchor="end">{hazard ? "NH₃ HAZARD" : "WASHDOWN"}</text>
            </g>
          );
        }
        return (
          <g key={area.id} className={`pwl-review-room${area.kind === "context" ? " pwl-review-room-context" : ""}`}>
            <rect x={x} y={y} width={w} height={h} rx={3} />
            <text className="pwl-review-room-name" x={x + 14} y={controlRoom ? y - 7 : y + 21}>{area.name}</text>
            {area.statusNote && <text className="pwl-review-room-note lens-material-only" x={x + 14} y={controlRoom ? y + 20 : y + 38}>{area.statusNote}</text>}
          </g>
        );
      })}
      <g className="pwl-review-pipes lens-material-only" aria-label="Material flow">
        {pipes.map((pipe) => (
          <g key={pipe.id} stroke={pipe.color} data-isolated={pipe.isolated || undefined}>
            <title>{pipe.label}</title>
            <polyline className="pwl-review-pipe-wall" points={pipe.points} />
            <polyline className="pwl-review-pipe-body" points={pipe.points} />
            {pipe.active && <polyline className="pwl-review-pipe-flow pw-flow" points={pipe.points} />}
          </g>
        ))}
      </g>
      <g className="pwl-review-physical-entries lens-material-only" aria-label="Physical entry points">
        {twin.entryPoints.filter((entry) => entry.kind === "physical" || entry.kind === "supply").map((entry) => {
          const Icon = entry.kind === "supply" ? Truck : entry.id === "insider" ? Badge : PersonStanding;
          return (
            <g key={entry.id} transform={`translate(${entry.x} ${entry.y})`}>
              <title>{entry.name}</title>
              <circle r={13} />
              <Icon x={-8} y={-8} width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
              <text x={17} y={4}>{entry.name}</text>
            </g>
          );
        })}
      </g>
      <g className="pwl-review-scale" transform="translate(63 949)">
        <path d="M0 -4V4M0 0H100M100 -4V4" /><text x={50} y={-8} textAnchor="middle">10 m</text>
      </g>
    </g>
  );
});
