/** Dished vessel envelopes with a steel wash and a clipped, prop-driven liquid surface. */
import { useId, type ReactNode } from "react";
import { EQ, mediumColor } from "../primitives";
import type { EquipmentProps } from "../types";
import "./process.css";

interface ShellProps {
  d: string;
  x: number;
  width: number;
  top: number;
  bottom: number;
  props: EquipmentProps;
  horizontal?: boolean;
  children?: ReactNode;
}

export function uprightShell(halfWidth: number, top: number, bottom: number, dish: number) {
  const shoulder = halfWidth * 0.55;
  const knuckle = dish * 0.55;
  return [
    `M ${-halfWidth} ${top + dish}`,
    `C ${-halfWidth} ${top + dish - knuckle} ${-shoulder} ${top} 0 ${top}`,
    `S ${halfWidth} ${top + dish - knuckle} ${halfWidth} ${top + dish}`,
    `V ${bottom - dish}`,
    `C ${halfWidth} ${bottom - dish + knuckle} ${shoulder} ${bottom} 0 ${bottom}`,
    `S ${-halfWidth} ${bottom - dish + knuckle} ${-halfWidth} ${bottom - dish} Z`,
  ].join(" ");
}

function boundedLevel(level?: number) {
  return level !== undefined && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : undefined;
}

export function VesselShell({ d, x, width, top, bottom, props, horizontal, children }: ShellProps) {
  const id = useId();
  const shellId = `${id}-steel`;
  const liquidId = `${id}-liquid`;
  const clipId = `${id}-vessel`;
  const level = boundedLevel(props.level);
  const height = bottom - top;
  const fill = mediumColor(props.medium);
  const surface = `M ${x} 0.7 h ${width}`;

  return (
    <>
      <defs>
        <linearGradient id={shellId} x2={horizontal ? "0%" : "100%"} y2={horizontal ? "100%" : "0%"}>
          <stop stopColor={EQ.fill} />
          <stop offset="32%" stopColor={EQ.fill2} />
          <stop offset="100%" stopColor={EQ.fill} />
        </linearGradient>
        {(level !== undefined || children) && (
          <clipPath id={clipId}><path d={d} /></clipPath>
        )}
        {level !== undefined && (
          <linearGradient id={liquidId} x2="0%" y2="100%">
            <stop stopColor={fill} stopOpacity=".32" />
            <stop offset="100%" stopColor={fill} stopOpacity=".15" />
          </linearGradient>
        )}
      </defs>
      <path d={d} fill={`url(#${shellId})`} />
      {level !== undefined && (
        <g clipPath={`url(#${clipId})`}>
          <g className="pw-vessel-liquid" style={{ transform: `translateY(${bottom - level * height}px)` }}>
            <rect x={x} width={width} height={height} fill={`url(#${liquidId})`} />
            <path d={surface} fill="none" stroke={fill} strokeWidth={EQ.sw} strokeOpacity=".85" />
            {props.running && (
              <path
                d={surface}
                className="pw-vessel-shimmer"
                fill="none"
                stroke={EQ.accent}
                strokeWidth={EQ.sw * 0.55}
                strokeLinecap="round"
                strokeDasharray="2 5 12 7"
              />
            )}
          </g>
        </g>
      )}
      {children && <g clipPath={`url(#${clipId})`}>{children}</g>}
      <path d={d} fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw} />
    </>
  );
}

export function VesselPercent({ props, x = 0, y }: { props: EquipmentProps; x?: number; y: number }) {
  const level = boundedLevel(props.level);
  if (props.compact || level === undefined) return null;

  return (
    <text
      x={x}
      y={y}
      fill={EQ.accent}
      stroke={EQ.fill}
      strokeWidth={EQ.sw}
      paintOrder="stroke"
      textAnchor="middle"
      fontFamily={EQ.mono}
      fontSize="7.5"
    >
      {Math.round(level * 100)}%
    </text>
  );
}
