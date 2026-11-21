/** 1U managed Ethernet switch with a row of RJ45 ports, SFP uplinks, and blinking link LEDs. */
"use client";

import type { ReactElement } from "react";
import { type LedMotion, RectLed, resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

interface PortSpec {
  x: number;
  linked: boolean;
  motion: LedMotion;
}

const PORTS: readonly PortSpec[] = [
  { x: -12.6, linked: true, motion: "flicker-a" },
  { x: -8.9, linked: true, motion: "blink" },
  { x: -5.2, linked: true, motion: "flicker-b" },
  { x: -0.7, linked: true, motion: "flicker-c" },
  { x: 3.0, linked: false, motion: "steady" },
  { x: 6.7, linked: true, motion: "blink-alt" },
];

const COMPACT_PORTS: readonly PortSpec[] = [
  { x: -12.0, linked: true, motion: "flicker-a" },
  { x: -6.4, linked: true, motion: "blink" },
  { x: -0.8, linked: true, motion: "flicker-b" },
  { x: 4.8, linked: true, motion: "blink-alt" },
];

const UPLINKS = [11.6, 14.7];

export default function NetworkSwitch(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);
  const ports = compact ? COMPACT_PORTS : PORTS;
  const portW = compact ? 4.2 : 3.0;

  return (
    <SymbolFrame {...FOOTPRINT.network_switch} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        {/* Rack-mount ears */}
        <rect x={-21.4} y={-6.6} width={2.4} height={13.2} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />
        <rect x={19.0} y={-6.6} width={2.4} height={13.2} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />

        {/* 1U switch chassis */}
        <rect x={-19.0} y={-7.4} width={38.0} height={14.8} rx={1.2} fill={EQ.fill} />
        <rect
          x={-17.6}
          y={-5.8}
          width={35.2}
          height={11.6}
          rx={0.6}
          fill={EQ.fill2}
          stroke={EQ.faint}
          strokeWidth={EQ.sw * 0.62}
        />

        {/* Rack ear mounting screw slots */}
        {!compact && (
          <g fill="var(--pw-floor)" stroke="none">
            <circle cx={-20.2} cy={-3.6} r={0.55} />
            <circle cx={-20.2} cy={3.6} r={0.55} />
            <circle cx={20.2} cy={-3.6} r={0.55} />
            <circle cx={20.2} cy={3.6} r={0.55} />
          </g>
        )}

        {/* Left status LEDs: Power & Fault */}
        <StatusLed
          cx={-15.4}
          cy={-2.4}
          r={0.85}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "steady" : "steady"}
        />
        <StatusLed
          cx={-15.4}
          cy={2.2}
          r={0.85}
          color={led.faultColor ?? EQ.faint}
          opacity={led.faultColor ? 0.98 : 0.35}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />

        {/* RJ45 copper port row + link LEDs */}
        {ports.map((port) => (
          <g key={port.x}>
            {/* Link / activity LED */}
            <RectLed
              x={port.x + (portW - 1.6) / 2}
              y={-4.0}
              w={1.6}
              h={1.15}
              color={port.linked ? led.runColor : EQ.faint}
              opacity={port.linked ? led.runOpacity : 0.3}
              motion={led.active && port.linked ? port.motion : "steady"}
            />
            {/* RJ45 jack housing */}
            <rect
              x={port.x}
              y={-1.2}
              width={portW}
              height={4.8}
              rx={0.35}
              fill="var(--pw-floor)"
              stroke={EQ.stroke}
              strokeWidth={EQ.sw * 0.65}
            />
            {/* RJ45 upper latch notch */}
            {!compact && (
              <rect
                x={port.x + 0.9}
                y={-1.2}
                width={1.2}
                height={1.0}
                fill={EQ.fill2}
                stroke="none"
              />
            )}
          </g>
        ))}

        {/* Vertical bank divider before SFP uplinks */}
        {!compact && <line x1={10.5} y1={-4.4} x2={10.5} y2={4.4} stroke={EQ.faint} strokeWidth={EQ.sw * 0.6} />}

        {/* Right-side SFP fiber uplink cages */}
        {(compact ? [12.0] : UPLINKS).map((ux, idx) => (
          <g key={ux}>
            <RectLed
              x={ux + 0.4}
              y={-4.0}
              w={1.6}
              h={1.15}
              color={led.runColor}
              opacity={led.runOpacity}
              motion={led.active ? (idx === 0 ? "flicker-a" : "blink") : "steady"}
            />
            <rect
              x={ux}
              y={-1.2}
              width={compact ? 3.8 : 2.4}
              height={4.8}
              rx={0.3}
              fill={EQ.fill}
              stroke={EQ.accent}
              strokeWidth={EQ.sw * 0.68}
            />
          </g>
        ))}
      </g>
    </SymbolFrame>
  );
}
