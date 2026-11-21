/** Refrigeration screw compressor package with a finned motor and vertical oil separator. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const motorFins = [-35, -31, -27, -23, -19];
const compactMotorFins = [-35, -27, -19];
const refrigerantPiping = "M-36 -18H-11Q-7 -18 -7 -14V-3M12 1V-11H21M32 -12H41";

export default function ChillerCompressor(props: EquipmentProps) {
  const { compact, medium } = props;

  return (
    <SymbolFrame {...FOOTPRINT.chiller_compressor} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" fill={EQ.fill}>
        <path d="M-41 21H41V26H-41ZM-35 17V21H-22V17M-9 17V21H11V17M23 16V21H33V16" />
        <path d={refrigerantPiping} fill="none" strokeWidth={EQ.sw * 2.7} />
        <path d={refrigerantPiping} fill="none" stroke={mediumColor(medium, EQ.fill)} />
        <path d="M-36 -21V-15M41 -15V-9" />

        <path d="M-37 0H-19L-16 3V14L-19 17H-37L-40 14V3Z" fill={EQ.fill2} />
        <path d="M-40 4H-37V13H-40M-16 6H-10V12H-16M-32 0V-3H-23V0" />
        {(compact ? compactMotorFins : motorFins).map((x) => (
          <path key={x} d={`M${x} 2.7V14.3`} strokeWidth={EQ.sw * 0.72} />
        ))}

        <path d="M-11 -3H9L16 2V12L10 17H-11L-14 13V1Z" fill={EQ.fill2} />
        <rect x={-9} y={1} width={20} height={12} rx={3} fill={EQ.fill} strokeWidth={EQ.sw * 0.7} />
        <path d="M-7 5Q-5 1 -3 5T1 5T5 5T9 5M-7 9Q-5 13 -3 9T1 9T5 9T9 9" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} />

        <path d="M19 -15Q19 -21 27.5 -22Q36 -21 36 -15V11Q36 17 27.5 18Q19 17 19 11Z" fill={EQ.fill2} />
        <path d="M19 -15H36M19 11H36" strokeWidth={EQ.sw * 0.8} />
        <path d="M25 -22V-25H30V-22" />
        {!compact && <path d="M22 -11V7M-38 23.5H38" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.65} opacity={0.65} />}
      </g>
    </SymbolFrame>
  );
}
