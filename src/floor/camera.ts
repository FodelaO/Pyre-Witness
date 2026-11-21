/** Coordinate transforms for the plant viewport. */
import type { Point } from "@/twin/geometry";
import type { Twin } from "@/twin/types";

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
  pixelsPerUnit: number;
  inset: Point;
}

export const FIT: Camera = { x: 0, y: 0, scale: 1 };

export function viewportFor(rect: Pick<DOMRect, "left" | "top" | "width" | "height">, canvas: Twin["plant"]["canvas"]): Viewport {
  const { left, top, width, height } = rect;
  const pixelsPerUnit = Math.min(width / canvas.w, height / canvas.h) || 1;
  return {
    left, top, width, height, pixelsPerUnit,
    inset: { x: (width - canvas.w * pixelsPerUnit) / 2, y: (height - canvas.h * pixelsPerUnit) / 2 },
  };
}

export function clientToStage(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.left - viewport.inset.x) / viewport.pixelsPerUnit,
    y: (point.y - viewport.top - viewport.inset.y) / viewport.pixelsPerUnit,
  };
}

export function stageToWorld(point: Point, camera: Camera): Point {
  return { x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale };
}

export function worldToLocal(point: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (point.x * camera.scale + camera.x) * viewport.pixelsPerUnit + viewport.inset.x,
    y: (point.y * camera.scale + camera.y) * viewport.pixelsPerUnit + viewport.inset.y,
  };
}

export function zoomBetween(camera: Camera, from: Point, to: Point, factor: number, min = 0.55, max = 6): Camera {
  const world = stageToWorld(from, camera);
  const scale = Math.max(min, Math.min(max, camera.scale * factor));
  return { x: to.x - world.x * scale, y: to.y - world.y * scale, scale };
}
