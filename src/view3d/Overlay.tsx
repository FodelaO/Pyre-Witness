/**
 * Crisp HTML over the WebGL canvas: asset tags, room names, entry points and the AI crew as
 * portrait billboards. The render loop calls update() each drawn frame to re-project them.
 * Crew positions, states and messages are read straight from the real crew store.
 */
"use client";

import { useImperativeHandle, useLayoutEffect, useMemo, useRef, type CSSProperties, type Ref, type RefObject } from "react";
import { PenLine } from "lucide-react";
import { crewPosition, useCrewStore } from "@/crew/crewStore";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import { useCrewReadout } from "@/crew/useCrewReadout";
import type { CaptureImage } from "@/pipeline/types";
import CrewWorkLabels, { type CrewWorkLabelProps, type CrewWorkLabelsHandle } from "./CrewWorkLabels";
import CrewWorkMotion, { type CrewWorkMotionHandle } from "./CrewWorkMotion";
import { projectToScreen, type Mat4 } from "./gl/mat4";
import { declutter, type LabelBox } from "./labels";
import { toWorld } from "./parts";
import type { Scene, SceneNode } from "./scene";

export interface OverlayFrame {
  viewProjection: Mat4;
  width: number;
  height: number;
  /** performance.now() of the frame, for the crew walk interpolation. */
  now: number;
}

export interface OverlayHandle {
  update: (frame: OverlayFrame) => void;
}

interface OverlayProps {
  ref: Ref<OverlayHandle>;
  scene: Scene;
  selectedId: string | null;
  hoveredId: string | null;
  highlighted: ReadonlySet<string>;
  placedAssetId: string | null;
  thumbnail: CaptureImage | null;
  workLabels: Omit<CrewWorkLabelProps, "ref" | "scene" | "thumbnail" | "placedAssetId">;
  tools: RefObject<HTMLDivElement | null>;
  briefing: RefObject<HTMLElement | null>;
  invalidate: () => void;
}

/** Tags of equipment at least this prominent are candidates at any zoom (tanks, filler, skids). */
const ALWAYS_TAG_PRIORITY = 120;
/** Closer than this (metres from the camera) every tag becomes a candidate. */
const NEAR_TAG_DISTANCE = 62;
const CREW_STEM = { resting: 8, active: 16 };
const CREW_GAP = 5;
type PlateSize = Pick<LabelBox, "width" | "height">;
type CrewBox = LabelBox & { stemShift?: number };

function CrewBillboard({ id, register, sizes, writing, invalidate }: {
  id: CrewId;
  register: (key: string, element: HTMLDivElement | null) => void;
  sizes: Map<CrewId, PlateSize>;
  writing: boolean;
  invalidate: () => void;
}) {
  const member = CREW[id];
  const { status, message, active, walking, resting, patrol } = useCrewReadout(id);
  const speech = useCrewStore((state) => state.avatars?.[id]?.speech);
  // Recorded traces keep playing after selfcheck.done; stay active through the short stops between paths.
  const tracing = useCrewStore((state) => state.phase !== "idle" && state.visuals[id]?.effect.kind === "trace");
  const working = writing || active || tracing || (walking && !!speech && !patrol);
  const compact = resting || (!walking && !working && !patrol && (status === "idle" || status === "done"));
  const text = id === "inspector" && speech?.kind === "inspection" ? speech.text : message;
  const plate = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = plate.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      sizes.set(id, { width, height });
      invalidate();
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    return () => { resize.disconnect(); sizes.delete(id); };
  }, [id, sizes, text, compact, working, writing, invalidate]);

  return (
    <div
      ref={(element) => register("crew:" + id, element)}
      className="pw3d-crew"
      data-status={status}
      data-active={working || undefined}
      data-thought={speech?.kind === "thought" || undefined}
      data-writing={writing || undefined}
      data-resting={resting || undefined}
      data-compact={compact || undefined}
      data-walking={walking || undefined}
      data-patrol={patrol || undefined}
      style={{
        "--pw3d-crew": `var(${member.colorVar})`,
        "--pw3d-stem-height": `${compact ? CREW_STEM.resting : CREW_STEM.active}px`,
      } as CSSProperties}
    >
      <div className="pw3d-crew-plate" ref={plate}>
        {/* Portraits ship with the app in public/crew. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/crew/${id}.png`} alt="" width={34} height={34} draggable={false} />
        <span className="pw3d-crew-text">
          <b className="pw3d-crew-name">
            {writing && <PenLine size={12} aria-hidden="true" />}{member.name}
            {id === "inspector" && !compact && <small>rules engine</small>}
          </b>
          <span className="pw3d-crew-message pw-mono" title={text}>{text}</span>
        </span>
      </div>
      <span className="pw3d-crew-stem" aria-hidden="true" />
    </div>
  );
}

export default function Overlay({ ref, scene, selectedId, hoveredId, highlighted, placedAssetId, thumbnail, workLabels, tools, briefing, invalidate }: OverlayProps) {
  const elements = useRef(new Map<string, HTMLDivElement>());
  const plateSizes = useRef(new Map<CrewId, PlateSize>());
  const work = useRef<CrewWorkLabelsHandle>(null);
  const motion = useRef<CrewWorkMotionHandle>(null);
  const labelled = useMemo(() => scene.nodes.filter((node) => node.label), [scene]);
  const focus = useRef({ selectedId, hoveredId, highlighted, placedAssetId });
  const nodes = useRef(labelled);
  useLayoutEffect(() => {
    focus.current = { selectedId, hoveredId, highlighted, placedAssetId };
    nodes.current = labelled;
  }, [selectedId, hoveredId, highlighted, placedAssetId, labelled]);
  useLayoutEffect(invalidate, [invalidate, workLabels, thumbnail]);

  const register = (key: string, element: HTMLDivElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };

  useImperativeHandle(ref, () => ({
    update(frame) {
      const { viewProjection, width, height, now } = frame;
      const current = focus.current;
      const reserved: LabelBox[] = [];
      for (const [id, element] of [["ui:tools", tools.current], ["ui:briefing", briefing.current]] as const) {
        if (!element) continue;
        const w = element.offsetWidth;
        const h = element.offsetHeight;
        reserved.push({ id, x: element.offsetLeft + w / 2, y: element.offsetTop + h,
          width: w, height: h, priority: 1e6, forced: true });
      }
      const boxes = [...reserved, ...(work.current?.boxes(frame) ?? [])];
      motion.current?.update(frame);

      // Crew stand on their real floor position; plates that would overlap are lifted on longer stems.
      const crewBoxes: CrewBox[] = [...reserved];
      const active = (id: CrewId) => Number(!!elements.current.get("crew:" + id)?.dataset.active);
      const crewOrder = [...CREW_ORDER].sort((a, b) => active(b) - active(a));
      for (const id of crewOrder) {
        const key = "crew:" + id;
        const element = elements.current.get(key);
        const size = plateSizes.current.get(id);
        if (!element || !size) continue;
        const point = crewPosition(id, now);
        const screen = projectToScreen(viewProjection, toWorld(point.x, point.y, 0.1), width, height);
        if (!screen.visible || screen.x < 0 || screen.x > width || size.width + 8 > width) continue;
        const x = Math.max(size.width / 2 + 4, Math.min(width - size.width / 2 - 4, screen.x));
        const stem = element.dataset.compact ? CREW_STEM.resting : CREW_STEM.active;
        let lift = stem;
        for (;;) {
          const bottom = screen.y - lift;
          const clash = crewBoxes.find((other) => {
            const otherBottom = other.y - (other.lift ?? 0);
            return Math.abs(other.x - x) < (other.width + size.width) / 2 + CREW_GAP
              && bottom > otherBottom - other.height - CREW_GAP && bottom - size.height < otherBottom + CREW_GAP;
          });
          if (!clash) break;
          // Round up past the clearance to keep repeated projections stable at subpixel anchors.
          lift = Math.floor(screen.y - clash.y + (clash.lift ?? 0) + clash.height + CREW_GAP) + 1;
        }
        if (screen.y - lift - size.height < 4) continue;
        const box: CrewBox = { id: key, x, y: screen.y, lift, ...size, priority: 9e5, forced: true, stemShift: screen.x - x };
        crewBoxes.push(box);
        boxes.push(box);
      }

      for (const node of nodes.current) {
        const element = elements.current.get(node.id);
        if (!element) continue;
        const screen = projectToScreen(viewProjection, node.anchor, width, height);
        const focused = node.id === current.selectedId || node.id === current.hoveredId || current.highlighted.has(node.id)
          || node.id === current.placedAssetId;
        const candidate = focused || isCandidate(node, screen.depth);
        if (!screen.visible || !candidate) continue;
        const selected = node.id === current.selectedId;
        const placed = node.id === current.placedAssetId;
        const labelWidth = element.offsetWidth + (placed ? 6 : 0);
        const labelHeight = element.offsetHeight + (placed ? 6 : 0);
        const x = selected || placed ? Math.max(labelWidth / 2 + 4, Math.min(width - labelWidth / 2 - 4, screen.x)) : screen.x;
        boxes.push({
          id: node.id,
          x,
          y: screen.y,
          alternates: selected || placed ? [
            { x, y: screen.y + labelHeight + 8 }, { x, y: screen.y - labelHeight - 8 },
            { x: x + labelWidth / 2 + 10, y: screen.y }, { x: x - labelWidth / 2 - 10, y: screen.y },
          ].filter(({ x, y }) => x - labelWidth / 2 >= 0 && x + labelWidth / 2 <= width && y - labelHeight >= 0 && y <= height)
            : node.labelAlternates?.map((anchor) => projectToScreen(viewProjection, anchor, width, height)).filter((point) => point.visible),
          width: labelWidth,
          height: labelHeight,
          priority: placed ? 86e4 : selected ? 85e4 : focused ? 7e5 : node.priority,
        });
      }

      const shown = declutter(boxes);
      work.current?.place(shown);
      for (const box of crewBoxes) {
        if (box.lift === undefined) continue;
        const element = elements.current.get(box.id);
        if (!element) continue;
        const stem = element.dataset.compact ? CREW_STEM.resting : CREW_STEM.active;
        const offset = `${box.lift - stem}px`;
        if (element.style.getPropertyValue("--pw3d-lift") !== offset) element.style.setProperty("--pw3d-lift", offset);
        const shift = `${box.stemShift ?? 0}px`;
        if (element.style.getPropertyValue("--pw3d-stem-shift") !== shift) element.style.setProperty("--pw3d-stem-shift", shift);
      }
      for (const [id, element] of elements.current) {
        const point = shown.get(id);
        const visibility = point ? "visible" : "hidden";
        if (element.style.visibility !== visibility) element.style.visibility = visibility;
        const opacity = point ? "1" : "0";
        if (element.style.opacity !== opacity) element.style.opacity = opacity;
        if (!point) continue;
        const transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        if (element.style.transform !== transform) element.style.transform = transform;
      }
    },
  }), [tools, briefing]);

  return (
    <div className="pw3d-overlay" aria-hidden="true">
      <CrewWorkMotion ref={motion} invalidate={invalidate} />
      {labelled.map((node) => (
        <div
          key={node.id}
          ref={(element) => register(node.id, element)}
          className="pw3d-label pw-mono"
          data-type={node.type}
          data-state={node.state}
          data-selected={node.id === selectedId || undefined}
          data-focus={node.id === hoveredId || highlighted.has(node.id) || undefined}
          data-placed={node.id === placedAssetId || undefined}
        >
          {node.id === placedAssetId && thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pw3d-label-thumb" alt="" src={`data:${thumbnail.mimeType};base64,${thumbnail.dataBase64}`} />
          )}
          <span>{node.label}</span>
          {node.id === selectedId && node.name && <span className="pw3d-label-name">{node.name}</span>}
        </div>
      ))}
      {CREW_ORDER.map((id) => <CrewBillboard key={id} id={id} register={register} sizes={plateSizes.current}
        writing={id === "chief" && workLabels.work.writing} invalidate={invalidate} />)}
      <CrewWorkLabels ref={work} scene={scene} thumbnail={thumbnail} placedAssetId={placedAssetId} {...workLabels} />
    </div>
  );
}

function isCandidate(node: SceneNode, depth: number): boolean {
  // Equipment and entry points receded by the lens are tagged only when focused or flagged.
  if (node.ghost) return node.state !== undefined;
  if (node.type === "area" || node.type === "entry") return true;
  if (node.type === "zone") return depth < 190;
  if (node.state || node.priority >= ALWAYS_TAG_PRIORITY) return true;
  return depth < NEAR_TAG_DISTANCE;
}
