/** Neutral unidentified electronic device enclosure with shielded connector and IC chip glyph. */
"use client";

import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const fullPins = [-2.3, 0, 2.3];
const compactPins = [-1.7, 1.7];

export default function GenericDevice(props: EquipmentProps) {
  const { compact, running, status } = props;
  const offline = status === "offline";
  const pins = compact ? compactPins : fullPins;
  const ledColor = statusColor(status) ?? (running ? "var(--pw-info)" : "var(--pw-ok)");

  return (
    <SymbolFrame {...FOOTPRINT.generic_device} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Bottom shielded I/O connector stub */}
        <rect x={-4.2} y={9.4} width={8.4} height={3.8} rx={0.7} fill={EQ.fill} strokeWidth={EQ.sw * 0.9} />
        {!compact && (
          <path d="M-2 10.3V12.4M0 10.3V12.4M2 10.3V12.4" stroke={EQ.accent} strokeWidth={0.75} opacity={0.7} />
        )}

        {/* Chamfered square electronics enclosure */}
        <path
          d="M-8.4 -11.6H8.4L11 -9V6.8L8.4 9.4H-8.4L-11 6.8V-9Z"
          fill={EQ.fill2}
        />

        {/* Corner mounting screw bosses */}
        {!compact && (
          <g fill={EQ.fill} strokeWidth={0.6} opacity={0.75}>
            <circle cx={-8.1} cy={-8.7} r={0.75} />
            <circle cx={8.1} cy={-8.7} r={0.75} />
            <circle cx={-8.1} cy={6.5} r={0.75} />
            <circle cx={8.1} cy={6.5} r={0.75} />
          </g>
        )}

        {/* Neutral IC / microchip outline centred at (0, -1.1) */}
        <g transform="translate(0 -1.1)">
          {/* Radiating IC pins on all four edges */}
          <g strokeWidth={0.85}>
            {pins.map((offset) => (
              <g key={offset}>
                <line x1={offset} y1={-4.7} x2={offset} y2={-6.7} />
                <line x1={offset} y1={4.7} x2={offset} y2={6.7} />
                <line x1={-4.7} y1={offset} x2={-6.7} y2={offset} />
                <line x1={4.7} y1={offset} x2={6.7} y2={offset} />
              </g>
            ))}
          </g>

          {/* Chip package and inner silicon die */}
          <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={1.1} fill={EQ.fill} stroke={EQ.accent} strokeWidth={EQ.sw * 0.9} />
          {!compact && (
            <>
              <rect x={-2.4} y={-2.4} width={4.8} height={4.8} rx={0.45} fill={EQ.fill2} strokeWidth={0.65} />
              <circle cx={-3.1} cy={-3.1} r={0.5} fill={EQ.accent} stroke="none" />
            </>
          )}
        </g>

        {/* Quiet status LED */}
        <circle
          cx={5.1}
          cy={-9.3}
          r={0.95}
          fill={ledColor}
          stroke="none"
          opacity={offline ? 0.4 : 0.9}
        />
      </g>
    </SymbolFrame>
  );
}
