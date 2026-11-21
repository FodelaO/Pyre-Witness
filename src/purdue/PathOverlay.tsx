/** Animates existing attack paths and annotates technique and boundary crossings. */
import { useId, useMemo } from "react";
import { isClear } from "@/floor/labelPlacement";
import type { AttackPath } from "@/twin/types";
import type { ConduitRoute } from "./conduits";
import type { Box, PurdueLayout } from "./layout";
import { buildRiskSegments, routeLabelPoint } from "./pathGeometry";
import { wirePath } from "./routing";

interface PathOverlayProps {
  layout: PurdueLayout;
  routes: ConduitRoute[];
  paths: AttackPath[];
  focused: ReadonlySet<string>;
}

export function PathOverlay({ layout, routes, paths, focused }: PathOverlayProps) {
  const arrow = useId();
  const segments = useMemo(() => buildRiskSegments(layout, routes, paths, focused), [layout, routes, paths, focused]);
  const labels = useMemo(() => {
    const labels: { text: string; box: Box; emphasis: string; key: string }[] = [];
    const obstacles: Box[] = [
      ...layout.cards, ...layout.fieldGroups, ...layout.entries,
      ...routes.map(({ gate, conduit, enforcerKind }) => {
        const name = layout.compact && enforcerKind === "network_switch" ? "" : conduit.enforcedBy ?? "";
        const w = 24 + (name ? name.length * 5.5 + 3 : 0);
        return { x: gate.x - w / 2, y: gate.y - 10, w, h: 20 };
      }),
    ];
    const shown = new Map<number, Set<string>>();
    for (const segment of segments.slice().reverse()) {
      if (segment.emphasis !== "selected" || !segment.techniques.size) continue;
      const { x, y } = routeLabelPoint(segment.points);
      for (const offset of [-9, 12, -24, 27]) {
        const top = Math.max(1, Math.min(layout.height - 16, y + offset - 6));
        const lane = layout.bands.findIndex(({ y, h }) => top + 6.5 >= y && top + 6.5 < y + h);
        const seen = shown.get(lane) ?? new Set<string>();
        const techniques = [...segment.techniques].filter((technique) => !seen.has(technique));
        if (!techniques.length) continue;
        const text = techniques.join(" · ");
        const w = text.length * 5.7 + 8;
        const box = {
          x: Math.max(layout.railWidth + 4, Math.min(layout.width - w - 3, x - w / 2)),
          y: top,
          w,
          h: 13,
        };
        if (!isClear(box, obstacles, 1)) continue;
        labels.push({ text, box, emphasis: segment.emphasis, key: segment.key });
        obstacles.push(box);
        for (const technique of techniques) seen.add(technique);
        shown.set(lane, seen);
        break;
      }
    }
    return labels;
  }, [layout, routes, segments]);

  return (
    <>
      <svg className="pw-purdue-attacks" width={layout.width} height={layout.height} aria-hidden="true">
        <defs>
          <marker id={arrow} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" viewBox="0 0 5 5">
            <path d="M0 0 5 2.5 0 5 1.4 2.5Z" fill="var(--pw-alarm)" />
          </marker>
        </defs>
        {segments.map(({ key, points, emphasis }) => (
          <path key={key} d={wirePath(points)} data-emphasis={emphasis} markerEnd={emphasis === "selected" ? `url(#${arrow})` : undefined} />
        ))}
      </svg>
      <svg className="pw-purdue-attack-marks" width={layout.width} height={layout.height} aria-hidden="true">
        {segments.filter(({ emphasis }) => emphasis === "selected").flatMap(({ key, breaches, emphasis }) => breaches.map(({ x, y }, index) => (
          <g className="pw-purdue-breach" key={`${key}:${index}`} transform={`translate(${x} ${y})`} data-emphasis={emphasis}>
            <circle r="8" />
            <path d="M-5 4 0 -3 1 1 5 -4" />
          </g>
        )))}
        {labels.map(({ key, box, text, emphasis }) => (
          <g className="pw-purdue-technique" key={key} transform={`translate(${box.x} ${box.y})`} data-emphasis={emphasis}>
            <rect width={box.w} height={box.h} rx="3" />
            <text x={box.w / 2} y="9.3" textAnchor="middle">{text}</text>
          </g>
        ))}
      </svg>
    </>
  );
}
