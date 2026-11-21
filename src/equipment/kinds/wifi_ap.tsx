/** Ceiling-mount Wi-Fi access point disc with subtle animated radio waves when running. */
"use client";

import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function WifiAp(props: EquipmentProps) {
  const { compact, running, status } = props;
  const offline = status === "offline";
  const active = Boolean(running) && !offline;
  const ringColor = statusColor(status) ?? (active ? "var(--pw-info)" : EQ.stroke);

  return (
    <SymbolFrame {...FOOTPRINT.wifi_ap} props={props} round>
      {active && (
        <g fill="none" stroke="var(--pw-info)" strokeWidth={1} opacity={0.78}>
          <circle r={16.4} className="pw-wave" />
          <circle r={16.4} className="pw-wave" style={{ animationDelay: "-0.73s" }} />
          <circle r={16.4} className="pw-wave" style={{ animationDelay: "-1.46s" }} />
        </g>
      )}

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer mounting flange and raised radome */}
        <circle r={9.6} fill={EQ.fill} />
        <circle r={7.2} fill={EQ.fill2} strokeWidth={EQ.sw * 0.7} />

        {!compact && (
          <>
            {/* Subtle flange vent notches and top-left rim highlight */}
            <path d="M0 -8.9V-7.9M0 7.9V8.9M-8.9 0H-7.9M7.9 0H8.9" strokeWidth={0.7} opacity={0.6} />
            <path d="M-5.4 -4.4A7.1 7.1 0 0 1 3.3 -6.2" fill="none" stroke={EQ.accent} strokeWidth={0.65} opacity={0.45} />
          </>
        )}

        {/* Recessed LED status ring */}
        <circle
          r={5.1}
          fill="none"
          stroke={ringColor}
          strokeWidth={0.85}
          opacity={offline ? 0.3 : active || status === "alarm" || status === "attention" ? 0.88 : 0.42}
        />

        {/* Quiet Wi-Fi emitter mark on the dome */}
        <g fill="none" stroke={active ? "var(--pw-info)" : EQ.accent} strokeWidth={0.85} opacity={offline ? 0.45 : 0.9}>
          <path d="M-2.85 -0.75A4 4 0 0 1 2.85 -0.75" />
          {!compact && <path d="M-1.6 0.55A2.2 2.2 0 0 1 1.6 0.55" />}
        </g>
        <circle cx={0} cy={2.15} r={0.9} fill={active ? "var(--pw-info)" : EQ.accent} stroke="none" opacity={offline ? 0.45 : 0.95} />
      </g>
    </SymbolFrame>
  );
}
