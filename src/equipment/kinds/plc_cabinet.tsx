/** Industrial PLC steel cabinet with hinged door, DIN rail modules, status LEDs, and bottom cable glands. */
"use client";

import type { ReactElement } from "react";
import { resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const GLAND_X = [-7.5, 0, 7.5];

export default function PlcCabinet(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);

  return (
    <SymbolFrame {...FOOTPRINT.plc_cabinet} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        {/* Top drip hood and main NEMA/IP65 steel enclosure */}
        <path d="M-16.0 -20.2 L-14.8 -21.8 H14.8 L16.0 -20.2 Z" fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />
        <rect x={-15.5} y={-20.2} width={31} height={37.2} rx={1.6} fill={EQ.fill} />

        {/* Recessed hinged door */}
        <rect
          x={-13.2}
          y={-17.8}
          width={26.4}
          height={32.4}
          rx={1}
          fill={EQ.fill2}
          strokeWidth={EQ.sw * 0.72}
        />

        {/* Door hinges (left) */}
        {!compact && (
          <g fill={EQ.fill} strokeWidth={EQ.sw * 0.7}>
            <rect x={-15.9} y={-12.6} width={2.1} height={4.4} rx={0.5} />
            <rect x={-15.9} y={6.2} width={2.1} height={4.4} rx={0.5} />
          </g>
        )}

        {/* Swing door handle + quarter-turn latch (right) */}
        <rect x={10.1} y={-4.6} width={2.3} height={8.8} rx={0.7} fill={EQ.fill} strokeWidth={EQ.sw * 0.75} />
        {!compact && (
          <>
            <line x1={11.25} y1={-3.2} x2={11.25} y2={1.2} stroke={EQ.accent} strokeWidth={EQ.sw * 0.65} />
            <circle cx={11.25} cy={2.8} r={0.55} fill={EQ.accent} stroke="none" />
          </>
        )}

        {/* Inspection window revealing DIN rail and PLC rack */}
        <rect
          x={-11.2}
          y={-14.4}
          width={20.2}
          height={19.6}
          rx={1}
          fill="var(--pw-floor)"
          strokeWidth={EQ.sw * 0.75}
        />

        {/* Horizontal DIN rail */}
        <path
          d="M-10.6 -5.4 H8.4 M-10.6 -3.2 H8.4"
          fill="none"
          stroke={EQ.faint}
          strokeWidth={EQ.sw * 0.65}
        />

        {/* PLC modules mounted on DIN rail: Power Supply, CPU, and I/O slices */}
        <g strokeWidth={EQ.sw * 0.7}>
          {/* Power supply */}
          <rect x={-10.0} y={-11.0} width={3.7} height={13.2} rx={0.5} fill={EQ.fill2} />
          {/* CPU module */}
          <rect x={-5.7} y={-11.4} width={5.6} height={14.0} rx={0.6} fill={EQ.fill} stroke={EQ.accent} />
          {/* I/O module 1 */}
          <rect x={0.5} y={-11.0} width={3.6} height={13.2} rx={0.5} fill={EQ.fill2} />
          {/* I/O module 2 */}
          <rect x={4.6} y={-11.0} width={3.6} height={13.2} rx={0.5} fill={EQ.fill2} />
        </g>

        {/* Module terminal detail (omitted in compact) */}
        {!compact && (
          <g stroke={EQ.faint} strokeWidth={EQ.sw * 0.55}>
            <rect x={-4.6} y={-2.2} width={3.4} height={3.2} rx={0.4} fill="var(--pw-floor)" stroke={EQ.stroke} />
            <path d="M1.3 -3.2 H3.3 M1.3 -1.2 H3.3 M1.3 0.8 H3.3" />
            <path d="M5.4 -3.2 H7.4 M5.4 -1.2 H7.4 M5.4 0.8 H7.4" />
            <line x1={-9.1} y1={-1.8} x2={-7.2} y2={-1.8} />
            <line x1={-9.1} y1={0.4} x2={-7.2} y2={0.4} />
          </g>
        )}

        {/* PLC status LEDs */}
        <StatusLed
          cx={-8.15}
          cy={-9.0}
          r={0.75}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "steady" : "steady"}
        />
        <StatusLed
          cx={-3.9}
          cy={-9.2}
          r={0.85}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "blink" : "steady"}
        />
        <StatusLed
          cx={-1.9}
          cy={-9.2}
          r={0.85}
          color={led.faultColor ?? EQ.faint}
          opacity={led.faultColor ? 0.98 : 0.35}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />
        {!compact && (
          <>
            <StatusLed
              cx={-3.9}
              cy={-6.9}
              r={0.68}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? "flicker-a" : "steady"}
            />
            <StatusLed
              cx={2.3}
              cy={-9.0}
              r={0.7}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? "blink-alt" : "steady"}
            />
            <StatusLed
              cx={2.3}
              cy={-6.8}
              r={0.65}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? "flicker-b" : "steady"}
            />
            <StatusLed
              cx={6.4}
              cy={-9.0}
              r={0.7}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? "blink" : "steady"}
            />
          </>
        )}

        {/* Lower door ventilation louvers and nameplate */}
        {!compact && (
          <g fill="none" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65}>
            <path d="M-10.6 8.2 H-2.2 M-10.6 10.2 H-2.2 M-10.6 12.2 H-2.2" />
            <rect x={1.2} y={8.2} width={7.4} height={3.6} rx={0.5} fill={EQ.fill} stroke={EQ.stroke} />
          </g>
        )}

        {/* Bottom industrial cable glands */}
        {GLAND_X.map((gx) => (
          <g key={gx} transform={`translate(${gx} 17)`}>
            <rect x={-2.1} y={0} width={4.2} height={2.2} rx={0.4} fill={EQ.fill2} strokeWidth={EQ.sw * 0.72} />
            <path d="M-1.3 2.2 H1.3 L0.9 4.5 H-0.9 Z" fill={EQ.fill} strokeWidth={EQ.sw * 0.68} />
          </g>
        ))}
      </g>
    </SymbolFrame>
  );
}
