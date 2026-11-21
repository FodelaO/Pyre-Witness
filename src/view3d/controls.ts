/**
 * Pointer, touch, wheel and keyboard input for the 3D view: drag orbits, right-drag / shift-drag
 * / two fingers pan, wheel / pinch zooms, click picks, double-click or F frames the selection.
 */
import { orbit, pan, zoom, type PlantBounds, type Pose } from "./camera";

export interface ControlsApi {
  getPose: () => Pose;
  /** Applies a user-driven pose (cancels any camera tween). */
  setPose: (pose: Pose) => void;
  viewportHeight: () => number;
  bounds: () => PlantBounds | undefined;
  /** Pointer position in CSS pixels relative to the view, or null when it left. */
  hoverAt: (point: { x: number; y: number } | null) => void;
  clickAt: (x: number, y: number) => void;
  doubleClickAt: (x: number, y: number) => void;
  frameSelection: () => void;
}

const CLICK_SLOP = 5;

function isUi(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-pw3d-ui]") !== null;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function attachControls(element: HTMLElement, api: ControlsApi): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { button: number; shift: boolean; moved: number } | null = null;
  let pinch: { distance: number; cx: number; cy: number } | null = null;

  const local = (event: { clientX: number; clientY: number }) => {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  function measurePinch() {
    const [a, b] = [...pointers.values()];
    return { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function onPointerDown(event: PointerEvent) {
    if (isUi(event.target)) return;
    element.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = { button: event.button, shift: event.shiftKey, moved: 0 };
      pinch = null;
    } else if (pointers.size === 2) {
      drag = null;
      pinch = measurePinch();
    }
  }

  function onPointerMove(event: PointerEvent) {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      if (!isUi(event.target)) api.hoverAt(local(event));
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinch) {
      const next = measurePinch();
      const moved = pan(api.getPose(), next.cx - pinch.cx, next.cy - pinch.cy, api.viewportHeight(), api.bounds());
      api.setPose(zoom(moved, pinch.distance / next.distance));
      pinch = next;
      return;
    }
    if (!drag) return;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved <= CLICK_SLOP) return;
    const panning = drag.button === 2 || drag.button === 1 || drag.shift;
    api.setPose(panning ? pan(api.getPose(), dx, dy, api.viewportHeight(), api.bounds()) : orbit(api.getPose(), dx, dy));
  }

  function onPointerUp(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    const wasClick = drag !== null && drag.button === 0 && drag.moved <= CLICK_SLOP && pointers.size === 1 && event.type === "pointerup";
    pointers.delete(event.pointerId);
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) drag = null;
    if (wasClick) {
      const point = local(event);
      api.clickAt(point.x, point.y);
    }
  }

  function onWheel(event: WheelEvent) {
    if (isUi(event.target)) return;
    event.preventDefault();
    const delta = Math.max(-160, Math.min(160, event.deltaY));
    // ctrlKey marks a trackpad pinch: small deltas, so make them count.
    api.setPose(zoom(api.getPose(), Math.exp(delta * (event.ctrlKey ? 0.011 : 0.0017))));
  }

  function onDoubleClick(event: MouseEvent) {
    if (isUi(event.target)) return;
    const point = local(event);
    api.doubleClickAt(point.x, point.y);
  }

  function onContextMenu(event: MouseEvent) {
    if (!isUi(event.target)) event.preventDefault();
  }

  function onPointerLeave() {
    if (pointers.size === 0) api.hoverAt(null);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
    api.frameSelection();
  }

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("pointerleave", onPointerLeave);
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("dblclick", onDoubleClick);
  element.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerUp);
    element.removeEventListener("pointerleave", onPointerLeave);
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("dblclick", onDoubleClick);
    element.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("keydown", onKeyDown);
  };
}
