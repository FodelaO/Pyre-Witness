/** Industrial DIN-rail IoT / cellular gateway with twin antennas, terminal block, LEDs and faint RF waves. */
"use client";

import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Gateway(props: EquipmentProps) {
  const { compact, running, status } = props;
  const offline = status === "offline";
  const active = Boolean(running) && !offline;
  const faultColor = statusColor(status);

  return (
    <SymbolFrame {...FOOTPRINT.gateway} props={props}>
      {/* Faint radio waves emitted from primary antenna when running */}
      {active && (
        <g fill="none" stroke="var(--pw-info)" strokeWidth={0.85} strokeLinecap="round" opacity={0.7}>
          <g className="pw-wave">
            <circle cx={-7.2} cy={-9.8} r={4.6} fill="transparent" stroke="none" />
            <path d="M-10.6 -12.3A4.3 4.3 0 0 0 -10.6 -7.3M-3.8 -12.3A4.3 4.3 0 0 1 -3.8 -7.3" />
          </g>
          <g className="pw-wave" style={{ animationDelay: "-1.1s" }}>
            <circle cx={-7.2} cy={-9.8} r={4.6} fill="transparent" stroke="none" />
            <path d="M-10.6 -12.3A4.3 4.3 0 0 0 -10.6 -7.3M-3.8 -12.3A4.3 4.3 0 0 1 -3.8 -7.3" />
          </g>
        </g>
      )}

      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        {/* DIN rail mounting strip behind enclosure */}
        <rect x={-15.2} y={-1.6} width={30.4} height={5.2} rx={0.6} fill={EQ.fill} strokeWidth={EQ.sw * 0.7} opacity={0.78} />
        {!compact && <path d="M-14.6 -0.2H14.6M-14.6 2.2H14.6" strokeWidth={0.55} opacity={0.4} />}

        {/* Primary (left) and diversity (right) SMA antennas */}
        <rect x={-8.5} y={-5.8} width={2.6} height={1.8} rx={0.4} fill={EQ.fill2} strokeWidth={0.8} />
        <line x1={-7.2} y1={-5.8} x2={-7.2} y2={-10.5} strokeWidth={1.35} />
        <circle cx={-7.2} cy={-10.8} r={0.85} fill={EQ.accent} stroke="none" />

        <rect x={5.9} y={-5.8} width={2.6} height={1.8} rx={0.4} fill={EQ.fill2} strokeWidth={0.8} />
        <line x1={7.2} y1={-5.8} x2={7.2} y2={-9.5} strokeWidth={1.2} />
        <circle cx={7.2} cy={-9.8} r={0.75} fill={EQ.accent} stroke="none" />

        {/* Main metallic gateway housing */}
        <rect x={-11.4} y={-4.1} width={22.8} height={12.3} rx={1.5} fill={EQ.fill2} />

        {/* Recessed RJ45 port on lower-left */}
        <rect x={-9.2} y={1.5} width={4.6} height={4.4} rx={0.6} fill={EQ.fill} strokeWidth={0.8} />
        {!compact && (
          <>
            <line x1={-10} y1={-2.5} x2={10} y2={-2.5} stroke={EQ.accent} strokeWidth={0.55} opacity={0.35} />
            <path d="M-8 2.4V3.5M-6.9 2.4V3.5M-5.8 2.4V3.5" strokeWidth={0.55} opacity={0.7} />
            {/* Cooling vents / SIM slot bay */}
            <path d="M1.8 2.2H8.8M1.8 4H8.8M1.8 5.7H6.6" strokeWidth={0.7} opacity={0.5} />
          </>
        )}

        {/* Front status LED bank: power, RF link, status */}
        <circle cx={2.2} cy={-0.6} r={0.95} fill={offline ? EQ.faint : "var(--pw-ok)"} stroke="none" />
        <circle
          cx={5.2}
          cy={-0.6}
          r={0.95}
          fill={active ? "var(--pw-info)" : EQ.faint}
          stroke="none"
          opacity={active ? 0.95 : 0.45}
        />
        <circle
          cx={8.2}
          cy={-0.6}
          r={0.95}
          fill={faultColor ?? (active ? "var(--pw-ok)" : EQ.faint)}
          stroke="none"
          opacity={faultColor || active ? 0.95 : 0.4}
        />

        {/* Bottom 4-pin screw terminal block */}
        <rect x={-8.4} y={8.1} width={16.8} height={3.2} rx={0.6} fill={EQ.fill} strokeWidth={EQ.sw * 0.85} />
        {!compact && (
          <g strokeWidth={0.65} opacity={0.7}>
            <line x1={-4.2} y1={8.3} x2={-4.2} y2={11.1} />
            <line x1={0} y1={8.3} x2={0} y2={11.1} />
            <line x1={4.2} y1={8.3} x2={4.2} y2={11.1} />
            <circle cx={-6.3} cy={9.7} r={0.55} fill={EQ.stroke} stroke="none" />
            <circle cx={-2.1} cy={9.7} r={0.55} fill={EQ.stroke} stroke="none" />
            <circle cx={2.1} cy={9.7} r={0.55} fill={EQ.stroke} stroke="none" />
            <circle cx={6.3} cy={9.7} r={0.55} fill={EQ.stroke} stroke="none" />
          </g>
        )}
      </g>
    </SymbolFrame>
  );
}
