/** Builds depth-tested floor highlights, recommendation arrows and recorded inspection arcs. */
import type { DisplayedVisual } from "@/crew/crewStore";
import type { CrewVisual } from "@/crew/director";
import { areaById, type Point } from "@/twin/geometry";
import type { Area, AttackPath, Twin } from "@/twin/types";
import type { Vec3 } from "./gl/mat4";
import { PATTERN } from "./gl/shaders";
import type { Palette, Rgb } from "./palette";
import { toWorld, tube, UNITS_PER_METRE, worldPart, type Part } from "./parts";
import { arcPoints, type Scene } from "./scene";
import { traceDuration } from "./crewWork";

function floorHighlight({ x, y, w, h }: Area["bounds"], color: Rgb, alpha: number): Part[] {
  const at = toWorld(x + w / 2, y + h / 2, 0.16);
  const width = w / UNITS_PER_METRE - 0.65;
  const depth = h / UNITS_PER_METRE - 0.65;
  const border = 0.24;
  const style = { color, emissive: 1 };
  const parts = [worldPart("quad", at, [width, 1, depth], { ...style, alpha })];
  for (const side of [-1, 1]) {
    parts.push(worldPart("quad", [at[0], at[1], at[2] + side * depth / 2], [width, 1, border], { ...style, alpha: 0.8 }));
    parts.push(worldPart("quad", [at[0] + side * width / 2, at[1], at[2]], [border, 1, depth], { ...style, alpha: 0.8 }));
  }
  return parts;
}

export function architectureParts(effect: CrewVisual | undefined, twin: Twin, palette: Palette, proposalPoint?: Point, held = false): Part[] {
  if (effect?.kind === "ranked") return effect.areas.flatMap((id, rank) => {
    const area = areaById(twin, id);
    return area ? floorHighlight(area.bounds, palette.info, 0.2 - rank * 0.035) : [];
  });
  if (effect?.kind !== "proposal") return [];
  const area = areaById(twin, effect.area);
  if (!area) return [];
  if (held) return floorHighlight(area.bounds, palette.attention, 0.13);
  const parts = floorHighlight(area.bounds, palette.ok, 0.13);
  const from = toWorld(effect.from.x, effect.from.y, 1.2);
  const { x, y } = proposalPoint ?? effect.to;
  const to = toWorld(x, y, 1.2);
  const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const color = palette.ok;
  parts.push(worldPart("quad", toWorld(x, y, 0.19), [5.2, 1, 5.2], {
    color, alpha: 0.9, emissive: 1, pattern: PATTERN.statusRing,
  }));
  if (span < 1) return parts;
  const points = arcPoints(from, to, Math.min(6, 1 + span / 8), 18);
  const beforeTip = points[points.length - 2];
  const tip = points[points.length - 1];
  const style = { color, emissive: 1, layer: "glow" } as const;
  for (let i = 1; i < points.length - 1; i++) {
    parts.push(tube(points[i - 1], points[i], 0.32, style));
    parts.push(tube(points[i - 1], points[i], 0.7, { ...style, alpha: 0.18 }));
  }
  const head = tube(beforeTip, tip, Math.min(0.85, span * 0.3), style);
  head.prim = "cone";
  parts.push(head);
  return parts;
}

/** The shader's progress follows the recorded walk's duration, including reduced-motion snaps. */
export function inspectionParts(path: AttackPath, visual: DisplayedVisual, scene: Scene, palette: Palette, timeOrigin: number,
  motion: boolean, checked?: Point, placedAssetId?: string | null): { parts: Part[]; until: number } {
  const top = (id: string): Vec3 | undefined => {
    const node = scene.byId.get(id);
    if (!node) return;
    if (checked && id === placedAssetId) return toWorld(checked.x, checked.y, node.height + 0.7);
    return [node.center[0], node.height + 0.7, node.center[2]];
  };
  const hops = path.steps.flatMap(({ from, to }) => {
    const a = top(from);
    const b = top(to);
    return from !== to && a && b ? [{ a, b }] : [];
  });
  const duration = motion ? traceDuration(visual, hops.length) : 0;
  const birth = duration ? (visual.at - timeOrigin) / 1000 : -1000;
  const parts: Part[] = [];
  for (const [index, { a, b }] of hops.entries()) {
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const points = arcPoints(a, b, Math.min(13, 3.1 + span * 0.15), 14);
    for (let i = 1; i < points.length; i++) {
      const param = (index + (i - 1) / (points.length - 1)) / hops.length * duration * 0.0032;
      for (const [radius, alpha] of [[0.27, 0.98], [0.62, 0.2]]) {
        const part = tube(points[i - 1], points[i], radius, {
          color: palette.attention, alpha, emissive: 1, layer: "glow", pattern: PATTERN.arc, param,
        });
        part.pivot = [birth, 0];
        parts.push(part);
      }
    }
  }
  return { parts, until: birth + duration / 1000 + 0.05 };
}
