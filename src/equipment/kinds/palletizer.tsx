/** Plan-view palletizing cell with an articulated arm, case infeed and stacked pallet. */
"use client";

import { EQ, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const footprint = FOOTPRINT.palletizer;
const rollers = [-43, -37, -31, -25, -19, -13, -7];
const palletSlats = [6, 16, 26, 36];

export default function Palletizer(props: EquipmentProps) {
  return (
    <SymbolFrame {...footprint} props={props}>
      <g fill={EQ.fill} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-42-4v-25l10-10h58m8 0h10v33m0 33v11h-47m-8 0h-31V25" fill="none" stroke={EQ.faint} />
        <path d="M-43-3v-5m0 33v5m70-69h6m11 34v6m0 19v6m-54 12h7" fill="none" />
        <rect x={-47} y={5} width={44} height={17} rx={1.4} fill={EQ.fill2} />
        {!props.compact && rollers.map((x) => <path key={x} d={`M${x} 6v15`} stroke={EQ.faint} strokeWidth={EQ.sw * 0.7} />)}
        <path d="M-46 8h42m-42 11h42" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
        <rect x={-18} y={8} width={11} height={11} rx={0.9} />
        <path d="M-12.5 9v9" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} />
        <rect x={4} y={3} width={37} height={35} rx={1.5} fill={EQ.fill2} />
        {palletSlats.map((y) => <path key={y} d={`M2 ${y}h41`} stroke={EQ.faint} strokeWidth={EQ.sw * 0.75} />)}
        <path d="M8 8h31v27H8z" fill={EQ.fill} />
        <path d="M9 8 11 5h25l3 3v24H9z" fill={EQ.fill2} />
        <path d="M19 5v27m10-27v27M9 14h30m-30 9h30" fill="none" />
        {!props.compact && <path d="M12 10h4m6 0h4m6 0h4m-24 9h4m6 0h4m6 0h4m-24 9h4m6 0h4m6 0h4" stroke={EQ.accent} strokeWidth={EQ.sw * 0.6} />}
        <path d="M-35-25-30-31h13l6 6v12l-6 6h-13l-5-6z" fill={EQ.fill2} />
        <circle cx={-23} cy={-19} r={7.8} />
        <path d="M-23-24-3-29l4 8-21 8zM-2-29l24 12-4 8-24-12zM21-15l3 12-7 2-4-12z" fill={EQ.fill2} />
        <path d="M-20-20-4-25 16-15l4 9" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} strokeOpacity={0.7} fill="none" />
        <circle cx={-23} cy={-19} r={4} fill={EQ.fill} />
        <circle cx={-3} cy={-24} r={4.6} fill={EQ.fill} />
        <circle cx={18} cy={-13} r={3.9} fill={EQ.fill} />
        <path d="M11-2h18v5h-5v6h-3V3h-3v6h-3V3h-4z" fill={EQ.fill2} />
      </g>
    </SymbolFrame>
  );
}
