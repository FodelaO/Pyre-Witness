/** Draws pipeline-backed room rankings, placement recommendations, and Inspector evidence. */
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { areaById, distance } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { DisplayedVisual, Handoff } from "./crewStore";
import type { CrewVisual } from "./director";
import type { Box } from "./floorLayout";
import { CREW } from "./types";

export function ArchitectureOverlay({ effect, twin, marker, label, scale }: {
  effect: CrewVisual; twin: Twin; marker: string; label: Box | null; scale: number;
}) {
  if (effect.kind === "ranked") {
    return <g className="pw-crew-ranked" aria-label="rules engine ranking">
      {effect.areas.map((id, index) => {
        const area = areaById(twin, id);
        if (!area) return null;
        const { x, y, w, h } = area.bounds;
        return <g key={id}>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={6} />
          <text x={x + 12} y={y + h - 12}>{index + 1} · rules engine ranking</text>
        </g>;
      })}
    </g>;
  }
  if (effect.kind !== "proposal") return null;
  const { from, to, area: id } = effect;
  const area = areaById(twin, id);
  const drawingLine = distance(from, to) > 18;
  return (
    <g className="pw-crew-proposal" aria-label={`Recommended area · ${area?.name ?? id}`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="m 1 1 8 4 -8 4" />
      </marker></defs>
      {area && <rect x={area.bounds.x + 4} y={area.bounds.y + 4} width={area.bounds.w - 8} height={area.bounds.h - 8} rx={6} />}
      <circle cx={from.x} cy={from.y} r={6} />
      {drawingLine && <path className="pw-crew-proposal-beam" d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} markerEnd={`url(#${marker})`} />}
      <circle cx={to.x} cy={to.y} r={11} />
      {label && <text className="pw-crew-proposal-caption" transform={`translate(${label.x} ${label.y}) scale(${scale})`}
        x={2} y={12}>Recommended placement</text>}
    </g>
  );
}

export function InspectionOverlay({ displayed, scale, label }: { displayed: DisplayedVisual; scale: number; label: Box | null }) {
  const { effect, walk } = displayed;
  const trace = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    if (walk) trace.current?.style.setProperty("--crew-trace-delay", `${Math.min(0, walk.waypoints[0].at - performance.now())}ms`);
  }, [walk]);
  if (effect.kind === "trace" && walk && walk.waypoints.length > 1) {
    const start = walk.waypoints[0].at;
    const duration = walk.end.at - start;
    const points = walk.waypoints.map(({ point }) => `${point.x},${point.y}`).join(" ");
    return (
      <g ref={trace} className="pw-crew-trace" data-phase={effect.phase} aria-label={`rules engine · ${effect.phase} · inspection route`}
        style={{ "--crew-trace-duration": `${duration}ms` } as CSSProperties}>
        <polyline points={points} pathLength={1} data-playing={duration > 0 || undefined} />
        {walk.waypoints.slice(1).map(({ at, point }, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={3 * scale}
            style={{ animationDelay: `calc(${at - start}ms + var(--crew-trace-delay, 0ms))` }} />
        ))}
      </g>
    );
  }
  if (effect.kind !== "check") return null;
  const lanes = new Map<string, number>();
  return (
    <g className="pw-crew-check" data-phase={effect.phase} aria-label={`rules engine · ${effect.phase}`}>
      {effect.stamps.map(({ point, assetId, ruleId }, index) => {
        const lane = lanes.get(assetId) ?? 0;
        lanes.set(assetId, lane + 1);
        const w = ruleId.length * 7 + 18;
        return (
          <g key={`${assetId}-${ruleId}-${index}`} transform={`translate(${point.x} ${point.y}) scale(${scale})`}
            className="pw-crew-stamp" aria-label={`${ruleId} · ${assetId}`}>
            <title>{ruleId} · {assetId}</title>
            <path d={`M 0 0 L 13 ${-11 - lane * 23} H 19`} />
            <rect x={19} y={-21 - lane * 23} width={w} height={20} rx={3} />
            <text x={28} y={-7 - lane * 23}>{ruleId}</text>
          </g>
        );
      })}
      {effect.passed && label && <g className="pw-crew-pass" aria-label="Rules check passed">
        <path className="pw-crew-pass-guide" d={`M ${effect.at.x} ${effect.at.y} L ${label.x + label.w / 2} ${label.y + label.h / 2}`} />
        <g className="pw-crew-pass-caption" transform={`translate(${label.x} ${label.y}) scale(${scale})`}>
          <rect width={label.w / scale} height={label.h / scale} rx={4} />
          <Check x={8} y={6} size={14} strokeWidth={3} />
          <text x={29} y={17}>Rules check passed</text>
        </g>
      </g>}
    </g>
  );
}

export function HandoffPulse({ handoff }: { handoff: Handoff }) {
  const { from, to, crew, fromCrew } = handoff;
  return (
    <g className="pw-crew-handoff" style={{ color: `var(${CREW[crew].colorVar})` }}
      aria-label={`${CREW[fromCrew].name} handed off to ${CREW[crew].name}`}>
      <path d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} pathLength={100} />
      <circle cx={to.x} cy={to.y} r={9} />
    </g>
  );
}
