/**
 * Attack paths as glowing arcs hopping asset to asset. The paths come from the rules engine
 * (`risk.paths`) and the current run's self-check; nothing here invents a path.
 */
import type { AttackPath, AttackVia } from "@/twin/types";
import { PATTERN } from "./gl/shaders";
import { segmentMatrix, type Vec3 } from "./gl/mat4";
import type { Palette } from "./palette";
import { tube, type Part } from "./parts";
import { arcPoints, type Scene } from "./scene";

export interface ArcSegment {
  key: string;
  from: string;
  to: string;
  via: AttackVia;
  /** Earliest position of this hop in any path that uses it: drives the progressive draw. */
  hop: number;
  severity: number;
  paths: AttackPath[];
}

/** Same emphasis rule as the 2D floor: paths opened by the placed device or touching the focus. */
export function pathIsActive(path: AttackPath, focus: ReadonlySet<string>, placedAssetId: string | null): boolean {
  if (placedAssetId && path.causedBy === placedAssetId) return true;
  if (path.causedBy !== undefined && focus.has(path.causedBy)) return true;
  if (focus.has(path.entry) || focus.has(path.target)) return true;
  return path.steps.some(({ from, to }) => focus.has(from) || focus.has(to));
}

/** Union of path lists by id (rules-engine report first, then the run's self-check). */
export function mergePaths(...lists: ReadonlyArray<readonly AttackPath[] | null | undefined>): AttackPath[] {
  const byId = new Map<string, AttackPath>();
  for (const list of lists) for (const path of list ?? []) if (!byId.has(path.id)) byId.set(path.id, path);
  return [...byId.values()];
}

/** Unique hops across all paths. */
export function attackSegments(paths: readonly AttackPath[]): ArcSegment[] {
  const byKey = new Map<string, ArcSegment>();
  for (const path of paths) {
    path.steps.forEach((step, index) => {
      if (step.from === step.to) return;
      const key = step.from + ">" + step.to + ">" + step.via;
      const known = byKey.get(key);
      if (known) {
        known.hop = Math.min(known.hop, index);
        known.severity = Math.max(known.severity, path.severity);
        known.paths.push(path);
      } else {
        byKey.set(key, { key, from: step.from, to: step.to, via: step.via, hop: index, severity: path.severity, paths: [path] });
      }
    });
  }
  return [...byKey.values()];
}

const ARC_STEPS = 14;

function topOf(scene: Scene, id: string): Vec3 | null {
  const node = scene.byId.get(id);
  if (!node || (node.type !== "asset" && node.type !== "entry")) return null;
  return [node.center[0], node.height + 0.25, node.center[2]];
}

export function arcParts(
  segments: readonly ArcSegment[],
  scene: Scene,
  emphasised: ReadonlySet<string>,
  birthOf: (key: string) => number,
  pal: Palette,
  prominence = 1,
): Part[] {
  const parts: Part[] = [];
  for (const segment of segments) {
    const a = topOf(scene, segment.from);
    const b = topOf(scene, segment.to);
    if (!a || !b) continue;
    const strong = emphasised.has(segment.key);
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const points = arcPoints(a, b, Math.min(13, 2.2 + span * 0.14), ARC_STEPS);
    const radius = strong ? 0.15 : 0.05;
    const alpha = prominence * (strong ? 1 : 0.5);
    const birth = birthOf(segment.key);
    for (let i = 1; i < points.length; i++) {
      const part = tube(points[i - 1], points[i], radius, {
        color: pal.alarm, alpha, emissive: 1, pattern: PATTERN.arc, param: segment.hop + (i - 1) / ARC_STEPS, layer: "glow",
      });
      part.pivot = [birth, 0];
      parts.push(part);
      if (strong) {
        const halo = tube(points[i - 1], points[i], radius * 2.6, {
          color: pal.alarm, alpha: 0.16 * prominence, emissive: 1, pattern: PATTERN.arc, param: segment.hop + (i - 1) / ARC_STEPS, layer: "glow",
        });
        halo.pivot = [birth, 0];
        parts.push(halo);
      }
    }
    if (strong) {
      // Arrow head at the target end shows the direction of the hop.
      const tip = points[points.length - 1];
      const before = points[points.length - 2];
      const length = Math.hypot(tip[0] - before[0], tip[1] - before[1], tip[2] - before[2]) || 1;
      const back: Vec3 = [
        tip[0] + ((before[0] - tip[0]) / length) * 1.1,
        tip[1] + ((before[1] - tip[1]) / length) * 1.1,
        tip[2] + ((before[2] - tip[2]) / length) * 1.1,
      ];
      const head = tube(back, tip, 0.36, { color: pal.alarm, alpha: prominence, emissive: 1, pattern: PATTERN.arc, param: segment.hop + 0.95, layer: "glow" });
      head.prim = "cone";
      head.m = segmentMatrix(back, tip, 0.36);
      head.pivot = [birth, 0];
      parts.push(head);
    }
  }
  return parts;
}
