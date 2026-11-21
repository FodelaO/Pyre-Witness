/** Inline control valve with a pneumatic diaphragm and distinct open/closed trim. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

export default function Valve(props: EquipmentProps) {
  const closed = props.running === false;

  return (
    <SymbolFrame {...FOOTPRINT.valve} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" strokeLinecap="round">
        <path d="M-12 4h4m16 0h4M0-3.5v7.3" fill="none" />
        <path d="M-5.8-4.5a5.8 5.8 0 0 1 11.6 0Z" fill={EQ.fill2} />
        {!props.compact && <path d="M-3-6.3a3.5 3.5 0 0 1 3-1.6" fill="none" stroke={EQ.accent} strokeWidth={0.7} />}
        <path d="m-8-.6 8 4.6-8 4.6Zm16 0L0 4l8 4.6Z" fill={closed ? EQ.stroke : EQ.fill} />
        {!closed && (
          <path d="M-6 4h3m6 0h3" stroke={mediumColor(props.medium, EQ.accent)} strokeWidth={0.8} opacity={0.85} />
        )}
      </g>
    </SymbolFrame>
  );
}
