/** Plan-view belt, end rollers, gearmotor and a moving stream of bottles. */
"use client";

import { useId } from "react";
import { BottleTop } from "../process/packagingParts";
import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";
import "../process/process.css";

const footprint = FOOTPRINT.conveyor;
const bottlePositions = Array.from({ length: 9 }, (_, index) => index * 20 - 89);
const rollerPositions = Array.from({ length: 17 }, (_, index) => index * 8 - 73);

export default function Conveyor(props: EquipmentProps) {
  const laneId = useId();
  const product = mediumColor(props.medium);

  return (
    <SymbolFrame {...footprint} props={props}>
      <defs>
        <clipPath id={laneId}><rect x={-75} y={-5.7} width={139} height={11.4} rx={1.2} /></clipPath>
      </defs>
      <g fill={EQ.fill} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <rect x={-79} y={-8.1} width={145} height={16.2} rx={3.3} />
        <rect x={-75} y={-5.7} width={138.5} height={11.4} rx={1.6} fill={EQ.fill2} stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
        <path d="M-76-6v12m138-12v12" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 1.05} />
        <path d="M-70-7h128m-128 14h128" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.65} strokeOpacity={0.7} />
        {!props.compact && rollerPositions.map((x) => (
          <path key={x} d={`M${x} -5.4v10.8`} stroke={EQ.faint} strokeWidth={EQ.sw * 0.6} />
        ))}
        <g clipPath={`url(#${laneId})`}>
          <g className={props.running ? "pw-conveyor-bottles" : undefined}>
            {bottlePositions.map((x) => <BottleTop key={x} x={x} radius={props.compact ? 2.7 : 3.3} color={product} />)}
          </g>
        </g>
        <path d="M65-3h4v6h-4z" fill={EQ.stroke} stroke="none" />
        <path d="M69-8h8l2 3v10l-2 3h-8z" fill={EQ.fill2} />
        <path d="M71-5h5m-5 3h6m-6 4h6m-6 3h5" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} />
        {!props.compact && <path d="M-72-8v-2m0 18v2m40-18v-2m0 18v2m40-18v-2m0 18v2m40-18v-2m0 18v2" fill="none" stroke={EQ.faint} />}
      </g>
    </SymbolFrame>
  );
}
