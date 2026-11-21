/** Evaporative condenser in plan with three axial fans and an exposed serpentine coil. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const fanCenters = [-35, 0, 35];
const bladeAngles = [0, 72, 144, 216, 288];

function AxialFan({ x, running, compact }: Pick<EquipmentProps, "running" | "compact"> & { x: number }) {
  return (
    <g transform={`translate(${x} -6)`}>
      <circle r={13.7} fill={EQ.fill2} stroke={EQ.stroke} />
      <circle r={11.4} fill={EQ.fill} stroke={EQ.stroke} strokeWidth={0.75} />
      <g className={running ? "pw-spin" : undefined} fill={EQ.stroke} stroke="none">
        <circle r={10.1} fill="transparent" />
        {bladeAngles.map((angle) => (
          <path key={angle} d="M1.5-1.2C1.5-4.4 2.1-8 4.5-9.4 8-8.8 8.1-6.6 6.6-5.1 4.3-4.1 3.5-2.6 2.9-.8Z" transform={`rotate(${angle})`} />
        ))}
      </g>
      {!compact && (
        <g fill="none" stroke={EQ.accent} strokeWidth={0.55} opacity={0.52}>
          <circle r={8.7} />
          <path d="M-11.5 0h23M0-11.5v23" />
        </g>
      )}
      <circle r={2.8} fill={EQ.fill2} stroke={EQ.accent} strokeWidth={0.8} />
      {!compact && <circle r={0.8} fill={EQ.accent} stroke="none" />}
    </g>
  );
}

export default function Condenser(props: EquipmentProps) {
  const coilColor = mediumColor(props.medium, EQ.stroke);

  return (
    <SymbolFrame {...FOOTPRINT.condenser} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M-50-22v-4h12v4m76 0v-4h12v4M-50 22v4h12v-4m76 0v4h12v-4" fill={EQ.fill2} />
        <path d="m-55-18 5-5H50l5 5v36l-5 5H-50l-5-5Z" fill={EQ.fill} />
        <path d="M-50-18l3-2h94l3 2V9H-50Z" fill={EQ.fill2} />
        <path d="M-17.5-20V9m35-29V9M-52 10H52" fill="none" strokeWidth={0.85} />
        {fanCenters.map((x) => <AxialFan key={x} x={x} running={props.running} compact={props.compact} />)}
        <path d="M-48 13H48v7h-96z" fill={EQ.fill2} strokeWidth={0.6} />
        <path d="M-59 14h102a2 2 0 0 1 0 4h-86a2 2 0 0 0 0 4H59" fill="none" stroke={coilColor} strokeWidth={0.95} />
        <path d="M-57 12v4m114 4v4" stroke={coilColor} />
        {!props.compact && (
          <path d="M-44-21h88M-50 12v7m100-7v7M-34 13v7m17-7v7m17-7v7m17-7v7m17-7v7" fill="none" stroke={EQ.accent} strokeWidth={0.6} opacity={0.54} />
        )}
      </g>
    </SymbolFrame>
  );
}
