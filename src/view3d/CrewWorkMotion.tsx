/** Projects short walk trails and real handoff pulses with the same camera as the crew. */
"use client";

import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
import { crewAvatar, useCrewStore } from "@/crew/crewStore";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import { walkPosition } from "@/crew/walkTiming";
import { projectToScreen } from "./gl/mat4";
import type { OverlayFrame } from "./Overlay";
import { toWorld } from "./parts";

export interface CrewWorkMotionHandle {
  update: (frame: OverlayFrame) => void;
}

const TRAIL = [0, 75, 150, 225, 300];

export default function CrewWorkMotion({ ref, invalidate }: { ref: Ref<CrewWorkMotionHandle>; invalidate: () => void }) {
  const recorded = useCrewStore((state) => state.handoffs);
  const [mountedAfter] = useState(() => recorded.at(-1)?.id ?? 0);
  const handoffs = useMemo(() => recorded.filter(({ id }) => id > mountedAfter), [recorded, mountedAfter]);
  const trails = useRef(new Map<CrewId, SVGPolylineElement>());
  const sparks = useRef(new Map<number, SVGGElement>());
  useLayoutEffect(invalidate, [invalidate, handoffs]);

  useImperativeHandle(ref, () => ({
    update({ viewProjection, width, height, now }) {
      const project = (x: number, y: number, elevation: number) =>
        projectToScreen(viewProjection, toWorld(x, y, elevation), width, height);
      for (const [id, element] of trails.current) {
        const avatar = crewAvatar(id);
        const { walk, speech } = avatar;
        if (!walk || !speech || speech.kind === "patrol") {
          element.removeAttribute("points");
          continue;
        }
        const points = TRAIL.map((lag) => {
          const { x, y } = walkPosition(walk, now - lag);
          return project(x, y, 0.15);
        });
        if (!points[0].visible) element.removeAttribute("points");
        else element.setAttribute("points", points.filter((p) => p.depth > 0).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
      }

      for (const { id, from, to } of handoffs) {
        const group = sparks.current.get(id);
        const spark = group?.querySelector("path");
        const burst = group?.querySelector("circle");
        if (!spark || !burst) continue;
        const a = project(from.x, from.y, 1);
        const b = project(to.x, to.y, 1);
        const mid = project((from.x + to.x) / 2, (from.y + to.y) / 2, 7);
        if (a.depth <= 0 || b.depth <= 0 || mid.depth <= 0) {
          spark.removeAttribute("d");
          burst.setAttribute("visibility", "hidden");
          continue;
        }
        spark.setAttribute("d", `M ${a.x} ${a.y} Q ${mid.x} ${mid.y} ${b.x} ${b.y}`);
        burst.setAttribute("visibility", "visible");
        burst.setAttribute("cx", `${b.x}`);
        burst.setAttribute("cy", `${b.y}`);
      }
    },
  }), [handoffs]);

  return <svg className="pw3d-work-motion" aria-hidden="true">
    {CREW_ORDER.map((id) => <polyline key={id} className="pw3d-work-trail" style={{ color: `var(${CREW[id].colorVar})` }}
      ref={(node) => { if (node) trails.current.set(id, node); else trails.current.delete(id); }} />)}
    {handoffs.map(({ id, fromCrew, crew }) => <g key={id} className="pw3d-work-handoff" data-handoff={`${fromCrew}:${crew}`}
      ref={(node) => { if (node) sparks.current.set(id, node); else sparks.current.delete(id); }}
      style={{ "--pw3d-spark": `var(${CREW[crew].colorVar})` } as CSSProperties}>
      <path pathLength={100} />
      <circle r={5} visibility="hidden" />
    </g>)}
  </svg>;
}
