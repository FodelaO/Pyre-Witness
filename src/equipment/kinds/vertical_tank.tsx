/** Sanitary storage tank in elevation, with dished heads and a cutaway level indication. */
"use client";

import { EQ, SymbolFrame } from "../primitives";
import { uprightShell, VesselPercent, VesselShell } from "../process/VesselShell";
import { FOOTPRINT, type EquipmentProps } from "../types";

const shell = uprightShell(22, -26, 23, 8);

export default function VerticalTank(props: EquipmentProps) {
  return (
    <SymbolFrame {...FOOTPRINT.vertical_tank} props={props} round>
      <g fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-17 17h4l-2 13h-5z M13 17h4l3 13h-5z" />
        <path d="M-21 30h9m24 0h9" fill="none" />
        <path d="M-4-26v-4h8v4z M-6-30H6 M-22-11h-8v4h8 M-30-13v8" />
        <path d="M2 21v5h8v-4h-4v-1z M10 20v8" />
      </g>
      <VesselShell d={shell} x={-22} width={44} top={-26} bottom={23} props={props} />
      <g fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.68}>
        <path d="M-22-18c11 3 33 3 44 0 M-22 15c11 3 33 3 44 0" strokeOpacity=".72" />
        <path d="M-18-13v25" stroke={EQ.accent} strokeOpacity=".42" />
      </g>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw * 0.75}>
        <ellipse cx="8" cy="-8" rx="5.8" ry="4.5" fill={EQ.fill2} />
        <path d="M6-8h4" stroke={EQ.accent} />
        {!props.compact && (
          <path d="M22-12h5v24h-5 m5-18h3 m-3 6h3 m-3 6h3" fill="none" strokeOpacity=".8" />
        )}
      </g>
      <VesselPercent props={props} y={10} />
    </SymbolFrame>
  );
}
