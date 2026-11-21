/** Draws instrument bays and leaves a ghost portrait at every vacated desk. */
import { memo } from "react";
import type { Area, Twin } from "@/twin/types";
import Avatar from "./Avatar";
import { deskPosition } from "./officeLayout";
import { CREW, CREW_ORDER, type CrewId } from "./types";

export default memo(function CrewOffice({ building, room, away, scale, idPrefix }: {
  building: Twin["plant"]["building"];
  room?: Area;
  away: ReadonlySet<CrewId>;
  scale: number;
  idPrefix: string;
}) {
  if (!room) return null;
  return (
    <g className="pw-crew-office" aria-label="Crew office">
      {CREW_ORDER.map((id) => {
        const point = deskPosition(id, building, room);
        return (
          <g key={id} data-away-seat={away.has(id) ? id : undefined}>
            <path transform={`translate(${point.x} ${point.y})`} className="pw-crew-desk"
              d="M-28-13v-16h13m30 0h13v16m0 27v12H15m-30 0h-13V14" />
            {away.has(id) && <Avatar member={CREW[id]} avatar={{ point, status: "idle", speech: null, walking: false }}
              idPrefix={`${idPrefix}-away`} scale={scale} desk away />}
          </g>
        );
      })}
    </g>
  );
});
