/** Wall-mounted bullet IP security camera with lens highlight, recording LED and faint FOV wedge. */
"use client";

import { useId } from "react";
import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function IpCamera(props: EquipmentProps) {
  const fovId = useId();
  const { compact, running, status } = props;
  const offline = status === "offline";
  const ledColor = status === "attention" ? statusColor(status)! : offline ? EQ.faint : "var(--pw-alarm)";

  return (
    <SymbolFrame {...FOOTPRINT.ip_camera} props={props}>
      <defs>
        <linearGradient id={fovId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="var(--pw-info)" stopOpacity={offline ? 0.06 : 0.22} />
          <stop offset="100%" stopColor="var(--pw-info)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Faint field-of-view wedge */}
      <g>
        <path d="M6 -0.8L14.8 -9.2V7.6Z" fill={`url(#${fovId})`} stroke="none" />
        {!compact && !offline && (
          <path
            d="M6.4 -1.2L14.4 -8.8M6.4 -0.4L14.4 7.2"
            fill="none"
            stroke="var(--pw-info)"
            strokeWidth={0.55}
            strokeDasharray="2 2"
            opacity={0.35}
          />
        )}
      </g>

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Wall mount baseplate and articulated bracket */}
        <rect x={-14.2} y={-5.2} width={2.3} height={11.4} rx={0.7} fill={EQ.fill} strokeWidth={EQ.sw * 0.85} />
        <path d="M-11.9 2.2L-8.4 5.2L-4.6 3.1" fill="none" strokeWidth={EQ.sw * 1.1} />
        <circle cx={-8.4} cy={5.2} r={1.3} fill={EQ.fill2} strokeWidth={0.8} />
        {!compact && (
          <>
            <circle cx={-13.05} cy={-3.1} r={0.5} fill={EQ.stroke} stroke="none" />
            <circle cx={-13.05} cy={4.1} r={0.5} fill={EQ.stroke} stroke="none" />
          </>
        )}

        {/* Bullet camera enclosure */}
        <rect x={-9.5} y={-4.9} width={13.4} height={8.2} rx={1.6} fill={EQ.fill2} />

        {/* Overhanging weather sunshield hood */}
        <path d="M-9.6 -4.6L-8.5 -6.8H5.1L6.9 -4.9L5.2 -4.3H-9.6Z" fill={EQ.fill} strokeWidth={EQ.sw * 0.85} />

        {/* Front lens barrel and curved glass optic */}
        <rect x={3.6} y={-4} width={2.3} height={6.4} rx={0.7} fill={EQ.fill} strokeWidth={EQ.sw * 0.85} />
        <path d="M5.9 -3.2Q7.7 -0.8 5.9 1.6" fill={EQ.fill} stroke={EQ.accent} strokeWidth={EQ.sw * 0.85} />
        {/* Lens specular highlight */}
        <path d="M5.7 -2.3Q6.6 -1.4 6.1 -0.4" fill="none" stroke={EQ.accent} strokeWidth={0.8} />

        {!compact && (
          <>
            <line x1={-5.4} y1={-4.6} x2={-5.4} y2={3} strokeWidth={0.65} opacity={0.55} />
            <line x1={-8.1} y1={-3.3} x2={-0.6} y2={-3.3} stroke={EQ.accent} strokeWidth={0.6} opacity={0.42} />
            <path d="M-8.1 -1.2H-6.7M-8.1 0.6H-6.7" strokeWidth={0.65} opacity={0.55} />
          </>
        )}

        {/* Recording status LED */}
        <circle
          cx={1.5}
          cy={-2.2}
          r={1.05}
          fill={ledColor}
          stroke="none"
          className={!offline && running ? "pw-pulse" : undefined}
        />
      </g>
    </SymbolFrame>
  );
}
