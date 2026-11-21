/** Plan-view rotary labeller showing the label web, reel hubs and bottle path. */
"use client";

import { BottleTop } from "../process/packagingParts";
import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const footprint = FOOTPRINT.labeler;
const bottleAngles = Array.from({ length: 12 }, (_, index) => index * 30);
const compactAngles = bottleAngles.filter((_, index) => index % 2 === 0);

export default function Labeler(props: EquipmentProps) {
  const { compact, medium, running } = props;
  const product = mediumColor(medium);

  return (
    <SymbolFrame {...footprint} props={props}>
      <g fill={EQ.fill} stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-28-27h50l9 9v41l-5 4h-52l-5-4v-45z" />
        <path d="M-34 15h68v10h-68z" fill={EQ.fill2} />
        <path d="M-34 18h68m-68 4h68" fill="none" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
        <g transform="translate(0 6)">
          <circle r={18.5} fill={EQ.fill2} />
          <g className={running ? "pw-spin-slow" : undefined}>
            <circle r={9.5} fill={EQ.fill} />
            <path d="M-8-5l16 10M0-9v18M8-5-8 5" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
            {(compact ? compactAngles : bottleAngles).map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <BottleTop y={-14.5} radius={2.2} color={product} />
              </g>
            ))}
            <circle r={3.2} fill={EQ.fill2} />
          </g>
        </g>
        <path d="M-27-10-19-2l4 6m29 1 4-9 6-5" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.8} />
        <circle cx={-19} cy={-2} r={2.1} fill={EQ.fill2} strokeWidth={EQ.sw * 0.7} />
        <circle cx={18} cy={-4} r={2.1} fill={EQ.fill2} strokeWidth={EQ.sw * 0.7} />
        <g transform="translate(-19 -16)">
          <circle r={10} fill={EQ.fill2} />
          <circle r={7.7} fill="none" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
          <circle r={3} fill={EQ.fill} stroke={EQ.accent} strokeWidth={EQ.sw * 0.75} />
        </g>
        <g transform="translate(19 -15)">
          <circle r={7.5} fill={EQ.fill2} />
          <circle r={2.6} fill={EQ.fill} stroke={EQ.accent} strokeWidth={EQ.sw * 0.75} />
        </g>
        {!compact && (
          <g>
            <BottleTop x={-27} y={20} radius={2.4} color={product} />
            <BottleTop x={-21} y={20} radius={2.4} color={product} />
            <BottleTop x={24} y={20} radius={2.4} color={product} />
            <BottleTop x={30} y={20} radius={2.4} color={product} />
            <path d="M-6-22h12m-12 3h8" stroke={EQ.faint} strokeWidth={EQ.sw * 0.7} />
          </g>
        )}
      </g>
    </SymbolFrame>
  );
}
