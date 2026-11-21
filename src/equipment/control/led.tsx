/** Shared LED state helpers for control and network equipment symbols. */
"use client";

import { EQ, statusColor } from "../primitives";
import type { EquipmentProps } from "../types";
import "./control.css";

export type LedMotion =
  | "blink"
  | "blink-alt"
  | "flicker-a"
  | "flicker-b"
  | "flicker-c"
  | "pulse"
  | "steady";

const MOTION_CLASS: Record<LedMotion, string | undefined> = {
  blink: "pw-led-blink",
  "blink-alt": "pw-led-blink-alt",
  "flicker-a": "pw-led-flicker-a",
  "flicker-b": "pw-led-flicker-b",
  "flicker-c": "pw-led-flicker-c",
  pulse: "pw-pulse",
  steady: undefined,
};

export interface LedState {
  /** True when the asset is powered/running and not offline. */
  active: boolean;
  /** Operational green when active, muted steel when stopped/offline. */
  runColor: string;
  /** Opacity for operational LEDs. */
  runOpacity: number;
  /** Abnormal-state colour (attention/alarm), or null when normal/offline. */
  faultColor: string | null;
  /** CSS class for fault LEDs (pulses on alarm). */
  faultClass: string | undefined;
  /** Primary single-LED colour combining fault state and running state. */
  primaryColor: string;
  /** Opacity for the primary single LED. */
  primaryOpacity: number;
}

export function resolveLedState(props: EquipmentProps): LedState {
  const active = Boolean(props.running) && props.status !== "offline";
  const rawFault = props.status === "offline" ? null : statusColor(props.status);
  const primaryColor = rawFault ?? (active ? "var(--pw-ok)" : EQ.faint);
  const primaryOpacity = rawFault || active ? 0.96 : 0.42;

  return {
    active,
    runColor: active ? "var(--pw-ok)" : EQ.faint,
    runOpacity: active ? 0.95 : 0.38,
    faultColor: rawFault,
    faultClass: props.status === "alarm" ? "pw-pulse" : undefined,
    primaryColor,
    primaryOpacity,
  };
}

interface StatusLedProps {
  cx: number;
  cy: number;
  r?: number;
  color: string;
  opacity?: number;
  motion?: LedMotion;
}

/** Crisp circular indicator LED without stroke clutter. */
export function StatusLed({ cx, cy, r = 0.85, color, opacity = 0.95, motion = "steady" }: StatusLedProps) {
  return <circle cx={cx} cy={cy} r={r} fill={color} opacity={opacity} stroke="none" className={MOTION_CLASS[motion]} />;
}

interface RectLedProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
  color: string;
  opacity?: number;
  motion?: LedMotion;
}

/** Rectangular front-panel LED for rack bezels and switch ports. */
export function RectLed({ x, y, w = 1.6, h = 1.1, color, opacity = 0.95, motion = "steady" }: RectLedProps) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={0.35}
      fill={color}
      opacity={opacity}
      stroke="none"
      className={MOTION_CLASS[motion]}
    />
  );
}
