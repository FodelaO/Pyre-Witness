/** Plan-view 24-head filler with transfer stars and bottle guide rails. */
"use client";

import { BottleTop, TransferStar } from "../process/packagingParts";
import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const footprint = FOOTPRINT.rotary_filler;
const stationAngles = Array.from({ length: 24 }, (_, index) => index * 15);
const compactAngles = stationAngles.filter((_, index) => index % 2 === 0);

export default function RotaryFiller(props: EquipmentProps) {
  const { compact, medium, running } = props;
  const product = mediumColor(medium);

  return (
    <SymbolFrame {...footprint} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round">
        <path d="M-47-47-36-58H36L47-47V15L55 26V47L45 57H-45L-55 47V26L-47 15Z" fill={EQ.fill} />
        <path d="M-43-45-34-54H34L43-45 M-51 28V45L-44 53H44L51 45V28" fill="none" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
        <path d="M-64 37h32v12h-32z M32 37h32v12H32z" fill={EQ.fill2} />
        <path d="M-64 40h31m-31 6h31m66-6h31m-31 6h31" stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
        <path d="M-41-50v7m82-7v7m-90 91h7m84 0h7" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.8} />
        <g transform="translate(0 -10)">
          <circle r={44} fill={EQ.fill2} />
          <circle r={41.5} fill={EQ.fill} stroke={EQ.faint} strokeWidth={EQ.sw * 0.7} />
          <g className={running ? "pw-spin-slow" : undefined}>
            <circle r={34.5} fill={EQ.fill2} stroke={EQ.stroke} strokeWidth={EQ.sw * 0.65} />
            <circle r={29} fill={EQ.fill} stroke={EQ.faint} strokeWidth={EQ.sw * 0.65} />
            <path d="M-5-28H5V-11L24 13l-5 8-19-9-19 9-5-8L-5-11Z" fill={EQ.fill2} />
            {(compact ? compactAngles : stationAngles).map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <path d="M0-29v-9" stroke={EQ.stroke} strokeWidth={EQ.sw * 0.7} />
                <rect x={-1.7} y={-33.5} width={3.4} height={3.4} rx={0.75} fill={EQ.accent} stroke="none" />
                <BottleTop y={-37.7} radius={2.65} color={product} />
              </g>
            ))}
            <circle r={12} fill={EQ.fill2} />
            <circle r={7.5} fill={EQ.fill} stroke={EQ.faint} strokeWidth={EQ.sw * 0.75} />
            <path d="M0-4h4v4H0z" fill={EQ.accent} stroke="none" />
          </g>
          <path d="M-35-24a42.5 42.5 0 0 1 70 0" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} strokeOpacity={0.64} fill="none" />
        </g>
        <TransferStar x={-31} y={33} running={running} compact={compact} color={product} />
        <TransferStar x={31} y={33} running={running} compact={compact} color={product} />
        {!compact && (
          <g>
            <BottleTop x={-58} y={43} radius={2.5} color={product} />
            <BottleTop x={-50} y={43} radius={2.5} color={product} />
            <BottleTop x={50} y={43} radius={2.5} color={product} />
            <BottleTop x={58} y={43} radius={2.5} color={product} />
            <path d="M-43 17c5 0 11 5 13 9m73-9c-5 0-11 5-13 9" fill="none" stroke={EQ.accent} strokeWidth={EQ.sw * 0.75} />
            <rect x={-8} y={38} width={16} height={11} rx={1.8} fill={EQ.fill2} stroke={EQ.faint} strokeWidth={EQ.sw * 0.75} />
            <path d="M-4 42h8m-8 3h5" stroke={EQ.accent} strokeWidth={EQ.sw * 0.7} />
          </g>
        )}
      </g>
    </SymbolFrame>
  );
}
