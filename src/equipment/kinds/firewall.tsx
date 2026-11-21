/** 1U industrial firewall appliance featuring a brick-wall shield emblem and segmented port LEDs. */
"use client";

import { type ReactElement, useId } from "react";
import { RectLed, resolveLedState, StatusLed } from "../control/led";
import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const SHIELD_PATH = "M0 -13.0 L8.0 -9.8 V-2.2 C8.0 3.2 4.6 6.4 0 8.2 C-4.6 6.4 -8.0 3.2 -8.0 -2.2 V-9.8 Z";

export default function Firewall(props: EquipmentProps): ReactElement {
  const { compact } = props;
  const led = resolveLedState(props);
  const shieldClipId = useId();

  return (
    <SymbolFrame {...FOOTPRINT.firewall} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        <defs>
          <clipPath id={shieldClipId}>
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>

        {/* Rack-mount ears */}
        <rect x={-19.5} y={-2.6} width={2.3} height={13.0} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />
        <rect x={17.2} y={-2.6} width={2.3} height={13.0} rx={0.5} fill={EQ.fill2} strokeWidth={EQ.sw * 0.8} />

        {/* Main 1U security appliance chassis */}
        <rect x={-17.2} y={-3.6} width={34.4} height={15.0} rx={1.3} fill={EQ.fill} />
        <rect
          x={-15.6}
          y={-2.0}
          width={31.2}
          height={11.8}
          rx={0.7}
          fill={EQ.fill2}
          stroke={EQ.faint}
          strokeWidth={EQ.sw * 0.65}
        />

        {/* Chassis rubber feet */}
        <rect x={-14.2} y={11.4} width={3.6} height={1.6} rx={0.4} fill={EQ.fill2} strokeWidth={EQ.sw * 0.65} />
        <rect x={10.6} y={11.4} width={3.6} height={1.6} rx={0.4} fill={EQ.fill2} strokeWidth={EQ.sw * 0.65} />

        {/* Left faceplate: status LED stack + console/vent detail */}
        <StatusLed
          cx={-13.6}
          cy={0.6}
          r={0.85}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "blink" : "steady"}
        />
        <StatusLed
          cx={-13.6}
          cy={3.9}
          r={0.85}
          color={led.faultColor ?? EQ.faint}
          opacity={led.faultColor ? 0.98 : 0.35}
          motion={props.status === "alarm" ? "pulse" : "steady"}
        />
        <StatusLed
          cx={-13.6}
          cy={7.2}
          r={0.75}
          color={led.runColor}
          opacity={led.runOpacity}
          motion={led.active ? "flicker-a" : "steady"}
        />
        {!compact && (
          <g fill="none" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65}>
            <line x1={-11.2} y1={0.2} x2={-11.2} y2={7.6} />
            <line x1={-9.5} y1={0.2} x2={-9.5} y2={7.6} />
          </g>
        )}

        {/* Right faceplate: segmented WAN / DMZ / OT security ports + port LEDs */}
        <g>
          {[9.1, 12.5].map((px, idx) => (
            <g key={px}>
              <RectLed
                x={px + 0.45}
                y={-0.6}
                w={1.7}
                h={1.1}
                color={idx === 1 && led.faultColor ? led.faultColor : led.runColor}
                opacity={idx === 1 && led.faultColor ? 0.98 : led.runOpacity}
                motion={
                  idx === 1 && props.status === "alarm"
                    ? "pulse"
                    : led.active
                      ? idx === 0
                        ? "flicker-a"
                        : "flicker-b"
                      : "steady"
                }
              />
              <rect
                x={px}
                y={1.5}
                width={2.6}
                height={3.6}
                rx={0.35}
                fill="var(--pw-floor)"
                stroke={EQ.stroke}
                strokeWidth={EQ.sw * 0.65}
              />
              {!compact && (
                <>
                  <rect
                    x={px}
                    y={6.0}
                    width={2.6}
                    height={2.4}
                    rx={0.35}
                    fill={EQ.fill}
                    stroke={EQ.faint}
                    strokeWidth={EQ.sw * 0.58}
                  />
                </>
              )}
            </g>
          ))}
        </g>

        {/* Central Shield + Brick-Wall Motif rising above the 1U roofline */}
        <path d={SHIELD_PATH} fill={EQ.fill} stroke="none" />
        <g clipPath={`url(#${shieldClipId})`} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.68} fill="none">
          {/* Brick courses (running bond) */}
          <path d="M-9 -6.8 H9 M-9 -2.8 H9 M-9 1.2 H9 M-9 5.2 H9" />
          <path d="M0 -11.4 V-6.8 M-4.0 -6.8 V-2.8 M4.0 -6.8 V-2.8 M0 -2.8 V1.2 M-4.0 1.2 V5.2 M4.0 1.2 V5.2" />
        </g>
        <path d={SHIELD_PATH} fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 1.05} />
      </g>
    </SymbolFrame>
  );
}
