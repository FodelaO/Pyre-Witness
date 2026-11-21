/** Engineering desk workstation with widescreen trend monitor, keyboard, and desk PC tower. */
"use client";

import type { ReactElement } from "react";
import { RectLed, resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Workstation(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);

  return (
    <SymbolFrame {...FOOTPRINT.workstation} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        {/* Monitor stand neck and base */}
        <path d="M-7.8 1.6 H-3.6 L-2.8 6.4 H-8.6 Z" fill={EQ.fill} strokeWidth={EQ.sw * 0.8} />
        <rect x={-12.0} y={6.0} width={12.6} height={2.1} rx={0.7} fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />

        {/* Widescreen monitor bezel */}
        <rect x={-18.8} y={-15.8} width={26.0} height={17.8} rx={1.7} fill={EQ.fill2} />

        {/* Monitor display area */}
        <rect
          x={-16.8}
          y={-13.8}
          width={22.0}
          height={13.2}
          rx={0.6}
          fill="var(--pw-floor)"
          strokeWidth={EQ.sw * 0.75}
        />

        {/* Reference grid + historian trend line on screen */}
        {!compact && (
          <path
            d="M-15.8 -10.0 H4.2 M-15.8 -6.4 H4.2 M-15.8 -2.8 H4.2"
            fill="none"
            stroke={EQ.faint}
            strokeWidth={EQ.sw * 0.45}
            opacity={0.75}
          />
        )}
        <path
          d="M-15.4 -3.6 L-11.8 -5.4 L-8.6 -4.0 L-4.8 -9.8 L-1.4 -7.8 L1.8 -11.4 L4.0 -9.2"
          fill="none"
          stroke={EQ.accent}
          strokeWidth={EQ.sw * 0.92}
        />
        {!compact && (
          <path
            d="M-15.4 -6.8 L-11.0 -7.6 L-6.8 -6.0 L-2.2 -6.6 L3.8 -5.2"
            fill="none"
            stroke={EQ.dim}
            strokeWidth={EQ.sw * 0.55}
            opacity={0.8}
          />
        )}

        {/* Monitor power LED */}
        <StatusLed
          cx={5.1}
          cy={0.6}
          r={0.68}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "steady" : "steady"}
        />

        {/* Keyboard in foreground */}
        <path d="M-17.4 10.2 H5.8 L7.4 15.8 H-19.0 Z" fill={EQ.fill2} strokeWidth={EQ.sw * 0.85} />
        <path
          d={
            compact
              ? "M-15.2 13.0 H3.6"
              : "M-15.8 11.9 H-11.6 M-10.2 11.9 H-5.4 M-4.0 11.9 H0.8 M2.2 11.9 H4.4 M-16.4 13.9 H-12.4 M-10.8 13.9 H-0.2 M1.4 13.9 H5.0"
          }
          fill="none"
          stroke={EQ.accent}
          strokeWidth={EQ.sw * 0.65}
          opacity={0.85}
        />

        {/* Desk PC tower on right */}
        <rect x={9.6} y={-13.4} width={9.4} height={29.2} rx={1.4} fill={EQ.fill} />
        <rect
          x={11.1}
          y={-11.2}
          width={6.4}
          height={2.6}
          rx={0.4}
          fill={EQ.fill2}
          strokeWidth={EQ.sw * 0.65}
        />
        {!compact && (
          <>
            {/* Front I/O strip */}
            <rect
              x={11.3}
              y={-6.8}
              width={2.6}
              height={1.3}
              rx={0.25}
              fill="var(--pw-floor)"
              strokeWidth={EQ.sw * 0.55}
            />
            <circle cx={15.6} cy={-6.15} r={0.55} fill="var(--pw-floor)" strokeWidth={EQ.sw * 0.55} />
            <circle cx={17.2} cy={-6.15} r={0.55} fill="var(--pw-floor)" strokeWidth={EQ.sw * 0.55} />
            {/* Front intake louvers */}
            <path
              d="M11.3 4.8 H17.3 M11.3 7.2 H17.3 M11.3 9.6 H17.3 M11.3 12.0 H17.3"
              fill="none"
              stroke={EQ.faint}
              strokeWidth={EQ.sw * 0.65}
            />
          </>
        )}

        {/* PC power button and status/activity LEDs */}
        <circle cx={13.0} cy={-1.8} r={1.35} fill={EQ.fill2} strokeWidth={EQ.sw * 0.7} />
        <StatusLed
          cx={13.0}
          cy={-1.8}
          r={0.55}
          color={led.primaryColor}
          opacity={led.primaryOpacity}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />
        <RectLed
          x={15.6}
          y={-2.35}
          w={1.7}
          h={1.1}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "flicker-a" : "steady"}
        />
      </g>
    </SymbolFrame>
  );
}
