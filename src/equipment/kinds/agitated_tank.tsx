/** Mixing vessel with visible drive, vertical shaft, and a pitched-blade impeller. */
"use client";

import { EQ, SymbolFrame } from "../primitives";
import { uprightShell, VesselPercent, VesselShell } from "../process/VesselShell";
import { FOOTPRINT, type EquipmentProps } from "../types";

const shell = uprightShell(25, -19, 27, 8);

export default function AgitatedTank(props: EquipmentProps) {
  return (
    <SymbolFrame {...FOOTPRINT.agitated_tank} props={props} round>
      <g fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-20 22h5l-1 12h-7z M15 22h5l3 12h-7z M-25 34h11m28 0h11" />
        <path d="M-26-8h-7v4h7 M-33-10v8 M25 13h7v4h-7 M32 11v8" />
      </g>
      <VesselShell d={shell} x={-25} width={50} top={-19} bottom={27} props={props} />
      <path d="M-25-11c13 3 37 3 50 0 M-25 19c13 3 37 3 50 0" fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.68} strokeOpacity=".75" />
      <g fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-7-24h14v5H-7z M-8-19H8" />
        <rect x="-8" y="-34" width="16" height="10" rx="2.4" />
        <path d="M8-31h5v4H8z" />
        {!props.compact && <path d="M-4-32v6m4-6v6m4-6v6" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.55} />}
        <path d="M0-19V15" fill="none" stroke={EQ.accent} />
        <g transform="translate(0 14)">
          <g className={props.running ? "pw-vessel-agitator" : undefined}>
            <path d="M-1 0l-12-5v4l12 2zm2 0l12 5V1L1-1z" stroke={EQ.accent} />
          </g>
          <circle r="2" />
        </g>
      </g>
      <VesselPercent props={props} x={12} y={2} />
    </SymbolFrame>
  );
}
