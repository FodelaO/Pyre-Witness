"use client";

/**
 * BOOTSTRAP STUB of the plant floor (replaced by the floor-view task).
 * Draws zones and assets from the twin so the shell is alive while features are built.
 */
import { Equipment } from "@/equipment";
import { useTwinStore } from "@/twin/store";

export default function PlantFloor() {
  const twin = useTwinStore((s) => s.twin);
  const selectedId = useTwinStore((s) => s.selectedId);
  const select = useTwinStore((s) => s.select);
  const { w, h } = twin.plant.canvas;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" style={{ background: "var(--pw-floor)" }}>
      <rect
        {...{ x: twin.plant.building.x, y: twin.plant.building.y }}
        width={twin.plant.building.w}
        height={twin.plant.building.h}
        fill="none"
        stroke="var(--pw-line-strong)"
        strokeWidth={2}
      />
      {twin.areas.map((area) => (
        <g key={area.id}>
          <rect
            x={area.bounds.x}
            y={area.bounds.y}
            width={area.bounds.w}
            height={area.bounds.h}
            rx={6}
            fill="rgba(255,255,255,0.012)"
            stroke="var(--pw-line-strong)"
            strokeDasharray="6 5"
          />
          <text x={area.bounds.x + 10} y={area.bounds.y + 18} fontSize={11} fill="var(--pw-text-dim)">
            {area.name}
          </text>
        </g>
      ))}
      {twin.assets.map((asset) => (
        <g
          key={asset.id}
          transform={`translate(${asset.physical.x} ${asset.physical.y}) rotate(${asset.physical.rotation})`}
          onClick={() => select(asset.id)}
          style={{ cursor: "pointer" }}
        >
          <Equipment kind={asset.physical.kind} label={asset.id} selected={asset.id === selectedId} />
        </g>
      ))}
    </svg>
  );
}
