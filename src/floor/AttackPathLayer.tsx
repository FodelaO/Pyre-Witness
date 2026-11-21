/** Visualizes the risk report's existing paths on the fictional floor plan. */
import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LensMode } from "@/layers/lensStore";
import { useRunStore } from "@/pipeline/runStore";
import { containsPoint, distance, entryPointById, nodePosition, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { MEDIA, type Asset, type AttackPath, type AttackStep, type Twin } from "@/twin/types";
import { isClear, screenLabelBox, type LabelBox } from "./labelPlacement";
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
  points: Point[];
  from: Point;
  to: Point;
  paths: Set<AttackPath>;
}

const floorMarks = [
  ".pw-floor-asset-tag", ".pw-floor-asset-reading", ".pw-floor-tank-level",
  ".pw-floor-zone-label-back", ".pw-floor-zone-chip rect", ".pw-floor-entry text",
  ".pw-floor-pipe-label", ".pw-lens-zone-label", ".pw-lens-digital-entry text",
  ".pw-lens-protocol rect", ".pw-lens-vuln", ".pw-lens-software rect",
  ".pw-floor-caption", ".pw-floor-tag-anchor",
].join(", ");

function reserveFloorMarks(pane: Element): LabelBox[] {
  return Array.from(pane.querySelectorAll(floorMarks)).flatMap((mark) => {
    const { visibility, opacity } = getComputedStyle(mark);
    if (mark.closest('.pw-lens-data[aria-hidden="true"]') || visibility === "hidden") return [];
    if (mark.matches(".pw-floor-asset-tag") && opacity === "0" &&
      !mark.closest(".pw-floor-asset")?.matches(':focus-visible, [data-tag-focus]')) return [];
    const { x, y, width, height } = mark.getBoundingClientRect();
    return width && height ? [{ x, y, w: width, h: height }] : [];
  });
}

function project({ x, y }: Point, { a, b, c, d, e, f }: DOMMatrixReadOnly): Point {
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

function placeTechniqueLabels(segments: [string, Segment][], matrix: DOMMatrix, occupied: LabelBox[]) {
  const labels = new Map<string, Point>();
  const inverse = matrix.inverse();
  const techniquePositions = new Map<string, Point[]>();
  for (const [key, segment] of segments) {
    const technique = segment.step.technique;
    if (!technique) continue;
    const nearby = techniquePositions.get(technique.id) ?? [];
    if (nearby.some((point) => distance(point, segment.label) < 140)) continue;
    const legs = segment.points.slice(1).map((end, i) => {
      const start = segment.points[i];
      return { start, end, length: distance(start, end) };
    }).sort((a, b) => b.length - a.length);
    const anchors = legs.flatMap(({ start, end }) => [0.5, 0.3, 0.7, 0.15, 0.85].map((at) => ({
      x: start.x + (end.x - start.x) * at,
      y: start.y + (end.y - start.y) * at,
    })));
    const positions = [segment.label, ...anchors].flatMap((point) => {
      const { x, y } = project(point, matrix);
      const side = screenLabelBox(x, y, technique.id).w / 2 + 4;
      return [{ x, y: y - 5 }, { x, y: y + 14 }, { x: x + side, y: y + 3 }, { x: x - side, y: y + 3 }];
    });
    const box = positions.map(({ x, y }) => screenLabelBox(x, y, technique.id))
      .find((box) => isClear(box, occupied, 3));
    if (!box) continue;
    occupied.push(box);
    labels.set(key, project({ x: box.x + box.w / 2, y: box.y + 9 }, inverse));
    nearby.push(segment.label);
    techniquePositions.set(technique.id, nearby);
  }
  return labels;
}

export default memo(function AttackPathLayer({ twin, focused, scale, lens }: {
  twin: Twin; focused: ReadonlySet<string>; scale: number; lens: LensMode;
}) {
  const paths = useTwinStore((state) => state.risk.paths);
  const captured = useRunStore((state) => state.placedAssetId);
  const arrow = `${useId()}-risk-arrow`;
  const group = useRef<SVGGElement>(null);
  const [labels, setLabels] = useState<ReadonlyMap<string, Point>>(() => new Map());

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
        byStep.set(key, { step, from, to, d, points, label: routeMidpoint(points), paths: new Set([path]) });
      }
    }

    return [...byStep.entries()];
  }, [twin, paths]);

  const [dim, emphasized] = useMemo(() => {
    const active = new Set(paths.filter((path) => (captured && path.causedBy === captured) || pathHasFocus(path, focused)));
    const dim: typeof segments = [];
    const emphasized: typeof segments = [];
    for (const [key, segment] of segments) {
      if ([...segment.paths].some((path) => active.has(path))) emphasized.push([key, segment]);
      else dim.push([key, segment]);
    }
    return [dim, emphasized];
  }, [segments, paths, focused, captured]);

  useLayoutEffect(() => {
    const world = group.current?.closest<SVGGElement>(".pw-floor-world");
    const pane = world?.closest(".pw-plant-floor");
    if (!world || !pane || lens === "material" || !emphasized.length) return;
    let frame = 0;
    const place = () => {
      const matrix = world.getScreenCTM();
      if (matrix?.a && getComputedStyle(world).visibility !== "hidden") {
        setLabels(placeTechniqueLabels(emphasized, matrix, reserveFloorMarks(pane)));
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const afterZoom = (event: TransitionEvent) => {
      if (event.target === world && event.propertyName === "transform") schedule();
    };
    const observer = new MutationObserver(schedule);
    if (pane.parentElement) observer.observe(pane.parentElement, { attributes: true, attributeFilter: ["data-view3d"] });
    for (const data of world.querySelectorAll(".pw-lens-data")) {
      observer.observe(data, { childList: true, subtree: true, attributes: true, attributeFilter: ["transform", "aria-hidden"] });
    }
    world.addEventListener("transitionend", afterZoom);
    world.addEventListener("focusin", schedule);
    world.addEventListener("focusout", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      world.removeEventListener("transitionend", afterZoom);
      world.removeEventListener("focusin", schedule);
      world.removeEventListener("focusout", schedule);
    };
  }, [emphasized, scale, lens]);

  if (!segments.length) return null;
  return (
    <g ref={group} className="pw-floor-attacks" pointerEvents="none" role="group" aria-label="Simulated attack paths">
      <defs>
        <marker id={arrow} viewBox="0 0 9 8" refX={8} refY={4} markerWidth={4.5} markerHeight={4} orient="auto">
          <path className="pw-floor-attack-arrow" d="M0 0 9 4 0 8 2 4Z" />
        </marker>
      </defs>
      {dim.map(([key, segment]) => (
        <path key={key} className="pw-floor-attack-route pw-floor-attack-base" d={segment.d} data-via={segment.step.via} />
      ))}
      {emphasized.map(([key, segment]) => {
        const label = labels.get(key);
        return (
          <g key={key} className="pw-floor-attack" data-via={segment.step.via} data-emphasis="selected">
            {segment.step.via === "rf" && <RadioWaves from={segment.from} to={segment.to} />}
            <path className="pw-floor-attack-route" d={segment.d} markerEnd={`url(#${arrow})`} />
            {segment.step.technique && label && (
              <g transform={`translate(${label.x} ${label.y})`}>
                <text className="pw-floor-attack-technique pw-floor-screen-label" textAnchor="middle">{segment.step.technique.id}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});
