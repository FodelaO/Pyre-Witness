/** Draws the illustrative ammonia plume and caustic front from replay state. */
import { useId } from "react";
import { nodePosition } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import { causticPath } from "./floorGeometry";
import type { SimEffects } from "./types";

export function FloorTag({ text, x, y }: { text: string; x: number; y: number }) {
  const width = text.length * 7.6 + 16;

  return (
    <g className="pw-sim-map-tag" transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y={-11} width={width} height={22} rx={4} />
      <text textAnchor="middle" dominantBaseline="central">{text}</text>
    </g>
  );
}

export default function IncidentEffects({ twin, visual }: { twin: Twin; visual: NonNullable<SimEffects["visual"]> }) {
  const gradientId = useId();
  const clipId = useId();
  const intensity = Math.max(0, Math.min(1, visual.intensity));

  if (visual.kind === "caustic") {
    const d = causticPath(twin, visual.where);
    if (!d || !intensity) return null;

    return (
      <g aria-label="Simulated caustic in the product circuit">
        <path d={d} pathLength={1} className="pw-sim-caustic" strokeDasharray={`${intensity} 1`} />
        <path d={d} pathLength={1} className="pw-sim-caustic-drop" strokeDasharray="0.008 1" strokeDashoffset={-Math.min(0.992, intensity)} />
      </g>
    );
  }

  const hazard = twin.areas.find((area) => visual.where.includes(area.id) && area.attrs.hazard === "NH3");
  const origin = visual.where.map((id) => nodePosition(twin, id)).find((point) => !!point);
  if (!hazard || !origin || !intensity) return null;

  const { x, y, w, h } = hazard.bounds;
  const reading = `NH₃ ${Math.round(visual.estimatedPpm)} / 300 ppm`;

  return (
    <g aria-label="Simulated ammonia plume">
      <title>Exercise concentration in ppm compared with the 300 ppm IDLH reference</title>
      <defs>
        <clipPath id={clipId}><rect x={x} y={y} width={w} height={h} /></clipPath>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor="var(--pw-m-ammonia)" stopOpacity={0.48 + intensity * 0.2} />
          <stop offset="65%" stopColor="var(--pw-m-ammonia)" stopOpacity={0.21 + intensity * 0.15} />
          <stop offset="100%" stopColor="var(--pw-m-ammonia)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse
        cx={origin.x + (x + w / 2 - origin.x) * intensity}
        cy={origin.y + (y + h / 2 - origin.y) * intensity}
        rx={w * (0.18 + 0.51 * intensity)}
        ry={h * (0.13 + 0.51 * intensity)}
        fill={`url(#${gradientId})`}
        clipPath={`url(#${clipId})`}
      />
      <FloorTag text={reading} x={x + w / 2} y={y + h - 14} />
    </g>
  );
}
