/** Open engineering laptop with lit display, hinge bar and angled keyboard deck. */
"use client";

import { useId } from "react";
import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Laptop(props: EquipmentProps) {
  const screenId = useId();
  const { compact, running, status } = props;
  const offline = status === "offline";
  const ledColor = statusColor(status) ?? (running ? "var(--pw-info)" : "var(--pw-ok)");

  return (
    <SymbolFrame {...FOOTPRINT.laptop} props={props}>
      <defs>
        <linearGradient id={screenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--pw-info)" stopOpacity={offline ? 0.04 : 0.3} />
          <stop offset="100%" stopColor="var(--pw-info)" stopOpacity={offline ? 0.02 : 0.09} />
        </linearGradient>
      </defs>

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Display lid */}
        <rect x={-12.4} y={-11.6} width={24.8} height={14.3} rx={1.5} fill={EQ.fill2} />

        {/* Lit screen panel */}
        <rect x={-10.7} y={-9.7} width={21.4} height={10.8} rx={0.8} fill={EQ.fill} strokeWidth={0.75} />
        <rect
          x={-10.7}
          y={-9.7}
          width={21.4}
          height={10.8}
          rx={0.8}
          fill={`url(#${screenId})`}
          stroke={offline ? EQ.faint : EQ.accent}
          strokeWidth={0.65}
          opacity={offline ? 0.5 : 0.85}
        />

        {!compact && (
          <>
            {/* Top-bezel camera dot */}
            <circle cx={0} cy={-10.65} r={0.5} fill={EQ.stroke} stroke="none" />
            {/* Quiet screen telemetry traces when powered */}
            {!offline && (
              <g fill="none" stroke={EQ.accent} strokeWidth={0.75} opacity={0.55}>
                <path d="M-8.5 -7.2H-2.2M-8.5 -4.9H2.8M-8.5 -2.6H-0.4" />
                <path d="M4.8 -2.8L6.4 -5.4L7.7 -4L9.1 -6.6" stroke="var(--pw-info)" strokeWidth={0.8} opacity={0.95} />
                <line x1={5.8} y1={-9.1} x2={9.8} y2={-5.1} strokeWidth={0.6} opacity={0.28} />
              </g>
            )}
          </>
        )}

        {/* Hinge barrel */}
        <rect x={-9.4} y={2.4} width={18.8} height={1.3} rx={0.45} fill={EQ.fill} strokeWidth={0.75} />

        {/* Angled keyboard deck */}
        <path
          d="M-12.4 3.5H12.4L15.9 9.7Q16.2 10.6 15.1 10.6H-15.1Q-16.2 10.6 -15.9 9.7Z"
          fill={EQ.fill2}
        />
        {/* Front chassis lip */}
        <path d="M-15.7 10.2L-15 11.8H15L15.7 10.2" fill={EQ.fill} strokeWidth={EQ.sw * 0.85} />
        <line x1={-2.2} y1={10.6} x2={2.2} y2={10.6} stroke={EQ.accent} strokeWidth={0.8} opacity={0.65} />

        {/* Keywell & touchpad */}
        <path d="M-10.6 4.7H10.6L12 7.8H-12Z" fill={EQ.fill} strokeWidth={0.65} />
        {!compact && (
          <>
            <path d="M-10.8 5.8H10.8M-11.3 6.8H11.3" strokeWidth={0.55} opacity={0.55} />
            <path d="M-3.1 8.4H3.1L3.5 9.8H-3.5Z" fill={EQ.fill} strokeWidth={0.6} />
          </>
        )}

        {/* Deck status LED */}
        <circle cx={12.6} cy={9.1} r={0.85} fill={ledColor} stroke="none" />
      </g>
    </SymbolFrame>
  );
}
