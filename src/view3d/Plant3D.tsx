/**
 * Optional 3D view of the live digital twin (hand-written WebGL2, no dependencies).
 * Reads the same stores as the 2D floor: twin, risk, linked selection / hover, lens, crew, run.
 * Default export, no props. Mount it through View3DStage, which adds the lazy load and fallback.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { crewAvatar, useCrewStore } from "@/crew/crewStore";
import { CREW_ORDER } from "@/crew/types";
import { projectTwinFocus } from "@/floor/twinFocus";
import { useLensStore } from "@/layers/lensStore";
import { useRunStore } from "@/pipeline/runStore";
import { useSimStore } from "@/sim/simStore";
import { useTwinStore } from "@/twin/store";
import { arcParts, attackSegments, mergePaths, pathIsActive } from "./attackArcs";
import {
  cameraMatrices, defaultPose, dropOffset, easeInOutCubic, easeOutCubic, framePose, mixPose, type Pose,
} from "./camera";
import { attachControls } from "./controls";
import { packParts } from "./gl/instances";
import { PickTable } from "./gl/pickId";
import { Renderer, type FrameState } from "./gl/renderer";
import { MAX_HIGHLIGHTS, PATTERN } from "./gl/shaders";
import Overlay, { type OverlayHandle } from "./Overlay";
import { DEFAULT_PALETTE, readPalette, type Palette } from "./palette";
import { HEIGHTS_CAPTION, sceneFromTwin, type Scene } from "./scene";
import { useView3DStore } from "./view3dStore";
import "./view3d.css";

const DROP_MS = 950;
const FLY_IN_MS = 1700;
const FRAME_MS = 850;
/** CSS pixels kept free at the bottom of the stage for the caption and the tools row. */
const BOTTOM_STRIP = 50;
const FOCUSABLE = new Set(["area", "zone", "asset", "entry"]);

interface Tween {
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
  ease: (t: number) => number;
}

interface Engine {
  renderer: Renderer;
  table: PickTable;
  scene: Scene | null;
  pose: Pose;
  poseReady: boolean;
  tween: Tween | null;
  width: number;
  height: number;
  dirty: boolean;
  /** Scene has rotating machines or flowing pipes: render continuously (unless reduced motion). */
  hasMotion: boolean;
  reduced: boolean;
  /** The user asked the system for reduced motion (stricter than `reduced`: no drop-in either). */
  noMotion: boolean;
  /** Camera is on the default framing (not moved by the user or a selection): re-fit on resize. */
  atHome: boolean;
  homePose: () => Pose | null;
  /** performance.now() at mount: shader time is seconds since then. */
  t0: number;
  /** Shader time until which attack arcs are still drawing in. */
  arcUntil: number;
  drop: { id: string; start: number } | null;
  hoverRequest: { x: number; y: number } | null;
  selectedId: string | null;
  hoveredId: string | null;
  highlighted: string[];
  /** Selection made by a click in this view: highlight only, do not move the camera. */
  localSelect: string | null;
  ensurePose: () => void;
  flyTo: (pose: Pose, duration: number) => void;
  frameNode: (id: string | null) => boolean;
  resetView: () => void;
}

export default function Plant3D() {
  const host = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const overlay = useRef<OverlayHandle>(null);
  const engine = useRef<Engine | null>(null);
  const births = useRef(new Map<string, number>());
  const emphasisKey = useRef("");
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const [epoch, setEpoch] = useState(0);

  const twin = useTwinStore((state) => state.twin);
  const risk = useTwinStore((state) => state.risk);
  const selectedId = useTwinStore((state) => state.selectedId);
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const highlightIds = useTwinStore((state) => state.highlightIds);
  const lens = useLensStore((state) => state.mode);
  const placedAssetId = useRunStore((state) => state.placedAssetId);
  const selfCheckPaths = useRunStore((state) => state.selfCheck?.paths);
  const thumbnail = useRunStore((state) => state.captureThumbnail);
  const droppedId = useRef(placedAssetId);

  const scene = useMemo(() => sceneFromTwin(twin, lens, { palette, findings: risk.findings }), [twin, lens, palette, risk.findings]);
  const focus = useMemo(() => projectTwinFocus(twin, selectedId, hoveredId, highlightIds), [twin, selectedId, hoveredId, highlightIds]);
  const allSegments = useMemo(() => attackSegments(mergePaths(risk.paths, selfCheckPaths)), [risk.paths, selfCheckPaths]);
  // Lens parity with the 2D floor: the full attack picture belongs to Both / Data. In Material only
  // the paths of the selected asset or of the device a capture just placed are drawn.
  const emphasised = useMemo(() => {
    const arcFocus = lens === "material" ? new Set(selectedId ? [selectedId] : []) : focus.focused;
    const keys = new Set<string>();
    for (const segment of allSegments) {
      if (segment.paths.some((path) => pathIsActive(path, arcFocus, placedAssetId))) keys.add(segment.key);
    }
    return keys;
  }, [allSegments, focus, placedAssetId, lens, selectedId]);
  const segments = useMemo(
    () => (lens === "material" ? allSegments.filter((segment) => emphasised.has(segment.key)) : allSegments),
    [allSegments, emphasised, lens],
  );

  // Engine lifetime: one WebGL context per mount, fully disposed on unmount.
  useEffect(() => {
    const container = host.current;
    const mount = canvasHost.current;
    if (!container || !mount) return;
    const canvas = document.createElement("canvas");
    canvas.className = "pw3d-canvas";
    mount.appendChild(canvas);

    const livePalette = readPalette(container);
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas, livePalette, () => { e.dirty = true; });
    } catch (error) {
      canvas.remove();
      useView3DStore.getState().fail(error instanceof Error ? error.message : "WebGL2 unavailable");
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const origin: Pose = { target: [80, 0, 46], yaw: -0.3, pitch: 0.74, distance: 170 };
    const e: Engine = {
      renderer,
      table: new PickTable(),
      scene: null,
      pose: origin,
      poseReady: false,
      tween: null,
      width: 0,
      height: 0,
      dirty: true,
      hasMotion: false,
      // Still mode: reduced motion, or a CPU rasteriser where continuous animation would crawl.
      reduced: motionQuery.matches || renderer.isSoftware(),
      noMotion: motionQuery.matches,
      atHome: true,
      homePose() {
        if (!e.scene || e.width < 2 || e.height < 2) return null;
        // Fit against the real container (narrower than the window: docks left, right and below).
        return defaultPose(e.scene, e.width / e.height, { bottom: Math.min(0.2, BOTTOM_STRIP / e.height) });
      },
      t0: performance.now(),
      arcUntil: 0,
      drop: null,
      hoverRequest: null,
      selectedId: useTwinStore.getState().selectedId,
      hoveredId: null,
      highlighted: [],
      localSelect: null,
      ensurePose() {
        if (e.poseReady || !e.scene || e.width < 2 || e.height < 2) return;
        e.poseReady = true;
        // First show always lands on the whole plant (an existing selection is highlighted, not
        // framed), so the switch from 2D reads as the same drawing tipped back.
        const home = e.homePose();
        if (!home) return;
        e.atHome = true;
        if (e.reduced) {
          e.pose = home;
        } else {
          // Eased fly-in: start high and wide, settle on the drawing angle.
          e.pose = { target: home.target, yaw: home.yaw - 0.5, pitch: 1.2, distance: home.distance * 1.55 };
          e.tween = { from: e.pose, to: home, start: performance.now(), duration: FLY_IN_MS, ease: easeOutCubic };
        }
        e.dirty = true;
      },
      flyTo(pose, duration) {
        if (e.reduced || duration <= 0) {
          e.pose = pose;
          e.tween = null;
        } else {
          e.tween = { from: e.pose, to: pose, start: performance.now(), duration, ease: easeInOutCubic };
        }
        e.dirty = true;
      },
      frameNode(id) {
        const node = id && e.scene ? e.scene.byId.get(id) : undefined;
        if (!node || !e.poseReady) return false;
        e.atHome = false;
        const room = node.type === "area" || node.type === "zone";
        e.flyTo(framePose(e.tween?.to ?? e.pose, node.center, room ? node.radius * 0.75 : node.radius, node.height), FRAME_MS);
        return true;
      },
      resetView() {
        const home = e.homePose();
        if (!home) return;
        e.atHome = true;
        e.flyTo(home, FRAME_MS);
      },
    };
    engine.current = e;
    setPalette(livePalette);
    setEpoch((value) => value + 1);

    const frameState = (nowMs: number): FrameState => {
      const camera = cameraMatrices(e.pose, e.width / Math.max(1, e.height));
      const dropT = e.drop ? (nowMs - e.drop.start) / DROP_MS : 1;
      return {
        viewProjection: camera.viewProjection,
        eye: camera.eye,
        time: (nowMs - e.t0) / 1000,
        motion: e.reduced ? 0 : 1,
        fog: [e.pose.distance * 1.2 + 70, e.pose.distance * 2.8 + 460],
        selected: e.table.lookup(e.selectedId),
        hovered: e.table.lookup(e.hoveredId),
        highlights: e.highlighted.slice(0, MAX_HIGHLIGHTS).map((id) => e.table.lookup(id)),
        dropId: e.drop && dropT < 1 ? e.table.lookup(e.drop.id) : 0,
        dropY: dropOffset(dropT),
        dim: e.selectedId ? 0.8 : 1,
      };
    };

    const pickAt = (x: number, y: number) => e.table.idOf(renderer.pick(frameState(performance.now()), x, y, e.width, e.height));

    let raf = 0;
    let lastHoverPick = 0;
    let lastDraw = 0;
    let slowFrames = 0;
    let tooSlow = false;
    const frame = (nowMs: number) => {
      raf = requestAnimationFrame(frame);
      if (renderer.lost || !e.poseReady || e.width < 2 || e.height < 2) return;

      if (e.tween) {
        const t = (nowMs - e.tween.start) / e.tween.duration;
        e.pose = t >= 1 ? e.tween.to : mixPose(e.tween.from, e.tween.to, e.tween.ease(t));
        if (t >= 1) e.tween = null;
        e.dirty = true;
      }
      if (e.drop && nowMs - e.drop.start >= DROP_MS) {
        e.drop = null;
        e.dirty = true;
      }
      const time = (nowMs - e.t0) / 1000;
      const crewMoving = CREW_ORDER.some((id) => crewAvatar(id).walking);
      const animating = (e.hasMotion && !e.reduced) || crewMoving || e.drop !== null || time < e.arcUntil;
      if (!e.dirty && !animating && !e.hoverRequest) {
        lastDraw = 0;
        return;
      }
      e.dirty = false;
      // Safety net for weak GPUs: if continuous animation runs under ~4 fps, switch to still mode
      // (draw on demand, no rotation or flow) instead of freezing the page.
      if (animating && !e.reduced && lastDraw > 0) {
        slowFrames = nowMs - lastDraw > 260 ? slowFrames + 1 : 0;
        if (slowFrames >= 6) {
          tooSlow = true;
          e.reduced = true;
          console.info("[view3d] slow GPU: animation paused, drawing on demand");
        }
      }
      lastDraw = nowMs;

      renderer.resize(e.width, e.height, window.devicePixelRatio);
      const state = frameState(nowMs);
      // Hover picking reads one pixel back: at most ~20 times a second.
      if (e.hoverRequest && nowMs - lastHoverPick > 48) {
        lastHoverPick = nowMs;
        const id = e.table.idOf(renderer.pick(state, e.hoverRequest.x, e.hoverRequest.y, e.width, e.height));
        e.hoverRequest = null;
        if (id !== useTwinStore.getState().hoveredId) useTwinStore.getState().hover(id);
        container.style.cursor = id ? "pointer" : "";
      }
      renderer.render(state);
      overlay.current?.update({ viewProjection: state.viewProjection, width: e.width, height: e.height, now: nowMs });
    };

    const start = () => {
      cancelAnimationFrame(raf);
      e.dirty = true;
      lastDraw = 0;
      slowFrames = 0;
      raf = requestAnimationFrame(frame);
    };
    // Pause completely while the tab is hidden.
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const onMotion = () => {
      e.reduced = motionQuery.matches || renderer.isSoftware() || tooSlow;
      e.noMotion = motionQuery.matches;
      e.dirty = true;
    };
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const resized = Math.abs(rect.width - e.width) > 1 || Math.abs(rect.height - e.height) > 1;
      e.width = rect.width;
      e.height = rect.height;
      const first = !e.poseReady;
      e.ensurePose();
      // The stage changed size (drawer, split view, window): keep the plant framed, unless the
      // user has moved the camera or framed a selection.
      if (!first && resized && e.atHome) {
        const home = e.homePose();
        if (home) {
          if (e.tween) e.tween = { ...e.tween, to: home };
          else e.pose = home;
        }
      }
      e.dirty = true;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", onMotion);
    const stopCrew = useCrewStore.subscribe(() => { e.dirty = true; });
    // Theme: the palette comes from the CSS tokens, so re-read it whenever <html data-theme> flips.
    const themeObserver = new MutationObserver(() => {
      const next = readPalette(container);
      setPalette((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    // Development only: lets the QA screenshot script drive the real stores (never in production).
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__pw3dStores = {
        useTwinStore, useRunStore, useLensStore, useView3DStore, useSimStore,
      };
    }

    const detach = attachControls(container, {
      getPose: () => e.pose,
      setPose: (pose) => {
        e.atHome = false;
        e.tween = null;
        e.pose = pose;
        e.dirty = true;
      },
      viewportHeight: () => e.height,
      bounds: () => e.scene ?? undefined,
      hoverAt: (point) => {
        if (point) {
          e.hoverRequest = point;
        } else {
          e.hoverRequest = null;
          container.style.cursor = "";
          if (useTwinStore.getState().hoveredId !== null) useTwinStore.getState().hover(null);
        }
      },
      clickAt: (x, y) => {
        const id = pickAt(x, y);
        e.localSelect = id;
        useTwinStore.getState().select(id);
      },
      doubleClickAt: (x, y) => {
        const id = pickAt(x, y);
        if (!id) return;
        e.localSelect = id;
        useTwinStore.getState().select(id);
        e.frameNode(id);
      },
      frameSelection: () => {
        if (!e.frameNode(e.selectedId)) e.resetView();
      },
    });

    if (!document.hidden) start();
    return () => {
      cancelAnimationFrame(raf);
      detach();
      observer.disconnect();
      themeObserver.disconnect();
      stopCrew();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotion);
      if (useTwinStore.getState().hoveredId !== null) useTwinStore.getState().hover(null);
      renderer.dispose();
      canvas.remove();
      engine.current = null;
    };
  }, []);

  // Twin -> GPU: repack whenever the twin, lens, findings or palette change.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.scene = scene;
    e.renderer.setPalette(palette);
    e.renderer.setBatches("scene", packParts(scene.nodes.map((node) => ({
      pickNumber: FOCUSABLE.has(node.type) ? e.table.numberOf(node.id) : 0,
      parts: node.parts,
    }))));
    e.hasMotion = scene.nodes.some((node) => node.parts.some((part) =>
      part.spin !== 0 || ((part.pattern === PATTERN.flow || part.pattern === PATTERN.chevron) && part.param > 0)));
    e.ensurePose();
    e.dirty = true;
  }, [scene, palette, epoch]);

  // Attack paths: arcs draw in hop by hop when they appear or come into focus.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const now = (performance.now() - e.t0) / 1000;
    const signature = [...emphasised].sort().join("|");
    const retrace = signature !== emphasisKey.current;
    emphasisKey.current = signature;
    const known = births.current;
    const live = new Set(segments.map((segment) => segment.key));
    for (const key of [...known.keys()]) if (!live.has(key)) known.delete(key);
    let lastHop = 0;
    for (const segment of segments) {
      const fresh = !known.has(segment.key) || (retrace && emphasised.has(segment.key));
      if (fresh) {
        known.set(segment.key, e.reduced ? -1000 : now);
        lastHop = Math.max(lastHop, segment.hop + 1);
      }
    }
    if (lastHop > 0 && !e.reduced) e.arcUntil = Math.max(e.arcUntil, now + lastHop / 3.2 + 0.4);
    const parts = arcParts(segments, scene, emphasised, (key) => known.get(key) ?? -1000, palette);
    e.renderer.setBatches("arcs", packParts([{ pickNumber: 0, parts }]));
    e.dirty = true;
  }, [segments, emphasised, scene, palette, epoch]);

  // Linked selection: a selection made anywhere else (2D floor, Purdue map, side panel) frames here.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.selectedId = selectedId;
    e.hoveredId = hoveredId;
    e.highlighted = [...focus.highlighted].filter((id) => id !== hoveredId && id !== selectedId);
    e.dirty = true;
  }, [selectedId, hoveredId, focus, epoch]);

  useEffect(() => {
    const e = engine.current;
    if (!e || !selectedId) return;
    const local = e.localSelect === selectedId;
    e.localSelect = null;
    if (!local) e.frameNode(selectedId);
  }, [selectedId]);

  // A capture placed a device: it drops in from above at its spot, with a short settle.
  useEffect(() => {
    const e = engine.current;
    if (!e || !placedAssetId) {
      if (!placedAssetId) droppedId.current = null;
      return;
    }
    if (droppedId.current === placedAssetId || !scene.byId.has(placedAssetId)) return;
    droppedId.current = placedAssetId;
    // One short drop, also in still mode (software GPU); skipped only for prefers-reduced-motion.
    if (!e.noMotion) e.drop = { id: placedAssetId, start: performance.now() };
    e.dirty = true;
  }, [placedAssetId, scene]);

  return (
    <div ref={host} className="pw3d-root" data-lens={lens} role="application" aria-label="3D plant view">
      <div ref={canvasHost} className="pw3d-canvas-host" />
      <Overlay
        ref={overlay}
        scene={scene}
        selectedId={selectedId}
        hoveredId={hoveredId}
        highlighted={focus.highlighted}
        placedAssetId={placedAssetId}
        thumbnail={thumbnail}
      />
      <div className="pw3d-caption pw-mono">{HEIGHTS_CAPTION}</div>
      <div className="pw3d-tools" data-pw3d-ui>
        <span className="pw3d-hint pw-mono" aria-hidden="true">drag orbit · right-drag pan · scroll zoom · F frame</span>
        <button type="button" className="pw3d-button pw-mono" onClick={() => engine.current?.resetView()}>reset view</button>
      </div>
    </div>
  );
}
