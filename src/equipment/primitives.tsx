/**
 * Shared drawing primitives for every equipment symbol, so 29 kinds read as ONE system:
 * same stroke weights, same selection halo, same placement outline, same tag typography.
 * Shared contract — see AGENTS.md. Symbols are drawn centred on (0,0) in floor units.
 */
import type { ReactNode } from "react";
import { MEDIA, type AssetStatus, type Medium } from "@/twin/types";
import type { EquipmentProps } from "./types";
import "./equipment.css";

export const EQ = {
  stroke: "var(--pw-eq-stroke)",
  fill: "var(--pw-eq-fill)",
  fill2: "var(--pw-eq-fill-2)",
  accent: "var(--pw-eq-accent)",
  dim: "var(--pw-text-dim)",
  faint: "var(--pw-text-faint)",
  /** Base stroke width. Use sw * 0.7 for details, sw * 1.5 for emphasis. */
  sw: 1.25,
  mono: "var(--font-geist-mono), ui-monospace, monospace",
} as const;

export function mediumColor(medium?: Medium, fallback = "var(--pw-eq-stroke)"): string {
  return medium ? `var(${MEDIA[medium].cssVar})` : fallback;
}

/** Colour for an abnormal state, or null when normal (ISA-101: no colour when all is well). */
export function statusColor(status?: AssetStatus): string | null {
  switch (status) {
    case "attention":
      return "var(--pw-attention)";
    case "alarm":
      return "var(--pw-alarm)";
    case "offline":
      return "var(--pw-text-faint)";
    default:
      return null;
  }
}

interface FrameProps {
  /** Footprint of the symbol (use FOOTPRINT[kind]). */
  w: number;
  h: number;
  /** Pass the component's props straight through. */
  props: EquipmentProps;
  children: ReactNode;
  /** Round halo for circular symbols (tanks, filler, instruments). */
  round?: boolean;
}

/**
 * Wrap every symbol in this. It draws, around the symbol body:
 *  - selection halo (solid) / linked-highlight halo (dashed)
 *  - placement outline: green = recommended spot, red pulsing = unsafe spot
 *  - abnormal-state ring (attention / alarm)
 *  - the tag and optional capacity label underneath (hidden when compact)
 */
export function SymbolFrame({ w, h, props, children, round }: FrameProps) {
  const { selected, highlighted, placement, status, label, capacityLabel, compact } = props;
  const pad = 6;
  const state = statusColor(status);
  const placementColor =
    placement === "recommended" ? "var(--pw-ok)" : placement === "unsafe" ? "var(--pw-alarm)" : null;

  const outline = (color: string, extra: number, className?: string, dash?: string, width = 1.2) =>
    round ? (
      <ellipse
        rx={w / 2 + pad + extra}
        ry={h / 2 + pad + extra}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
        className={className}
      />
    ) : (
      <rect
        x={-w / 2 - pad - extra}
        y={-h / 2 - pad - extra}
        width={w + 2 * (pad + extra)}
        height={h + 2 * (pad + extra)}
        rx={6 + extra}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
        className={className}
      />
    );

  return (
    <g opacity={status === "offline" ? 0.55 : 1}>
      {placementColor && outline(placementColor, 3, placement === "unsafe" ? "pw-pulse" : undefined, undefined, 1.6)}
      {state && status !== "offline" && outline(state, 0, status === "alarm" ? "pw-pulse" : undefined)}
      {highlighted && !selected && outline("var(--pw-eq-accent)", 1, undefined, "3 3", 1)}
      {selected && outline("var(--pw-eq-accent)", 1, undefined, undefined, 1.4)}
      {children}
      {!compact && label && (
        <text
          y={h / 2 + 12}
          textAnchor="middle"
          fontSize={8.5}
          fontFamily={EQ.mono}
          fill={selected ? "var(--pw-eq-accent)" : "var(--pw-text-dim)"}
          style={{ letterSpacing: "0.04em" }}
        >
          {label}
        </text>
      )}
      {!compact && capacityLabel && (
        <text y={h / 2 + 22} textAnchor="middle" fontSize={7} fontFamily={EQ.mono} fill="var(--pw-text-faint)">
          {capacityLabel}
        </text>
      )}
    </g>
  );
}
