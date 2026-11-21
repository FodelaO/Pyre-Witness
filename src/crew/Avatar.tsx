/** Renders a crew portrait, role marker, and instrument-style status ring on the floor. */
import { memo, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Check, FileText, ScanLine, ShieldCheck, Waypoints, X } from "lucide-react";
import type { AvatarState } from "./crewStore";
import type { CrewMember } from "./types";

const roles = { scout: ScanLine, architect: Waypoints, inspector: ShieldCheck, chief: FileText };

export default memo(function Avatar({ member, avatar, idPrefix, preview, scale, desk, away }: {
  member: CrewMember;
  avatar?: AvatarState;
  idPrefix: string;
  preview?: ReactNode;
  scale: number;
  desk?: boolean;
  away?: boolean;
}) {
  const walk = avatar?.walk;
  const position = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const clip = `${idPrefix}-portrait-${member.id}`;
  const size = member.name.length * 6.5 + 10;
  const Role = roles[member.id];
  useLayoutEffect(() => {
    if (!walk || !position.current?.animate) return;
    const start = walk.waypoints[0].at;
    const duration = walk.end.at - start;
    const settings = { duration, fill: "both", easing: "linear" } as const;
    const motion = position.current.animate(walk.waypoints.map(({ at, point: stop }) => ({
      transform: `translate(${stop.x}px, ${stop.y}px)`, offset: (at - start) / duration,
    })), settings);
    const facing = body.current?.animate(walk.waypoints.map(({ at, point: stop }, index, waypoints) => {
      const after = waypoints[index + 1]?.point ?? stop;
      const before = index === waypoints.length - 1 ? waypoints[index - 1].point : stop;
      const lean = after.x === before.x ? 0 : Math.sign(after.x - before.x) * 8;
      return { transform: `rotate(${lean}deg)`, offset: (at - start) / duration };
    }), settings);
    const elapsed = Math.max(0, performance.now() - start);
    motion.currentTime = elapsed;
    if (facing) facing.currentTime = elapsed;
    return () => { motion.cancel(); facing?.cancel(); };
  }, [walk]);
  if (!avatar) return null;
  const { point, status, walking, inspect } = avatar;
  const state = walking ? "walking" : status;

  return (
    <g className={away ? "pw-crew-away-portrait" : "pw-crew-avatar"} data-crew={member.id} data-state={state} data-status={status} data-desk={desk || undefined}
      style={{ "--crew-color": `var(${member.colorVar})` } as CSSProperties}>
      <defs><clipPath id={clip}><circle r={22} /></clipPath></defs>
      {!!inspect && !walking && (
        <g className="pw-crew-leader" aria-hidden="true">
          <line x1={point.x} y1={point.y} x2={inspect.x} y2={inspect.y} />
          <circle cx={inspect.x} cy={inspect.y} r={3} />
        </g>
      )}
      <g ref={position} style={{ transform: `translate(${point.x}px, ${point.y}px)` }} className="pw-crew-avatar-position">
        <g className="pw-crew-size" transform={`scale(${scale})`}>
          {preview}
          {!away && <ellipse className="pw-crew-shadow" cy={20} rx={33} ry={12} />}
          {walking && <g className="pw-crew-footsteps" aria-hidden="true">
            <ellipse cx={-12} cy={22} rx={4} ry={7} transform="rotate(18 -12 22)" />
            <ellipse cx={11} cy={24} rx={4} ry={7} transform="rotate(-18 11 24)" />
          </g>}
          <g ref={body} className="pw-crew-body">
            <circle className="pw-crew-halo" r={30} />
            <circle className="pw-crew-ring" r={28} pathLength={100} />
            <g className={away ? undefined : "pw-crew-hit"} role="img" tabIndex={away ? undefined : 0}
              aria-label={`${member.name}, ${member.engine}, ${away ? "away" : desk && state === "idle" ? "at desk" : state}`}>
              <circle className="pw-crew-badge" r={23.5} />
              <text className="pw-crew-initials" y={4} textAnchor="middle" aria-hidden="true">{member.initials}</text>
              <image href={`/crew/${member.id}.png`} x={-27} y={-27} width={54} height={54} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
              <g className="pw-crew-role" transform="translate(19 -19)" aria-hidden="true">
                <circle r={10} />
                <Role x={-6} y={-6} size={12} strokeWidth={2.5} />
              </g>
              {(state === "done" || state === "error") && <g className="pw-crew-result" transform="translate(20 17)" aria-hidden="true">
                <circle r={9} />
                {state === "done" ? <Check x={-5} y={-5} size={10} strokeWidth={3} /> : <X x={-5} y={-5} size={10} strokeWidth={3} />}
              </g>}
            </g>
          </g>
          <g className="pw-crew-name" aria-hidden="true">
            <rect x={-size / 2} y={31} width={size} height={20} rx={4} />
            <text y={45} textAnchor="middle">{member.name}</text>
          </g>
        </g>
      </g>
    </g>
  );
});
