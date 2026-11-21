/** Renders a crew badge, status ring and optional asset leader in floor coordinates. */
import { memo, type CSSProperties } from "react";
import type { Twin } from "@/twin/types";
import Bubble from "./Bubble";
import type { AvatarState } from "./crewStore";
import type { CrewMember } from "./types";

export default memo(function Avatar({ member, avatar, canvas }: {
  member: CrewMember;
  avatar: AvatarState;
  canvas: Twin["plant"]["canvas"];
}) {
  const { point, status, walking, speech, inspect } = avatar;
  const labelWidth = member.name.length * 7 + 16;
  return (
    <g className="pw-crew-avatar" data-crew={member.id} data-state={walking ? "walking" : status} data-status={status}
      style={{ "--crew-color": `var(${member.colorVar})` } as CSSProperties}>
      {!!inspect && !walking && (
        <g className="pw-crew-leader" aria-hidden="true">
          <line x1={point.x} y1={point.y} x2={inspect.x} y2={inspect.y} />
          <circle cx={inspect.x} cy={inspect.y} r={3} />
        </g>
      )}
      <g transform={`translate(${point.x} ${point.y})`} className="pw-crew-avatar-position">
        <g className="pw-bob pw-crew-body">
          <circle className="pw-crew-ring" r={17} />
          <g className="pw-crew-hit" tabIndex={0} aria-label={`${member.name}, ${member.engine}, ${walking ? "walking" : status}`}>
            <circle className="pw-crew-badge" r={13} />
            <text className="pw-crew-initials" y={0.5} textAnchor="middle" dominantBaseline="central">{member.initials}</text>
            <g className="pw-crew-name" aria-hidden="true">
              <rect x={-labelWidth / 2} y={21} width={labelWidth} height={18} rx={4} />
              <text y={34} textAnchor="middle">{member.name}</text>
            </g>
          </g>
        </g>
      </g>
      {speech && <Bubble point={point} canvas={canvas} speech={speech} />}
    </g>
  );
});
