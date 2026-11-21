/** Visualizes the risk report's existing paths on the fictional floor plan. */
import { memo, useId, useMemo } from "react";
import { containsPoint, distance, entryPointById, nodePosition, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { MEDIA, type Asset, type AttackPath, type AttackStep, type Twin } from "@/twin/types";
import { chooseLabelBox, type LabelBox } from "./labelPlacement";
import { roundedPath, routeMidpoint, routePoints } from "./routing";
import { pathHasFocus } from "./twinFocus";

function connectionRoute(assets: ReadonlyMap<string, Asset>, step: AttackStep, from: Point, to: Point): Point[] {
  const mediumMatches = (medium: keyof typeof MEDIA) => step.via === "network" ? medium === "network" : MEDIA[medium].process;
  const forward = assets.get(step.from)?.physical.connections.find((line) => line.to === step.to && mediumMatches(line.medium));
  if (forward) return routePoints(from, to, forward.via);
  const reverse = assets.get(step.to)?.physical.connections.find((line) => line.to === step.from && mediumMatches(line.medium));
  if (reverse) return routePoints(to, from, reverse.via).reverse();
  return routePoints(from, to);
}

function pointsFor(step: AttackStep, twin: Twin, assets: ReadonlyMap<string, Asset>, from: Point, to: Point): Point[] {
  switch (step.via) {
    case "rf":
      return [from, to];
    case "network":
    case "process":
      return connectionRoute(assets, step, from, to);
    case "physical":
    case "usb": {
      const corridor = twin.areas.find((area) => area.id === "visitor_corridor");
      if (corridor && containsPoint(corridor, from.x, from.y)) {
        const { x, y, w, h } = corridor.bounds;
        const centerY = y + h / 2;
        const exitX = Math.max(x, Math.min(x + w, to.x));
        return routePoints(from, to, [[from.x, centerY], [exitX, centerY], [exitX, to.y]]);
      }
      return routePoints(from, to);
    }
    case "internet":
    case "remote": {
      const entry = entryPointById(twin, step.from) ?? entryPointById(twin, step.to);
      const wall = twin.plant.building.y;
      if (entry && entry.y < wall) {
        const riser = (entry.y + wall) / 2;
        return routePoints(from, to, [[from.x, riser], [to.x, riser]]);
      }
      return routePoints(from, to, [[from.x, to.y]]);
    }
  }
}

function finishBeforeTarget(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const to = points[points.length - 1];
  const previous = points[points.length - 2];
  const length = distance(previous, to);
  if (length === 0) return points;
  const inset = Math.min(11, length / 3) / length;
  return [...points.slice(0, -1), { x: to.x + (previous.x - to.x) * inset, y: to.y + (previous.y - to.y) * inset }];
}

function RadioWaves({ from, to }: { from: Point; to: Point }) {
  const radius = distance(from, to);
  const orientation = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  const angle = Math.min(0.27, 58 / radius);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const d = `M${x} ${-y} A${radius} ${radius} 0 0 1 ${x} ${y}`;
  return (
    <g transform={`translate(${from.x} ${from.y}) rotate(${orientation})`}>
      <path className="pw-floor-rf-wave" d={d} />
      <path className="pw-floor-rf-wave pw-floor-rf-wave-next" d={d} />
    </g>
  );
}

interface Segment {
  step: AttackStep;
  d: string;
  label: Point;
  techniqueLabel?: Point;
  from: Point;
  to: Point;
  paths: Set<AttackPath>;
}

function placeTechniqueLabels(segments: Segment[]) {
  const occupied: LabelBox[] = [];
  const techniquePositions = new Map<string, Point[]>();
  for (const segment of segments) {
    const technique = segment.step.technique;
    if (!technique) continue;
    const nearby = techniquePositions.get(technique.id) ?? [];
    if (nearby.some((point) => distance(point, segment.label) < 140)) continue;
    const w = technique.id.length * 12 + 8;
    const h = 24;
    const { x, y } = segment.label;
    const at = (dx: number, dy: number): LabelBox => ({ x: x - w / 2 + dx, y: y - h + dy, w, h });
    const box = chooseLabelBox(at(0, -7), [at(0, -21), at(0, 11), at(14, -35), at(-14, 25)], occupied);
    occupied.push(box);
    segment.techniqueLabel = { x: box.x + w / 2, y: box.y + h };
    nearby.push(segment.label);
    techniquePositions.set(technique.id, nearby);
  }
}

export default memo(function AttackPathLayer({ twin, focused }: { twin: Twin; focused: ReadonlySet<string> }) {
  const paths = useTwinStore((state) => state.risk.paths);
  const arrow = `${useId()}-risk-arrow`;

  const segments = useMemo(() => {
    const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
    const byStep = new Map<string, Segment>();

    for (const path of paths) {
      for (const step of path.steps) {
        const key = JSON.stringify([step.from, step.to, step.via, step.technique?.id]);
        const existing = byStep.get(key);
        if (existing) {
          existing.paths.add(path);
          continue;
        }
        const from = nodePosition(twin, step.from);
        const to = nodePosition(twin, step.to);
        if (!from || !to || distance(from, to) === 0) continue;

        const points = finishBeforeTarget(pointsFor(step, twin, assets, from, to));
        const d = roundedPath(points, 9);
        if (!d) continue;
        byStep.set(key, { step, from, to, d, label: routeMidpoint(points), paths: new Set([path]) });
      }
    }

    return [...byStep.entries()];
  }, [twin, paths]);

  const [dim, emphasized] = useMemo(() => {
    const active = new Set(paths.filter((path) => pathHasFocus(path, focused)));
    const dim: typeof segments = [];
    const emphasized: typeof segments = [];
    for (const [key, segment] of segments) {
      if ([...segment.paths].some((path) => active.has(path))) emphasized.push([key, { ...segment }]);
      else dim.push([key, segment]);
    }
    placeTechniqueLabels(emphasized.map(([, segment]) => segment));
    return [dim, emphasized];
  }, [segments, paths, focused]);

  if (!segments.length) return null;
  return (
    <g className="pw-floor-attacks" pointerEvents="none" role="group" aria-label="Simulated attack paths">
      <defs>
        <marker id={arrow} viewBox="0 0 9 8" refX={8} refY={4} markerWidth={4.5} markerHeight={4} orient="auto">
          <path className="pw-floor-attack-arrow" d="M0 0 9 4 0 8 2 4Z" />
        </marker>
      </defs>
      {dim.map(([key, segment]) => (
        <path key={key} className="pw-floor-attack-route pw-floor-attack-base" d={segment.d} data-via={segment.step.via} />
      ))}
      {emphasized.map(([key, segment]) => (
        <g key={key} className="pw-floor-attack" data-via={segment.step.via} data-emphasis="selected">
          {segment.step.via === "rf" && <RadioWaves from={segment.from} to={segment.to} />}
          <path className="pw-floor-attack-route" d={segment.d} markerEnd={`url(#${arrow})`} />
          {segment.step.technique && segment.techniqueLabel && (
            <g transform={`translate(${segment.techniqueLabel.x} ${segment.techniqueLabel.y})`}>
              <text className="pw-floor-attack-technique pw-floor-screen-label" textAnchor="middle">{segment.step.technique.id}</text>
            </g>
          )}
        </g>
      ))}
    </g>
  );
});
