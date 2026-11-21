/** Marks the location selected for the next device capture. */
import { memo } from "react";
import { useDropStore } from "@/twin/dropPoint";

export default memo(function DropPin() {
  const point = useDropStore((state) => state.point);
  if (!point) return null;

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
      className="pw-floor-drop-pin"
      pointerEvents="none"
      role="img"
      aria-label="Pinned device location"
    >
      <ellipse cy={1} rx={7} ry={3} className="pw-floor-pin-base" />
      <path d="M0 0C-2 -4 -10 -10 -10 -17a10 10 0 0 1 20 0C10 -10 2 -4 0 0Z" />
      <circle cy={-17} r={3.2} />
    </g>
  );
});
