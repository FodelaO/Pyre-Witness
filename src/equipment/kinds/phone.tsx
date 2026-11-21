/** Smartphone outline with backlit screen, front camera dot and bottom gesture bar. */
"use client";

import { useId } from "react";
import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Phone(props: EquipmentProps) {
  const screenId = useId();
  const { compact, running, status } = props;
  const offline = status === "offline";
  const indicatorColor = statusColor(status) ?? (running ? "var(--pw-info)" : "var(--pw-ok)");

  return (
    <SymbolFrame {...FOOTPRINT.phone} props={props}>
      <defs>
        <linearGradient id={screenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--pw-info)" stopOpacity={offline ? 0.04 : 0.28} />
          <stop offset="100%" stopColor="var(--pw-info)" stopOpacity={offline ? 0.02 : 0.07} />
        </linearGradient>
      </defs>

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Side hardware keys */}
        {!compact && (
          <g strokeWidth={1}>
            <line x1={7.2} y1={-4.6} x2={7.2} y2={-1.4} />
            <line x1={-7.2} y1={-6} x2={-7.2} y2={-3.6} />
            <line x1={-7.2} y1={-2.2} x2={-7.2} y2={-0.3} />
          </g>
        )}

        {/* Phone chassis */}
        <rect x={-6.7} y={-13} width={13.4} height={26} rx={2.5} fill={EQ.fill2} />

        {/* Screen bezel and lit glass */}
        <rect x={-5.3} y={-10.9} width={10.6} height={21.5} rx={1.4} fill={EQ.fill} strokeWidth={0.7} />
        <rect
          x={-5.3}
          y={-10.9}
          width={10.6}
          height={21.5}
          rx={1.4}
          fill={`url(#${screenId})`}
          stroke={offline ? EQ.faint : EQ.accent}
          strokeWidth={0.6}
          opacity={offline ? 0.45 : 0.8}
        />

        {/* Front camera dot */}
        <circle cx={0} cy={-9} r={0.95} fill={EQ.fill} stroke={EQ.accent} strokeWidth={0.65} />
        <circle cx={0} cy={-9} r={0.35} fill={EQ.accent} stroke="none" />

        {!compact && (
          <>
            {/* Top earpiece slit */}
            <line x1={-1.8} y1={-11.9} x2={1.8} y2={-11.9} strokeWidth={0.7} opacity={0.7} />
            {/* Subtle interface bars when powered */}
            {!offline && (
              <g stroke={EQ.accent} strokeWidth={0.7} opacity={0.45}>
                <line x1={-3.3} y1={-4.2} x2={3.3} y2={-4.2} />
                <line x1={-3.3} y1={-1.8} x2={1.6} y2={-1.8} />
                <line x1={-3.3} y1={0.6} x2={2.5} y2={0.6} />
                <line x1={1.1} y1={-7.2} x2={4.3} y2={-4} strokeWidth={0.55} opacity={0.3} />
              </g>
            )}
            {/* Subtle status dot */}
            <circle cx={3.2} cy={-9} r={0.65} fill={indicatorColor} stroke="none" opacity={offline ? 0.35 : 0.9} />
          </>
        )}

        {/* Bottom home / gesture bar */}
        <line x1={-2.3} y1={8.9} x2={2.3} y2={8.9} stroke={EQ.accent} strokeWidth={0.85} opacity={offline ? 0.35 : 0.75} />
      </g>
    </SymbolFrame>
  );
}
