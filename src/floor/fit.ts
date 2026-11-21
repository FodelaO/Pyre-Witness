/** Fits the plant and parking in the largest clear portion of the viewport. */
import type { Area, EntryPoint, Twin } from "@/twin/types";
import { clientToStage, type Camera, type Viewport } from "./camera";

type Bounds = Area["bounds"];
export type Rect = Pick<DOMRect, "left" | "top" | "right" | "bottom">;

const PADDING = 12;
const CONTROL_GAP = 9;

export function drawingBounds(plant: Twin["plant"], areas: readonly Area[], entries: readonly EntryPoint[]): Bounds {
  const { x, y, w, h } = plant.building;
  const left = Math.min(x, ...areas.map(({ bounds }) => bounds.x));
  const top = Math.max(0, Math.min(y - 26, ...entries.map((entry) => entry.y - 18)));
  const right = Math.max(x + w, ...areas.map(({ bounds }) => bounds.x + bounds.w));
  const bottom = Math.max(y + h, ...areas.map(({ bounds }) => bounds.y + bounds.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function without(rect: Rect, obstacle: Rect): Rect[] {
  if (rect.right <= obstacle.left || rect.left >= obstacle.right || rect.bottom <= obstacle.top || rect.top >= obstacle.bottom) {
    return [rect];
  }
  return [
    { ...rect, right: obstacle.left },
    { ...rect, left: obstacle.right },
    { ...rect, bottom: obstacle.top },
    { ...rect, top: obstacle.bottom },
  ].filter((part) => part.right > part.left && part.bottom > part.top);
}

export function fitDrawing(view: Viewport, bounds: Bounds, overlays: readonly Rect[]): Camera {
  const viewport = {
    left: view.left + PADDING,
    top: view.top + PADDING,
    right: view.left + view.width - PADDING,
    bottom: view.top + view.height - PADDING,
  };
  const clear = overlays.reduce<Rect[]>((rects, obstacle) => rects.flatMap((rect) => without(rect, {
    left: obstacle.left - CONTROL_GAP,
    right: obstacle.right + CONTROL_GAP,
    top: obstacle.top - CONTROL_GAP,
    bottom: obstacle.bottom + CONTROL_GAP,
  })), [viewport]);
  const desiredCenter = { x: view.left + view.width / 2, y: view.top + view.height / 2 };
  let best = { scale: 0, offset: Infinity, center: desiredCenter };
  for (const rect of clear.length ? clear : [viewport]) {
    const scale = Math.min((rect.right - rect.left) / bounds.w, (rect.bottom - rect.top) / bounds.h);
    const halfW = bounds.w * scale / 2;
    const halfH = bounds.h * scale / 2;
    const center = {
      x: Math.max(rect.left + halfW, Math.min(desiredCenter.x, rect.right - halfW)),
      y: Math.max(rect.top + halfH, Math.min(desiredCenter.y, rect.bottom - halfH)),
    };
    const offset = Math.hypot(center.x - desiredCenter.x, center.y - desiredCenter.y);
    if (scale > best.scale || (scale === best.scale && offset < best.offset)) best = { scale, offset, center };
  }

  const scale = best.scale / view.pixelsPerUnit;
  const center = clientToStage(best.center, view);
  return {
    x: center.x - (bounds.x + bounds.w / 2) * scale,
    y: center.y - (bounds.y + bounds.h / 2) * scale,
    scale,
  };
}
