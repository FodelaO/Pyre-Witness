/** Applies the camera to SVG and positions the selected equipment card without React frames. */
import { useCallback, useLayoutEffect, useRef } from "react";
import { FOOTPRINT } from "@/equipment/types";
import type { Point } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import { clientToStage, FIT, viewportFor, worldToLocal, type Camera, type Viewport } from "./camera";

export default function useFloorCamera(canvas: Twin["plant"]["canvas"], selection: Asset | undefined) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const pose = useRef<Camera>(FIT);
  const frame = useRef<number | undefined>(undefined);
  const viewport = useRef<Viewport | undefined>(undefined);
  const tagSize = useRef({ width: 0, height: 0 });
  const selected = useRef<Asset | undefined>(undefined);
  const { w, h } = canvas;

  const measure = useCallback(() => {
    if (svgRef.current) viewport.current = viewportFor(svgRef.current.getBoundingClientRect(), { w, h });
    return viewport.current;
  }, [w, h]);

  const measureTag = useCallback(() => {
    const tag = tagRef.current;
    if (tag) tagSize.current = { width: tag.offsetWidth, height: tag.offsetHeight };
  }, []);

  const placeTag = useCallback((next: Camera, view: Viewport) => {
    const tag = tagRef.current;
    const asset = selected.current;
    if (!tag || !asset) return;

    const point = worldToLocal(asset.physical, next, view);
    const onScreen = point.x > 0 && point.y > 0 && point.x < view.width && point.y < view.height;
    tag.toggleAttribute("data-offscreen", !onScreen);
    if (!onScreen) return;

    const footprint = FOOTPRINT[asset.physical.kind];
    const angle = asset.physical.rotation * Math.PI / 180;
    const halfWidth = (Math.abs(footprint.w * Math.cos(angle)) + Math.abs(footprint.h * Math.sin(angle))) / 2;
    const gap = Math.max(24, (halfWidth + 8) * (asset.physical.scale ?? 1) * view.pixelsPerUnit * next.scale + 6);
    const margin = 12;
    const { width, height } = tagSize.current;
    const right = point.x + gap;
    const left = point.x - gap - width;
    const onRight = right + width <= view.width - margin || (left < margin && point.x < view.width / 2);
    const x = Math.max(margin, Math.min(view.width - width - margin, onRight ? right : left));
    const y = Math.max(margin, Math.min(view.height - height - margin, point.y - 22));
    tag.dataset.side = onRight ? "right" : "left";
    tag.style.setProperty("--pw-floor-anchor-y", `${Math.max(14, Math.min(height - 12, point.y - y))}px`);
    tag.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const paint = useCallback((smooth: boolean) => {
    const world = worldRef.current;
    if (!world) return;
    const next = pose.current;
    const view = viewport.current ?? measure();
    if (view) placeTag(next, view);
    world.toggleAttribute("data-easing", smooth);
    tagRef.current?.toggleAttribute("data-easing", smooth);
    world.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
  }, [measure, placeTag]);

  const setCamera = useCallback((next: Camera, smooth = false) => {
    pose.current = next;
    if (smooth) {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
      paint(true);
    } else if (frame.current === undefined) {
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined;
        paint(false);
      });
    }
  }, [paint]);

  const startGesture = useCallback((refreshViewport = true) => {
    if (refreshViewport || !viewport.current) measure();
    const world = worldRef.current;
    if (world?.hasAttribute("data-easing")) {
      const transform = new DOMMatrixReadOnly(getComputedStyle(world).transform);
      pose.current = { x: transform.e, y: transform.f, scale: transform.a };
      paint(false);
    }
    return pose.current;
  }, [measure, paint]);

  const stagePoint = useCallback((client: Point) => {
    const view = viewport.current ?? measure();
    return view ? clientToStage(client, view) : client;
  }, [measure]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const resize = new ResizeObserver(() => {
      const view = measure();
      measureTag();
      if (view) placeTag(pose.current, view);
    });
    measure();
    resize.observe(svg);
    if (tagRef.current) resize.observe(tagRef.current);
    return () => {
      resize.disconnect();
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
    };
  }, [measure, measureTag, placeTag]);

  useLayoutEffect(() => {
    const changed = selected.current?.id !== selection?.id;
    selected.current = selection;
    const view = viewport.current ?? measure();
    if (!selection || !view) return;
    measureTag();

    const next = pose.current;
    const point = worldToLocal(selection.physical, next, view);
    // Leave room for the floor controls when revealing an off-screen linked selection.
    const edgeX = Math.min(34, view.width / 4);
    const edgeY = Math.min(48, view.height / 4);
    const offCenter = point.x < edgeX || point.x > view.width - edgeX || point.y < edgeY || point.y > view.height - edgeY;
    if (changed && offCenter && !svgRef.current?.hasAttribute("data-interaction")) {
      setCamera({
        ...next,
        x: next.x + (view.width / 2 - point.x) / view.pixelsPerUnit,
        y: next.y + (view.height / 2 - point.y) / view.pixelsPerUnit,
      }, true);
    } else {
      placeTag(next, view);
    }
  }, [selection, measure, measureTag, placeTag, setCamera]);

  return { svgRef, worldRef, tagRef, pose, setCamera, startGesture, stagePoint };
}

export type FloorCamera = ReturnType<typeof useFloorCamera>;
