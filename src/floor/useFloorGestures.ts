/** Pointer capture for selection, camera gestures and device movement. */
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { distance, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { stageToWorld, zoomBetween, type Camera } from "./camera";
import type { FloorCamera } from "./useFloorCamera";
import type { FloorPlacement } from "./useFloorPlacement";

interface Pan {
  kind: "pan";
  client: Point;
  camera: Camera;
  assetId: string | null;
  moved: boolean;
  movingAsset: boolean;
}

interface Pinch {
  kind: "pinch";
  center: Point;
  span: number;
  camera: Camera;
}

function pointOf(event: { clientX: number; clientY: number }): Point {
  return { x: event.clientX, y: event.clientY };
}

function assetIdOf(target: EventTarget | null): string | null {
  return target instanceof Element ? target.closest("[data-floor-asset]")?.getAttribute("data-floor-asset") ?? null : null;
}

function centerOf(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function useFloorGestures(camera: FloorCamera, placement: FloorPlacement) {
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Pan | Pinch | null>(null);
  const floorHover = useRef<string | null>(null);
  const { svgRef, setCamera, stagePoint, startGesture } = camera;
  const { activate, startMove, updateMove, finishMove } = placement;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (pointers.current.size) return;
      const pose = startGesture(false);
      const cursor = stagePoint(pointOf(event));
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1;
      setCamera(zoomBetween(pose, cursor, cursor, Math.exp(-event.deltaY * units * 0.0016)));
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [svgRef, setCamera, stagePoint, startGesture]);

  useEffect(() => () => {
    const store = useTwinStore.getState();
    if (floorHover.current && floorHover.current === store.hoveredId) store.hover(null);
  }, []);

  function hover(assetId: string | null) {
    const store = useTwinStore.getState();
    if ((assetId || floorHover.current === store.hoveredId) && store.hoveredId !== assetId) store.hover(assetId);
    floorHover.current = assetId;
  }

  function rebase(continued: boolean, assetId: string | null = null) {
    const [first, second] = pointers.current.values();
    if (!first) {
      gesture.current = null;
      svgRef.current?.removeAttribute("data-interaction");
      return;
    }
    const pose = startGesture();
    if (second) {
      if (gesture.current?.kind === "pan" && gesture.current.movingAsset) finishMove(true);
      gesture.current = { kind: "pinch", center: stagePoint(centerOf(first, second)), span: Math.max(1, distance(first, second)), camera: pose };
      svgRef.current?.setAttribute("data-interaction", "pan");
    } else {
      const movingAsset = !continued && startMove(assetId, stageToWorld(stagePoint(first), pose));
      gesture.current = { kind: "pan", client: first, camera: pose, assetId, moved: continued, movingAsset };
    }
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const assetId = assetIdOf(event.target);
    pointers.current.set(event.pointerId, pointOf(event));
    rebase(false, assetId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (!active || !pointers.current.has(event.pointerId)) return;
    const client = pointOf(event);
    pointers.current.set(event.pointerId, client);

    if (active.kind === "pinch") {
      const [first, second] = pointers.current.values();
      if (second) {
        const center = stagePoint(centerOf(first, second));
        setCamera(zoomBetween(active.camera, active.center, center, distance(first, second) / active.span));
      }
      return;
    }

    if (!active.moved && distance(active.client, client) < (event.pointerType === "touch" ? 7 : 4)) return;
    active.moved = true;
    const now = stagePoint(client);
    if (active.movingAsset) {
      event.currentTarget.setAttribute("data-interaction", "move");
      updateMove(stageToWorld(now, active.camera));
      return;
    }
    event.currentTarget.setAttribute("data-interaction", "pan");
    const start = stagePoint(active.client);
    setCamera({ ...active.camera, x: active.camera.x + now.x - start.x, y: active.camera.y + now.y - start.y });
  }

  function finish(event: PointerEvent<SVGSVGElement>, canceled: boolean) {
    if (!pointers.current.has(event.pointerId)) return;
    if (!canceled) onPointerMove(event);
    const active = gesture.current;
    pointers.current.delete(event.pointerId);
    if (active?.kind === "pan" && active.movingAsset) finishMove(canceled);
    rebase(true);
    if (!canceled && active?.kind === "pan" && !active.moved) {
      activate(stageToWorld(stagePoint(pointOf(event)), camera.pose.current), active.assetId);
    }
    if (event.pointerType !== "touch" && !pointers.current.size) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      hover(event.currentTarget.contains(target) ? assetIdOf(target) : null);
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: PointerEvent<SVGSVGElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<SVGSVGElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<SVGSVGElement>) => finish(event, true),
    onPointerOver: (event: PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.size && event.pointerType !== "touch") hover(assetIdOf(event.target));
    },
    onPointerLeave: () => hover(null),
    onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => {
      const assetId = assetIdOf(event.target);
      if (!assetId || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      const store = useTwinStore.getState();
      const asset = store.twin.assets.find((item) => item.id === assetId);
      if (asset) activate(asset.physical, assetId);
    },
  };
}
