/** Horizontal pressure vessel with ellipsoidal heads, saddles, and a relief valve. */
"use client";

import { EQ, SymbolFrame } from "../primitives";
import { VesselShell } from "../process/VesselShell";
import { FOOTPRINT, type EquipmentProps } from "../types";

const shell = "M-39-14 H39 C49-14 55-7 55 1 S49 16 39 16 H-39 C-49 16-55 9-55 1 S-49-14-39-14 Z";

export default function BulletTank(props: EquipmentProps) {
  return (
    <SymbolFrame {...FOOTPRINT.bullet_tank} props={props}>
      <g fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-35 13h13l3 9h-19z M22 13h13l3 9H19z" />
        <path d="M-42 22h26m32 0h26 M-55-1h-4v4h4 M55-1h4v4h-4" fill="none" />
        <path d="M17-14v-4h4v-4h10v3h-6v5z M19-18h8 M24-23h4" />
      </g>
      <VesselShell d={shell} x={-55} width={110} top={-14} bottom={16} props={props} horizontal />
      <path d="M-39-14c-4 9-4 21 0 30m78-30c4 9 4 21 0 30" fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.8} />
      {!props.compact && (
        <g fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.65}>
          <path d="M-45-9Q-49-6-50 0 M45-9Q49-6 50 0 M-34-10H12" stroke={EQ.accent} strokeOpacity=".55" />
          <ellipse cx="25" cy="-4" rx="6" ry="4" fill={EQ.fill2} />
          <path d="M23-4h4 M-34 12v4m12-4v4m44-4v4m12-4v4" />
        </g>
      )}
    </SymbolFrame>
  );
}
