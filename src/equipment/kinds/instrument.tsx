/** Field instrument bubble with ISA function letters, loop number and a process leader. */
"use client";

import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Instrument(props: EquipmentProps) {
  const tag = props.label?.match(/^([A-Z]{1,3})-(\d{1,4})$/);
  const letters = props.letters ?? tag?.[1];
  const loop = tag?.[2];
  const alarmColor = props.status === "alarm" ? statusColor(props.status) : null;

  return (
    <SymbolFrame {...FOOTPRINT.instrument} props={props} round>
      <path d="m5.5 2.5 3.1 3.1h1.9" fill="none" stroke={alarmColor ?? EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" />
      <circle cx={-1.7} cy={-0.6} r={8.1} fill={EQ.fill2} stroke={alarmColor ?? EQ.stroke} strokeWidth={alarmColor ? 1.6 : EQ.sw} />
      {alarmColor && <circle cx={4.5} cy={-6.4} r={1.8} fill={alarmColor} stroke={EQ.fill} strokeWidth={0.6} />}
      {!props.compact && letters && (
        <g textAnchor="middle" fontFamily={EQ.mono} fill={EQ.accent} fontWeight={600}>
          <text x={-1.7} y={loop ? -1.1 : 1.35} fontSize={6.3}>{letters}</text>
          {loop && <text x={-1.7} y={4.0} fontSize={4.3} fill={EQ.stroke}>{loop}</text>}
        </g>
      )}
    </SymbolFrame>
  );
}
