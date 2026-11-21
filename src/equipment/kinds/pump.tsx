/** Centrifugal pump with a tangential discharge, visible impeller and finned drive motor. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const bladeAngles = [0, 90, 180, 270];

export default function Pump(props: EquipmentProps) {
  return (
    <SymbolFrame {...FOOTPRINT.pump} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        <path d="M-13 9h6v2H6V9h8v2h1.5v2h-30v-2h1.5Z" fill={EQ.fill} />
        <path d="M-2 1H6v4H-2Z" fill={EQ.fill2} />
        <path d="M6-2h7.5l2.5 2v5l-2.5 2H6L4 5V0Z" fill={EQ.fill2} />
        <path d="M8-2v-2.4h4.5V-2" fill={EQ.fill} />
        <path d="M-15 2a7.1 7.1 0 0 1 7.1-7.4h2.5v-5.3h4.9v5.8C-.5-3.5-1-2.5-2-1.5A7.1 7.1 0 1 1-15 2Z" fill={EQ.fill2} />
        <path d="M-6.6-11h7.4M-16.2 0v4.3" stroke={mediumColor(props.medium)} />
        {!props.compact && (
          <path d="M7 0h5.5M7 2.5h5.5M7 5h5.5m.7-6.8v8.4M-12.3-2.1c1.2-1.2 2.7-1.7 4.1-1.7" fill="none" stroke={EQ.accent} strokeWidth={0.65} opacity={0.72} />
        )}
        <g transform="translate(-8 2.3)">
          <circle r={4.6} fill={EQ.fill} strokeWidth={0.75} />
          <g className={props.running ? "pw-spin" : undefined}>
            <circle r={3.85} stroke="none" fill="transparent" />
            {bladeAngles.map((angle) => (
              <path key={angle} d="M.5-.6q.4-2.3 2.8-2.7" transform={`rotate(${angle})`} fill="none" stroke={EQ.accent} strokeWidth={0.76} />
            ))}
          </g>
          <circle r={0.85} fill={EQ.accent} stroke="none" />
        </g>
      </g>
    </SymbolFrame>
  );
}
