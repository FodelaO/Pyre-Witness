/**
 * Temporary placeholder symbol used by kind stubs until the real parametric component lands.
 * Draws the footprint as a dashed outline with the tag. Not a final design ("no plain boxes").
 */
import type { EquipmentKind } from "@/twin/types";
import { FOOTPRINT, type EquipmentProps } from "./types";

export function Fallback({ kind, label, selected, placement }: EquipmentProps & { kind: EquipmentKind }) {
  const { w, h } = FOOTPRINT[kind];
  const stroke =
    placement === "unsafe"
      ? "var(--pw-alarm)"
      : placement === "recommended"
        ? "var(--pw-ok)"
        : selected
          ? "var(--pw-eq-accent)"
          : "var(--pw-eq-stroke)";
  return (
    <g>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={4}
        fill="var(--pw-eq-fill)"
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <text
        y={h / 2 + 11}
        textAnchor="middle"
        fontSize={8}
        fill="var(--pw-text-dim)"
        fontFamily="var(--font-geist-mono), monospace"
      >
        {label ?? kind}
      </text>
    </g>
  );
}
