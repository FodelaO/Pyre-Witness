/** Reverse-osmosis skid with three membrane housings, a high-pressure pump, and controls. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const housingRows = [-18, -7, 4];

export default function ReverseOsmosisSkid(props: EquipmentProps) {
  const { compact, medium } = props;

  return (
    <SymbolFrame {...FOOTPRINT.ro_skid} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" fill="none">
        <path d="M-44 23V-25H44V23M-44 23H44M-47 26H-37M37 26H47M-44 23V26M44 23V26" />
        <path d="M-34 -18H-39V9H-24V12M-39 -7H-34M-39 4H-34M30 -18H38V4H30M30 -7H38" />
        <path d="M-47 17H-29M38 -7H47" stroke={mediumColor(medium)} strokeWidth={EQ.sw * 1.2} />
        {housingRows.map((y) => (
          <g key={y} transform={`translate(0 ${y})`}>
            <rect x={-34} y={-4} width={64} height={8} rx={4} fill={EQ.fill2} />
            <path d="M-30 -4V4M26 -4V4" />
            {!compact && <path d="M-26 -1.9H22" stroke={EQ.accent} strokeWidth={EQ.sw * 0.65} opacity={0.65} />}
          </g>
        ))}

        <rect x={-21} y={12.5} width={14} height={9} rx={1.4} fill={EQ.fill2} />
        <path d="M-16 14.6V19.5M-13 14.6V19.5M-10 14.6V19.5" strokeWidth={EQ.sw * 0.7} />
        <circle cx={-24} cy={17} r={5.6} fill={EQ.fill} />
        <path d="M-24 14L-21.5 18.5H-26.5Z" fill={EQ.accent} stroke="none" />

        <rect x={16} y={10} width={17} height={12} rx={1.4} fill={EQ.fill2} />
        <rect x={19} y={12.5} width={8} height={4} rx={0.6} fill={EQ.fill} strokeWidth={EQ.sw * 0.65} />
        {!compact && <path d="M20 19H24M28 19H30" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} />}
      </g>
    </SymbolFrame>
  );
}
