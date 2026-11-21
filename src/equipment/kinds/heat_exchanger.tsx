/** Gasketed plate heat exchanger with a compressed plate pack and four process ports. */
"use client";

import { EQ, mediumColor, SymbolFrame } from "../primitives";
import { FOOTPRINT, type EquipmentProps } from "../types";

const standardPlates = [-13, -9, -5, -1, 3, 7, 11, 15];
const compactPlates = [-12, -6, 0, 6, 12];
const nozzleRows = [-8, 8];

export default function HeatExchanger(props: EquipmentProps) {
  const { compact, medium } = props;
  const plates = compact ? compactPlates : standardPlates;

  return (
    <SymbolFrame {...FOOTPRINT.heat_exchanger} props={props}>
      <g stroke={EQ.stroke} strokeWidth={EQ.sw} strokeLinejoin="round" fill={EQ.fill}>
        <path d="M-20 -15H21M-20 14H21M-20 19H-12M12 19H21M-16 14V19M17 14V19" fill="none" />
        {nozzleRows.map((y) => (
          <g key={y} transform={`translate(0 ${y})`}>
            <path d="M-29 -2.5H-18V2.5H-29ZM29 -2.5H18V2.5H29Z" fill={EQ.fill2} />
            <path d="M-29 -4V4M29 -4V4" />
            {medium && y < 0 && <path d="M-28 0H-22M22 0H28" stroke={mediumColor(medium)} strokeWidth={EQ.sw * 0.8} />}
          </g>
        ))}
        <path d="M-16 -11H16L18 -8V8L16 11H-16L-18 8V-8Z" fill={EQ.fill2} />
        {plates.map((x) => (
          <path key={x} d={`M${x - 1} -11L${x + 1} -7L${x - 1} 0L${x + 1} 7L${x - 1} 11`} fill="none" strokeWidth={EQ.sw * 0.72} />
        ))}
        <path d="M-21 -16H-17V16H-21ZM17 -16H21V16H17Z" />
        {!compact && <path d="M-24 -13H24M-24 13H24" stroke={EQ.accent} strokeWidth={EQ.sw * 0.68} />}
      </g>
    </SymbolFrame>
  );
}
