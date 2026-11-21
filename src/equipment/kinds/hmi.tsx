/** Panel-mounted operator HMI touch screen with process mimic graphic, soft keys, and side USB port. */
"use client";

import type { ReactElement } from "react";
import { resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const SOFT_KEYS = [-11.8, -7.2, -2.6, 2.0, 6.6];
const COMPACT_KEYS = [-10.4, -3.2, 4.0];

export default function Hmi(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);

  return (
    <SymbolFrame {...FOOTPRINT.hmi} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        {/* Side bulkhead USB port (right bezel edge) */}
        <g>
          <rect x={13.0} y={-3.4} width={3.6} height={9.6} rx={0.8} fill={EQ.fill2} strokeWidth={EQ.sw * 0.85} />
          <rect
            x={14.1}
            y={-1.8}
            width={1.6}
            height={6.4}
            rx={0.3}
            fill="var(--pw-floor)"
            stroke={EQ.accent}
            strokeWidth={EQ.sw * 0.58}
          />
          {!compact && <line x1={14.9} y1={-0.7} x2={14.9} y2={3.5} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.55} />}
        </g>

        {/* Outer panel-mount bezel */}
        <rect x={-16.4} y={-14.0} width={29.8} height={28.0} rx={2.2} fill={EQ.fill2} />

        {/* Inner recessed bezel lip */}
        {!compact && (
          <rect
            x={-14.6}
            y={-11.7}
            width={26.2}
            height={23.9}
            rx={1.2}
            fill={EQ.fill}
            stroke={EQ.faint}
            strokeWidth={EQ.sw * 0.65}
          />
        )}

        {/* Touch screen display */}
        <rect
          x={-13.2}
          y={-10.6}
          width={23.4}
          height={16.4}
          rx={0.8}
          fill="var(--pw-floor)"
          strokeWidth={EQ.sw * 0.8}
        />

        {/* Mimic graphic: mini process tank + vertical level bars */}
        <g>
          {/* Mini process tank outline with level fill */}
          <rect
            x={-11.0}
            y={-7.8}
            width={6.6}
            height={10.8}
            rx={1.5}
            fill={EQ.fill}
            stroke={EQ.stroke}
            strokeWidth={EQ.sw * 0.68}
          />
          <rect
            x={-10.3}
            y={-2.4}
            width={5.2}
            height={4.7}
            rx={0.5}
            fill={EQ.fill2}
            stroke="none"
          />
          <line x1={-10.3} y1={-2.4} x2={-5.1} y2={-2.4} stroke={EQ.accent} strokeWidth={EQ.sw * 0.72} />
          {!compact && (
            <path
              d="M-7.7 -7.8 V-9.4 M-4.4 0.8 H-2.2"
              fill="none"
              stroke={EQ.dim}
              strokeWidth={EQ.sw * 0.6}
            />
          )}

          {/* Process bar-graph columns */}
          <line x1={-1.8} y1={3.1} x2={8.6} y2={3.1} stroke={EQ.faint} strokeWidth={EQ.sw * 0.6} />
          <rect x={-1.0} y={-1.8} width={2.2} height={4.9} rx={0.3} fill={EQ.stroke} stroke="none" />
          <rect x={2.2} y={-5.8} width={2.2} height={8.9} rx={0.3} fill={EQ.accent} stroke="none" />
          <rect x={5.4} y={-3.6} width={2.2} height={6.7} rx={0.3} fill={EQ.stroke} stroke="none" />
          {!compact && (
            <line
              x1={-1.6}
              y1={-6.4}
              x2={8.4}
              y2={-6.4}
              stroke={EQ.faint}
              strokeDasharray="1.5 1.5"
              strokeWidth={EQ.sw * 0.55}
            />
          )}
        </g>

        {/* Soft-key row along bottom bezel */}
        <g fill={EQ.fill2} strokeWidth={EQ.sw * 0.65}>
          {(compact ? COMPACT_KEYS : SOFT_KEYS).map((x) => (
            <rect key={x} x={x} y={7.6} width={compact ? 5.2 : 3.6} height={2.8} rx={0.55} />
          ))}
        </g>

        {/* Top bezel status LEDs */}
        <StatusLed
          cx={7.6}
          cy={-12.85}
          r={0.82}
          color={led.primaryColor}
          opacity={led.primaryOpacity}
          motion={props.status === "alarm" ? "pulse" : led.active ? "blink" : "steady"}
        />
        {!compact && (
          <>
            <StatusLed
              cx={10.2}
              cy={-12.85}
              r={0.68}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? "flicker-b" : "steady"}
            />
            {/* Bezel clamp fasteners */}
            <circle cx={-14.8} cy={-12.7} r={0.5} fill={EQ.faint} stroke="none" />
            <circle cx={-14.8} cy={12.4} r={0.5} fill={EQ.faint} stroke="none" />
            <circle cx={11.8} cy={12.4} r={0.5} fill={EQ.faint} stroke="none" />
          </>
        )}
      </g>
    </SymbolFrame>
  );
}
