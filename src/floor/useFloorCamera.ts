/** Applies the camera to SVG and positions the selected equipment card without React frames. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CREW_FOCUS_EVENT, type CrewFocusPoint } from "@/crew/focusCrew";
import { FOOTPRINT } from "@/equipment/types";
import type { Point } from "@/twin/geometry";
import type { Area, Asset, Twin, ViewMode } from "@/twin/types";
import { clientToStage, FIT, viewportFor, worldToLocal, zoomBetween, type Camera, type Viewport } from "./camera";
import { fitDrawing, type Rect } from "./fit";
import { CAPTURE_OVERLAY, observeViewportOverlays } from "./viewportOverlays";

const SPLIT_TAG = '.pw-plant-floor[data-view="split"] .pw-floor-tag-anchor';
const FLOOR_CONTROLS = `${CAPTURE_OVERLAY}, .pw-floor-caption, .pw-floor-zoom, .pw-floor-legend, .pw-stage-escalation .pw-es-chip, ${SPLIT_TAG}`;
const DOCK_TAG_WIDTH = 650;
const coverage = (value: number) => Math.max(0, Math.min(1, value));

export default function useFloorCamera(
  canvas: Twin["plant"]["canvas"],
  bounds: Area["bounds"],
  selection: Asset | undefined,
  selectedPoint: Point | undefined,
  selectedId: string | null,
  viewMode: ViewMode,
) {
  const paneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const pose = useRef<Camera>(FIT);
  const fit = useRef<Camera>(FIT);
  const fitted = useRef(true);
  const frame = useRef<number | undefined>(undefined);
  const viewport = useRef<Viewport | undefined>(undefined);
  const observedSize = useRef<Pick<Viewport, "width" | "height"> | undefined>(undefined);
  const overlays = useRef<Rect[]>([]);
  const visualScale = useRef({ absolute: 0, relative: 0 });
  const tagSize = useRef({ width: 0, height: 0 });
  const selected = useRef<Asset | undefined>(undefined);
  const previousSelection = useRef<string | null>(null);
  const [fitPixelsPerUnit, setFitPixelsPerUnit] = useState(0.5);
  const [pixelsPerUnit, setPixelsPerUnit] = useState(0.5);
  const scaleCommit = useRef<{ timer?: number; at: number }>({ at: -Infinity });
  const [lensDetail, setLensDetail] = useState(false);
  const lensDetailRef = useRef(false);
  const [instrumentDetail, setInstrumentDetail] = useState(false);
  const instrumentDetailRef = useRef(false);
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
    const docked = viewMode === "split" && view.width < DOCK_TAG_WIDTH;
    tag.toggleAttribute("data-docked", docked);
    if (docked) {
      tag.removeAttribute("data-offscreen");
      tag.style.transform = "";
      return;
    }

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
  }, [viewMode]);

  // Label placement re-renders at the start and end of a wheel or pinch zoom, not on every frame.
  const commitScale = useCallback((absolute: number) => {
    const commit = scaleCommit.current;
    window.clearTimeout(commit.timer);
    const now = performance.now();
    if (now - commit.at > 250) setPixelsPerUnit(absolute);
    else commit.timer = window.setTimeout(() => setPixelsPerUnit(absolute), 160);
    commit.at = now;
  }, []);

  useEffect(() => {
    const commit = scaleCommit.current;
    return () => window.clearTimeout(commit.timer);
  }, []);

  const paint = useCallback((smooth: boolean) => {
    const world = worldRef.current;
    if (!world) return;
    const next = pose.current;
    const view = viewport.current ?? measure();
    if (view) {
      placeTag(next, view);
      const absolute = next.scale * view.pixelsPerUnit;
      const relative = next.scale / fit.current.scale;
      const detailed = relative >= 1.5;
      if (detailed !== lensDetailRef.current) {
        lensDetailRef.current = detailed;
        setLensDetail(detailed);
      }
      const readableInstruments = absolute >= 0.95;
      if (readableInstruments !== instrumentDetailRef.current) {
        instrumentDetailRef.current = readableInstruments;
        setInstrumentDetail(readableInstruments);
      }
      if (absolute !== visualScale.current.absolute || relative !== visualScale.current.relative) {
        if (absolute !== visualScale.current.absolute) commitScale(absolute);
        world.style.setProperty("--pw-floor-inverse-scale", String(1 / absolute));
        world.style.setProperty("--pw-floor-detail", String(coverage((relative - 1.12) / 0.64)));
        world.style.setProperty("--pw-floor-telemetry", String(coverage((relative - 1.55) / 0.65)));
        world.style.setProperty("--pw-floor-secondary", String(coverage((absolute - 0.37) / 0.19)));
        visualScale.current = { absolute, relative };
      }
    }
    world.toggleAttribute("data-easing", smooth);
    tagRef.current?.toggleAttribute("data-easing", smooth);
    world.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
  }, [measure, placeTag, commitScale]);

  const setCamera = useCallback((next: Camera, smooth = false) => {
    pose.current = next;
    fitted.current = Math.abs(next.x - fit.current.x) < 0.01 && Math.abs(next.y - fit.current.y) < 0.01
      && Math.abs(next.scale - fit.current.scale) < 0.001;
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

  useLayoutEffect(() => {
    function focusCrew(event: Event) {
      const point = (event as CustomEvent<CrewFocusPoint>).detail;
      const view = measure();
      if (!view || view.width <= 0 || view.height <= 0 || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      const next = pose.current;
      const local = worldToLocal(point, next, view);
      setCamera({
        ...next,
        x: next.x + (view.width / 2 - local.x) / view.pixelsPerUnit,
        y: next.y + (view.height / 2 - local.y) / view.pixelsPerUnit,
      }, true);
    }

    window.addEventListener(CREW_FOCUS_EVENT, focusCrew);
    return () => window.removeEventListener(CREW_FOCUS_EVENT, focusCrew);
  }, [measure, setCamera]);

  const resetFit = useCallback(() => setCamera(fit.current, true), [setCamera]);
  const zoom = useCallback((current: Camera, from: Point, to: Point, factor: number) =>
    zoomBetween(current, from, to, factor, fit.current.scale, Math.max(6, fit.current.scale * 4)), []);

  const zoomAtCenter = useCallback((factor: number) => {
    const view = viewport.current ?? measure();
    if (!view) return;
    const center = clientToStage({ x: view.left + view.width / 2, y: view.top + view.height / 2 }, view);
    setCamera(zoom(pose.current, center, center, factor), true);
  }, [measure, setCamera, zoom]);

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
    const pane = paneRef.current;
    if (!pane) return;
    observedSize.current = undefined;
    const stop = observeViewportOverlays(pane, FLOOR_CONTROLS, (controls) => {
      const view = measure();
      if (!view || view.width <= 24 || view.height <= 24) return;
      const resized = view.width !== observedSize.current?.width || view.height !== observedSize.current.height;
      observedSize.current = view;
      overlays.current = controls.filter((control) => control !== tagRef.current || view.width < DOCK_TAG_WIDTH)
        .map((control) => control.getBoundingClientRect()).filter(({ width, height }) => width > 0 && height > 0);
      fit.current = fitDrawing(view, bounds, overlays.current);
      setFitPixelsPerUnit(fit.current.scale * view.pixelsPerUnit);
      if (resized || fitted.current) {
        pose.current = fit.current;
        fitted.current = true;
      }
      paint(false);
    });
    const resize = new ResizeObserver(() => {
      measureTag();
      if (viewport.current) placeTag(pose.current, viewport.current);
    });
    if (tagRef.current) resize.observe(tagRef.current);
    return () => {
      stop();
      resize.disconnect();
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
    };
  }, [bounds, measure, measureTag, paint, placeTag, viewMode]);

  useLayoutEffect(() => {
    const changed = previousSelection.current !== selectedId;
    previousSelection.current = selectedId;
    selected.current = selection;
    const view = viewport.current ?? measure();
    if (!selectedPoint || !view) return;
    measureTag();

    const next = pose.current;
    const point = worldToLocal(selectedPoint, next, view);
    const onScreen = point.x >= 12 && point.x <= view.width - 12 && point.y >= 12 && point.y <= view.height - 12;
    const covered = overlays.current.some(({ left, right, top, bottom }) => {
      const x = point.x + view.left;
      const y = point.y + view.top;
      return x >= left && x <= right && y >= top && y <= bottom;
    });
    if (changed && (!onScreen || covered) && !svgRef.current?.hasAttribute("data-interaction")) {
      const center = worldToLocal({ x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }, fit.current, view);
      setCamera({
        ...next,
        x: next.x + (center.x - point.x) / view.pixelsPerUnit,
        y: next.y + (center.y - point.y) / view.pixelsPerUnit,
      }, true);
    } else {
      placeTag(next, view);
    }
  }, [bounds, selectedId, selectedPoint, selection, measure, measureTag, placeTag, setCamera]);

  return { paneRef, svgRef, worldRef, tagRef, pose, fitPixelsPerUnit, pixelsPerUnit, lensDetail, instrumentDetail, resetFit, zoom, zoomAtCenter, setCamera, startGesture, stagePoint };
}

export type FloorCamera = ReturnType<typeof useFloorCamera>;
