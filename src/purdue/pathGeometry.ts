/** Projects existing risk-report steps onto diagram routes and marks crossed boundaries. */
import type { Point } from "@/twin/geometry";
import type { AttackPath, AttackStep } from "@/twin/types";
import { pathHasFocus } from "@/floor/twinFocus";
import { type ConduitRoute, conduitForStep } from "./conduits";
import type { Anchor, PurdueLayout } from "./layout";
import { center, wirePoints } from "./routing";

interface RiskSegment {
  key: string;
  points: Point[];
  techniques: Set<string>;
  breaches: Point[];
  emphasis: "selected" | "normal" | "muted";
}

function crossing(points: readonly Point[], y: number): Point | undefined {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.y === b.y || y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue;
    return { x: a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y), y };
  }
}

function throughGate(a: Anchor, b: Anchor, step: AttackStep, route?: ConduitRoute): Point[] {
  if (!route) return wirePoints(a, b);
  if (route.fromId === step.from && route.toId === step.to) return route.points;
  if (route.fromId === step.to && route.toId === step.from) return route.points.slice().reverse();
  const gate = { ...route.gate, w: 0, h: 0 };
  return [...wirePoints(a, gate), ...wirePoints(gate, b).slice(1)];
}

/** Keep a known cross-tier bypass from visually intersecting unrelated equipment. */
function aroundEquipment(layout: PurdueLayout, a: Anchor, b: Anchor): Point[] {
  const direction = Math.sign(b.y - a.y);
  const start = { x: center(a).x, y: direction > 0 ? a.y + a.h : a.y };
  const end = { x: center(b).x, y: direction > 0 ? b.y : b.y + b.h };
  const lane = layout.diagramRight - 8 - (Math.round(start.x / 24) % 3) * 5;
  const startY = start.y + direction * 7;
  const endY = end.y - direction * 7;
  return [start, { x: start.x, y: startY }, { x: lane, y: startY }, { x: lane, y: endY }, { x: end.x, y: endY }, end];
}

export function buildRiskSegments(
  layout: PurdueLayout,
  routes: readonly ConduitRoute[],
  paths: readonly AttackPath[],
  focused: ReadonlySet<string>,
): RiskSegment[] {
  const dmz = layout.bands.find(({ level }) => level === 3.5);
  const segments = new Map<string, RiskSegment>();
  for (const path of paths) {
    const emphasis = !focused.size ? "normal" : pathHasFocus(path, focused) ? "selected" : "muted";
    for (const step of path.steps) {
      const a = layout.anchors.get(step.from);
      const b = layout.anchors.get(step.to);
      if (!a || !b || step.from === step.to) continue;
      const network = step.via === "network" || step.via === "internet" || step.via === "remote";
      const route = network ? conduitForStep(routes, step.from, step.to, a, b) : undefined;
      const key = JSON.stringify([step.from, step.to, route?.conduit.id]);
      const existing = segments.get(key);
      if (existing) {
        if (emphasis === "selected" && existing.emphasis !== emphasis) {
          existing.emphasis = emphasis;
          existing.techniques.clear();
        }
        if (existing.emphasis === emphasis && step.technique) existing.techniques.add(step.technique.id);
        continue;
      }

      const skipsDmz = a.level !== undefined && b.level !== undefined
        && Math.min(a.level, b.level) < 3.5 && Math.max(a.level, b.level) > 3.5;
      let points = !route && skipsDmz ? aroundEquipment(layout, a, b) : throughGate(a, b, step, route);
      if (!points.length) {
        // Multiple steps can start and end inside the same collapsed field group.
        const { x } = center(a);
        points = [
          { x: x - 7, y: a.y }, { x: x - 7, y: a.y - 8 },
          { x: x + 7, y: a.y - 8 }, { x: x + 7, y: a.y },
        ];
      }
      const breaches: Point[] = [];
      if (route && !route.conduit.enforcedBy) breaches.push(route.gate);
      if (dmz && a.level !== undefined && b.level !== undefined) {
        const top = (a.level > 3.5) !== (b.level > 3.5) ? crossing(points, dmz.y) : undefined;
        const bottom = (a.level < 3.5) !== (b.level < 3.5) ? crossing(points, dmz.y + dmz.h) : undefined;
        if (top) breaches.push(top);
        if (bottom) breaches.push(bottom);
      }
      segments.set(key, { key, points, breaches, techniques: new Set(step.technique ? [step.technique.id] : []), emphasis });
    }
  }
  return Array.from(segments.values()).sort((a, b) =>
    Number(a.emphasis === "selected") - Number(b.emphasis === "selected"),
  );
}

export function routeLabelPoint(points: readonly Point[]): Point {
  let longest = -1;
  let point = points[0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(a.x - b.x, a.y - b.y);
    if (length <= longest) continue;
    longest = length;
    point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  return point;
}
