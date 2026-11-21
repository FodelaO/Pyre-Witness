/** Carbonation skid combining a gas contact vessel and a gasketed plate cooler. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { uprightShell, VesselShell } from "../process/VesselShell";
import { FOOTPRINT, type EquipmentProps } from "../types";

const vessel = uprightShell(14, -21, 19, 6);
const bubbles = [
  { x: -6, y: 8, r: 1.1, phase: "-0.15s" },
  { x: 4, y: 8, r: 1.5, phase: "-0.9s" },
  { x: 0, y: 3, r: 1.1, phase: "-1.7s" },
  { x: 7, y: 11, r: 0.9, phase: "-1.45s" },
];

export default function CarboCooler(props: EquipmentProps) {
  return (
    <SymbolFrame {...FOOTPRINT.carbo_cooler} props={props}>
      <g fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        <path d="M-22-21v-5h43v15 M-36-9h-7m7 18h-7 M31-6h12m-12 17h12" />
        <path d="M-36 24h72m-31-42v42m34-42v42" strokeOpacity=".75" />
        <path d="M-44 24h88v3h-88z" fill={EQ.fill2} />
        <path d="M-32 16h4v8h-7z M-16 16h4l3 8h-7z" fill={EQ.fill2} />
        <path d="M-12 14H7v-3" />
      </g>
      <g transform="translate(-22 0)">
        <VesselShell d={vessel} x={-14} width={28} top={-21} bottom={19} props={props}>
          {props.running && (
            <g fill="none" stroke={mediumColor("co2")} strokeWidth={EQ.sw * 0.65}>
              {bubbles.slice(0, props.compact ? 2 : bubbles.length).map(({ x, y, r, phase }) => (
                <circle className="pw-vessel-bubble" key={x} cx={x} cy={y} r={r} style={{ animationDelay: phase }} />
              ))}
            </g>
          )}
        </VesselShell>
        <path d="M-14-15c7 2 21 2 28 0 M-14 13c7 2 21 2 28 0" fill="none" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.68} />
      </g>
      <g fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M7-11h25l4 4v19l-4 4H7z" />
        <path d="M7-13h4v31H7z M32-13h4v31h-4z" />
        <path d="M2-14h39 M2 19h39" fill="none" />
        <path d={props.compact ? "M17-10v25m8-25v25" : "M14-10v25m4-25v25m4-25v25m4-25v25m3-25v25"} fill="none" strokeWidth={EQ.sw * 0.7} />
        <path d="M41-8v4m0 13v4 M-41-11v4m0 14v4" fill="none" />
      </g>
    </SymbolFrame>
  );
}
