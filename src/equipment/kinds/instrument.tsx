/** Field instrument bubble with ISA function letters, loop number and a process leader. */
"use client";

import { EQ, statusColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Instrument(props: EquipmentProps) {
  const tag = props.label?.match(/^([A-Z]{1,3})-(\d{1,4})$/);
  const letters = props.letters ?? tag?.[1];
  const loop = props.compact ? undefined : tag?.[2];
  const alarmColor = props.status === "alarm" ? statusColor(props.status) : null;

  return (
    <SymbolFrame {...FOOTPRINT.instrument} props={props} round>
      {!props.compact && (
        <path className="pw-instrument-leader" d="m6 2.5 3.1 3.1h1.4" fill="none"
          stroke={alarmColor ?? EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" />
      )}
      <circle cy={-0.6} r={8.8} fill={EQ.fill2} stroke={alarmColor ?? EQ.stroke} strokeWidth={alarmColor ? 1.6 : EQ.sw} />
      {alarmColor && <circle cx={4.5} cy={-6.4} r={1.8} fill={alarmColor} stroke={EQ.fill} strokeWidth={0.6} />}
      {letters && (
        <g className="pw-instrument-text" textAnchor="middle" fontFamily={EQ.mono} fill={EQ.accent} fontWeight={650}>
          <text y={loop ? -1.4 : 2.4} fontSize={loop ? 7.5 : letters.length > 2 ? 8.2 : 10}>{letters}</text>
          {loop && <text y={4.5} fontSize={5.4} fill={EQ.stroke}>{loop}</text>}
        </g>
      )}
    </SymbolFrame>
  );
}
