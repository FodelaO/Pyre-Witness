/** Quietly shows distinct, existing digital exposure segments from the live rules report. */
"use client";

import { memo, useMemo } from "react";
import { nodePosition } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";

export default memo(function LensReviewRisk({ twin }: { twin: Twin }) {
  const paths = useTwinStore((state) => state.risk.paths);
  const focus = useTwinStore((state) => state.hoveredId ?? state.selectedId);
  const segments = useMemo(() => {
    const segments = new Map<string, { d: string; related: Set<string> }>();
    for (const path of paths) {
      const related = new Set([path.target, path.entry, ...path.steps.flatMap((step) => [step.from, step.to])]);
      for (const step of path.steps) {
        if (step.via === "physical" || step.via === "process") continue;
        const from = nodePosition(twin, step.from);
        const to = nodePosition(twin, step.to);
        if (!from || !to || (from.x === to.x && from.y === to.y)) continue;
        const key = `${step.from}:${step.to}`;
        const existing = segments.get(key);
        if (existing) {
          for (const id of related) existing.related.add(id);
          continue;
        }
        segments.set(key, { d: `M${from.x} ${from.y}L${to.x} ${to.y}`, related: new Set(related) });
      }
    }
    return Array.from(segments);
  }, [paths, twin]);

  return (
    <g className="pwl-review-exposures lens-data-only" pointerEvents="none" aria-label="Simulated exposure paths">
      {segments.map(([key, segment]) => (
        <path key={key} d={segment.d} data-active={focus !== null && segment.related.has(focus) || undefined} />
      ))}
    </g>
  );
});
