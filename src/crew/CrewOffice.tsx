/** Draws four quiet workstations in the crew office. */
import { memo } from "react";
import type { Area, Twin } from "@/twin/types";
import { deskPosition } from "./officeLayout";
import { CREW, CREW_ORDER } from "./types";

export default memo(function CrewOffice({ building, room }: { building: Twin["plant"]["building"]; room?: Area }) {
  if (!room) return null;
  const width = Math.min(113, (room.bounds.w - 24) / 2 - 5);
  return (
    <g className="pw-crew-office" aria-label="AI crew office">
      {CREW_ORDER.map((id) => {
        const { x, y } = deskPosition(id, building, room);
        const { name, engine } = CREW[id];
        return (
          <g key={id} transform={`translate(${x} ${y})`} aria-label={`${name}, ${engine}`}>
            <rect className="pw-crew-desk" x={-16} y={-17} width={width} height={34} rx={4} />
            <circle className="pw-crew-chair" r={15} />
            <g transform={`translate(${width - 34} -11)`} className="pw-crew-monitor" aria-hidden="true">
              <rect width={13} height={8} rx={1} />
              <path d="M3 4h3m2 0h2M6.5 8v2m-3 0h6" />
            </g>
            <text className="pw-crew-desk-name" x={21} y={-3}>{name}</text>
            <text className="pw-crew-desk-engine" x={21} y={10}>{engine}</text>
          </g>
        );
      })}
    </g>
  );
});
