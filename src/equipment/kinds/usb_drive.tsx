/** USB flash drive with exposed Type-A metal connector plug, retention cutouts and activity LED. */
"use client";

import { useId } from "react";
import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function UsbDrive(props: EquipmentProps) {
  const metalId = useId();
  const { compact, running, status } = props;
  const offline = status === "offline";
  const ledColor = statusColor(status) ?? (running ? "var(--pw-info)" : "var(--pw-ok)");

  return (
    <SymbolFrame {...FOOTPRINT.usb_drive} props={props}>
      <defs>
        <linearGradient id={metalId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--pw-eq-accent)" stopOpacity={0.3} />
          <stop offset="48%" stopColor="var(--pw-eq-fill-2)" stopOpacity={0.95} />
          <stop offset="100%" stopColor="var(--pw-eq-fill)" stopOpacity={1} />
        </linearGradient>
      </defs>

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Exposed Type-A metallic plug */}
        <rect
          x={3.4}
          y={-3.5}
          width={9.1}
          height={7}
          rx={0.55}
          fill={`url(#${metalId})`}
          stroke={EQ.accent}
          strokeWidth={EQ.sw * 0.95}
        />

        {/* Signature dual square retention holes in the metal connector */}
        <rect x={8.2} y={-2.25} width={2.1} height={1.55} rx={0.25} fill={EQ.fill} strokeWidth={0.65} />
        <rect x={8.2} y={0.7} width={2.1} height={1.55} rx={0.25} fill={EQ.fill} strokeWidth={0.65} />

        {/* Rear lanyard eyelet */}
        <path d="M-10.9 -2.1H-11.8A1.3 2.1 0 0 0 -11.8 2.1H-10.9" fill="none" strokeWidth={EQ.sw * 0.9} />

        {/* Chamfered main drive casing */}
        <path d="M-9.4 -5.1H3.5V5.1H-9.4L-11 3.4V-3.4Z" fill={EQ.fill} />

        {/* Collar step between housing and plug */}
        <line x1={1.8} y1={-4.8} x2={1.8} y2={4.8} strokeWidth={0.75} opacity={0.65} />

        {!compact && (
          <>
            {/* Grip ribs on body and connector crimp seam */}
            <path d="M-7.5 -2.5V2.5M-5.9 -2.5V2.5M-4.3 -2.5V2.5" strokeWidth={0.7} opacity={0.55} />
            <line x1={6.1} y1={-3.2} x2={6.1} y2={3.2} stroke={EQ.stroke} strokeWidth={0.55} opacity={0.55} />
          </>
        )}

        {/* Activity LED */}
        <circle
          cx={-1}
          cy={0}
          r={1.05}
          fill={ledColor}
          stroke="none"
          className={!offline && running ? "pw-pulse" : undefined}
        />
      </g>
    </SymbolFrame>
  );
}
