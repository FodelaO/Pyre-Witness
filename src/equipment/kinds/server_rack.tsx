/** 19-inch server rack with stacked rackmount servers, drive bays, and flickering activity LEDs. */
"use client";

import type { ReactElement } from "react";
import { type LedMotion, RectLed, resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

interface ServerUnitSpec {
  y: number;
  bayMotions: readonly LedMotion[];
  statusMotion: LedMotion;
}

const SERVER_UNITS: readonly ServerUnitSpec[] = [
  { y: -15.4, bayMotions: ["flicker-a", "steady", "flicker-b", "flicker-c"], statusMotion: "blink" },
  { y: -5.4, bayMotions: ["flicker-b", "flicker-c", "steady", "flicker-a"], statusMotion: "blink-alt" },
  { y: 4.6, bayMotions: ["steady", "flicker-a", "flicker-c", "flicker-b"], statusMotion: "blink" },
];

const DRIVE_X = [-11.2, -6.9, -2.6, 1.7];

export default function ServerRack(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);

  return (
    <SymbolFrame {...FOOTPRINT.server_rack} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        {/* Top airflow crown */}
        <rect x={-13.8} y={-25.4} width={27.6} height={1.6} rx={0.4} fill={EQ.fill2} strokeWidth={EQ.sw * 0.75} />

        {/* Outer 19-inch steel rack cabinet */}
        <rect x={-15.8} y={-23.8} width={31.6} height={46.6} rx={1.5} fill={EQ.fill} />

        {/* Leveling feet */}
        <rect x={-13.6} y={22.8} width={4.6} height={2.4} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.75} />
        <rect x={9.0} y={22.8} width={4.6} height={2.4} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.75} />

        {/* Vertical 19" mounting rails */}
        {!compact && (
          <path
            d="M-13.3 -22.2 V21.2 M13.3 -22.2 V21.2"
            fill="none"
            stroke={EQ.faint}
            strokeWidth={EQ.sw * 0.65}
          />
        )}

        {/* Top 1U management / patch chassis */}
        <rect x={-12.5} y={-21.6} width={25.0} height={4.8} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.75} />
        {!compact && (
          <path d="M-10.6 -19.2 H4.0" fill="none" stroke={EQ.faint} strokeDasharray="1.8 1.2" strokeWidth={EQ.sw * 0.9} />
        )}
        <StatusLed
          cx={8.4}
          cy={-19.2}
          r={0.72}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "blink" : "steady"}
        />
        <StatusLed
          cx={10.6}
          cy={-19.2}
          r={0.72}
          color={led.faultColor ?? EQ.faint}
          opacity={led.faultColor ? 0.98 : 0.35}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />

        {/* Three stacked 2U servers with hot-swap drive bays */}
        {SERVER_UNITS.map((unit) => (
          <g key={unit.y}>
            <rect
              x={-12.5}
              y={unit.y}
              width={25.0}
              height={8.4}
              rx={0.6}
              fill={EQ.fill2}
              strokeWidth={EQ.sw * 0.8}
            />
            {compact ? (
              <>
                <line
                  x1={-10.6}
                  y1={unit.y + 4.2}
                  x2={5.4}
                  y2={unit.y + 4.2}
                  stroke={EQ.faint}
                  strokeWidth={EQ.sw * 1.1}
                />
                <StatusLed
                  cx={9.8}
                  cy={unit.y + 4.2}
                  r={0.85}
                  color={led.runColor}
                  opacity={led.runOpacity}
                  motion={led.active ? unit.bayMotions[0] : "steady"}
                />
              </>
            ) : (
              <>
                {DRIVE_X.map((bx, idx) => (
                  <g key={bx}>
                    <rect
                      x={bx}
                      y={unit.y + 1.3}
                      width={3.6}
                      height={5.8}
                      rx={0.4}
                      fill={EQ.fill}
                      stroke={EQ.stroke}
                      strokeWidth={EQ.sw * 0.58}
                    />
                    <line
                      x1={bx + 0.9}
                      y1={unit.y + 4.5}
                      x2={bx + 2.7}
                      y2={unit.y + 4.5}
                      stroke={EQ.faint}
                      strokeWidth={EQ.sw * 0.55}
                    />
                    <RectLed
                      x={bx + 1.0}
                      y={unit.y + 2.1}
                      w={1.6}
                      h={0.95}
                      color={led.runColor}
                      opacity={led.runOpacity}
                      motion={led.active ? unit.bayMotions[idx] : "steady"}
                    />
                  </g>
                ))}
                {/* Right-hand server control ear + activity LEDs */}
                <StatusLed
                  cx={8.4}
                  cy={unit.y + 2.8}
                  r={0.7}
                  color={led.runColor}
                  opacity={led.runOpacity}
                  motion={led.active ? unit.statusMotion : "steady"}
                />
                <StatusLed
                  cx={10.5}
                  cy={unit.y + 2.8}
                  r={0.65}
                  color={led.runColor}
                  opacity={led.runOpacity}
                  motion={led.active ? unit.bayMotions[3] : "steady"}
                />
                <line
                  x1={7.8}
                  y1={unit.y + 5.6}
                  x2={11.0}
                  y2={unit.y + 5.6}
                  stroke={EQ.accent}
                  strokeWidth={EQ.sw * 0.6}
                />
              </>
            )}
          </g>
        ))}

        {/* Bottom 1U UPS / power distribution unit */}
        <rect x={-12.5} y={14.8} width={25.0} height={5.8} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.78} />
        <path
          d={compact ? "M-10.4 17.7 H3.6" : "M-10.4 16.7 H4.8 M-10.4 18.7 H4.8"}
          fill="none"
          stroke={EQ.faint}
          strokeWidth={EQ.sw * 0.7}
        />
        <StatusLed
          cx={9.8}
          cy={17.7}
          r={0.9}
          color={led.primaryColor}
          opacity={led.primaryOpacity}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />
      </g>
    </SymbolFrame>
  );
}
