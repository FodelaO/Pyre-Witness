/** Flanged UV treatment chamber with a visible lamp sleeve and running glow. */
"use client";

import { useId } from "react";
import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function UvReactor(props: EquipmentProps) {
  const glowId = useId();
  const { compact, medium, running } = props;

  return (
    <SymbolFrame {...FOOTPRINT.uv_reactor} props={props}>
      {running && (
        <defs>
          <linearGradient id={glowId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--pw-info)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--pw-info)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--pw-info)" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" fill={EQ.fill2}>
        <path d="M-34 -2.5H-27V2.5H-34M34 -2.5H27V2.5H34" />
        <path d="M-34 0H-28M28 0H34" stroke={mediumColor(medium)} strokeWidth={EQ.sw * 0.8} />
        <rect x={-26} y={-7.5} width={52} height={15} rx={5} />
        <rect x={-28} y={-10} width={4} height={20} rx={1} fill={EQ.fill} />
        <rect x={24} y={-10} width={4} height={20} rx={1} fill={EQ.fill} />
        <path d="M-6 -7.5V-12H6V-7.5" fill={EQ.fill} />
        <path d="M-19 7.5V11H-13V7.5M13 7.5V11H19V7.5" fill={EQ.fill} />
        <rect x={-19.5} y={-3.75} width={39} height={7.5} rx={3.75} fill={EQ.fill} strokeWidth={EQ.sw * 0.65} />
        {running && <rect x={-19} y={-6} width={38} height={12} rx={5} fill={`url(#${glowId})`} stroke="none" />}
        <path d="M-16.5 0H16.5" stroke={running ? EQ.accent : EQ.stroke} strokeLinecap="round" opacity={running ? 1 : 0.55} />
        {!compact && (
          <path d="M-19 -5.2H-9M9 -5.2H19M-4 -9.75H4M-18 0H-16.5M16.5 0H18" stroke={EQ.accent} strokeWidth={EQ.sw * 0.65} opacity={0.65} />
        )}
      </g>
    </SymbolFrame>
  );
}
