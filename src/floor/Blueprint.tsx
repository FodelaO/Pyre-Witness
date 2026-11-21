/** The drawing grid, double building perimeter and dimension scale. */
import { memo, useId } from "react";
import { UNITS_PER_METRE } from "@/twin/geometry";
import type { Twin } from "@/twin/types";

export default memo(function Blueprint({ plant }: { plant: Twin["plant"] }) {
  const id = useId();
  const minor = 2 * UNITS_PER_METRE;
  const major = 10 * UNITS_PER_METRE;
  const { x, y, w, h } = plant.building;
  const wallInset = 5;
  const scaleX = x + 3;
  const scaleY = Math.max(20, y - 22);

  return (
    <g className="pw-floor-blueprint" pointerEvents="none" aria-hidden="true">
      <defs>
        <pattern id={`${id}-minor`} width={minor} height={minor} patternUnits="userSpaceOnUse">
          <path d={`M${minor} 0H0V${minor}`} className="pw-floor-grid-minor" />
        </pattern>
        <pattern id={`${id}-major`} width={major} height={major} patternUnits="userSpaceOnUse">
          <rect width={major} height={major} fill={`url(#${id}-minor)`} />
          <path d={`M${major} 0H0V${major}`} className="pw-floor-grid-major" />
        </pattern>
      </defs>
      <rect x={-plant.canvas.w} y={-plant.canvas.h} width={3 * plant.canvas.w} height={3 * plant.canvas.h} fill={`url(#${id}-major)`} />
      <rect x={x} y={y} width={w} height={h} className="pw-floor-wall" />
      <rect
        x={x + wallInset}
        y={y + wallInset}
        width={Math.max(0, w - 2 * wallInset)}
        height={Math.max(0, h - 2 * wallInset)}
        className="pw-floor-wall-inner"
      />
      <g transform={`translate(${scaleX} ${scaleY})`} className="pw-floor-scale">
        <path d={`M0 -4V4M0 0H${major}M${major / 2} -3V3M${major} -4V4`} />
        <g transform={`translate(${major + 10} 0)`}>
          <text className="pw-floor-screen-label" y={3}>10 m</text>
        </g>
      </g>
    </g>
  );
});
