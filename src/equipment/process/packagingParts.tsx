/** Top-view bottles and star wheels shared by packaging equipment. */
import { EQ } from "../primitives";

export function BottleTop({ x = 0, y = 0, radius, color }: {
  x?: number;
  y?: number;
  radius: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={radius} fill={EQ.fill} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.62} />
      <circle r={radius * 0.78} fill={color} opacity={0.55} stroke="none" />
      <circle r={radius * 0.34} fill={EQ.accent} stroke="none" />
    </g>
  );
}

function wheelPoint(radius: number, degrees: number) {
  const angle = degrees * Math.PI / 180;
  return `${(radius * Math.sin(angle)).toFixed(3)} ${(-radius * Math.cos(angle)).toFixed(3)}`;
}

const starOutline = `M ${wheelPoint(12, 0)} ${Array.from({ length: 8 }, (_, index) => {
  const angle = index * 45;
  return `A 12 12 0 0 1 ${wheelPoint(12, angle + 16)} Q ${wheelPoint(6, angle + 30.5)} ${wheelPoint(12, angle + 45)}`;
}).join(" ")} Z`;

export function TransferStar({ x, y, running, compact, color }: {
  x: number;
  y: number;
  running?: boolean;
  compact?: boolean;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={running ? "pw-spin" : undefined} style={{ animationDirection: "reverse", animationDuration: "3s" }}>
        <circle r={13.5} fill={EQ.fill} stroke={EQ.faint} strokeWidth={EQ.sw * 0.7} />
        <path d={starOutline} fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.75} />
        <circle r={4.3} fill={EQ.fill} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.7} />
        <circle r={1.7} fill={EQ.accent} stroke="none" />
        {!compact && <BottleTop x={6} y={-10} radius={2.2} color={color} />}
      </g>
    </g>
  );
}
