/**
 * Crisp HTML over the WebGL canvas: asset tags, room names, entry points and the AI crew as
 * portrait billboards. The render loop calls update() each drawn frame to re-project them.
 * Crew positions, states and messages are read straight from the real crew store.
 */
"use client";

import { useImperativeHandle, useLayoutEffect, useMemo, useRef, type CSSProperties, type Ref } from "react";
import { crewAvatar, crewLive, crewPosition, useCrewStore } from "@/crew/crewStore";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import type { CaptureImage } from "@/pipeline/types";
import { projectToScreen, type Mat4 } from "./gl/mat4";
import { declutter, estimateWidth, type LabelBox } from "./labels";
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
}

/** Tags of equipment at least this prominent are candidates at any zoom (tanks, filler, skids). */
const ALWAYS_TAG_PRIORITY = 120;
/** Closer than this (metres from the camera) every tag becomes a candidate. */
const NEAR_TAG_DISTANCE = 62;
const CREW_BOX = { width: 136, resting: 44, height: 60 };
/** Vertical step between stacked crew plates, in CSS pixels. */
const CREW_STEP = 46;

function shorten(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function CrewBillboard({ id, register }: { id: CrewId; register: (key: string, element: HTMLDivElement | null) => void }) {
  const member = CREW[id];
  const avatar = crewAvatar(id, useCrewStore((state) => state.avatars));
  const live = crewLive(id, useCrewStore((state) => state.live));
  // The idle patrol keeps its label: it is an observation round, never a finding.
  const patrol = avatar.speech?.kind === "patrol" || live.message.startsWith("idle patrol");
  const status = patrol ? "idle patrol" : shorten(live.message, 30);
  // Quiet at the desk (portrait + name); full plate with the live status once it works or walks.
  const resting = !patrol && !avatar.walking && live.status === "idle" && !avatar.speech;
  return (
    <div
      ref={(element) => register("crew:" + id, element)}
      className="pw3d-crew"
      data-status={live.status}
      data-resting={resting || undefined}
      data-walking={avatar.walking || undefined}
      data-patrol={patrol || undefined}
      style={{ "--pw3d-crew": `var(${member.colorVar})` } as CSSProperties}
    >
      <div className="pw3d-crew-plate">
        {/* Portraits ship with the app in public/crew. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/crew/${id}.png`} alt="" width={34} height={34} draggable={false} />
        <span className="pw3d-crew-text">
          <b>{member.name}</b>
          <span className="pw-mono">{status}</span>
        </span>
      </div>
      <span className="pw3d-crew-stem" aria-hidden="true" />
    </div>
  );
}

export default function Overlay({ ref, scene, selectedId, hoveredId, highlighted, placedAssetId, thumbnail }: OverlayProps) {
  const elements = useRef(new Map<string, HTMLDivElement>());
  const labelled = useMemo(() => scene.nodes.filter((node) => node.label), [scene]);
  const focus = useRef({ selectedId, hoveredId, highlighted, placedAssetId });
  const nodes = useRef(labelled);
  useLayoutEffect(() => {
    focus.current = { selectedId, hoveredId, highlighted, placedAssetId };
    nodes.current = labelled;
  }, [selectedId, hoveredId, highlighted, placedAssetId, labelled]);

  const register = (key: string, element: HTMLDivElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };

  useImperativeHandle(ref, () => ({
    update(frame) {
      const { viewProjection, width, height, now } = frame;
      const current = focus.current;
      const boxes: LabelBox[] = [];
      const anchors = new Map<string, { x: number; y: number }>();

      // Crew stand on their real floor position; plates that would overlap are lifted on longer stems.
      const crewBoxes: LabelBox[] = [];
      for (const id of CREW_ORDER) {
        const key = "crew:" + id;
        const element = elements.current.get(key);
        if (!element) continue;
        const point = crewPosition(id, now);
        const screen = projectToScreen(viewProjection, toWorld(point.x, point.y, 0.1), width, height);
        if (!screen.visible) {
          element.style.opacity = "0";
          continue;
        }
        const boxWidth = element.dataset.resting ? CREW_BOX.resting : CREW_BOX.width;
        let lift = 0;
        const clashes = (other: LabelBox) =>
          Math.abs(other.x - screen.x) < (other.width + boxWidth) / 2 && Math.abs(other.y - (screen.y - lift)) < CREW_STEP;
        while (lift < CREW_STEP * 4 && crewBoxes.some(clashes)) lift += CREW_STEP;
        element.style.setProperty("--pw3d-lift", lift + "px");
        anchors.set(key, screen);
        const box: LabelBox = { id: key, x: screen.x, y: screen.y - lift, width: boxWidth, height: CREW_BOX.height, priority: 9e5, forced: true };
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
        if (!screen.visible || !candidate) {
          element.style.opacity = "0";
          continue;
        }
        anchors.set(node.id, screen);
        const text = node.label ?? "";
        const selected = node.id === current.selectedId;
        boxes.push({
          id: node.id,
          x: screen.x,
          y: screen.y,
          width: estimateWidth(selected && node.name ? text + "  " + node.name : text, node.type === "asset" ? 11 : 10.5, 16),
          height: 20,
          priority: selected ? 8e5 : focused ? 7e5 : node.priority,
          forced: focused,
        });
      }

      // The caption (bottom left) and the tools row (bottom right) are never covered by a tag.
      boxes.push({ id: "ui:caption", x: 14 + 112, y: height - 8, width: 224, height: 30, priority: 1e6, forced: true });
      boxes.push({ id: "ui:tools", x: width - 14 - 215, y: height - 8, width: 430, height: 34, priority: 1e6, forced: true });

      const shown = declutter(boxes);
      for (const [key, screen] of anchors) {
        const element = elements.current.get(key);
        if (!element) continue;
        const visible = shown.has(key);
        element.style.opacity = visible ? "1" : "0";
        if (visible) element.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    },
  }), []);

  return (
    <div className="pw3d-overlay" aria-hidden="true">
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
      {CREW_ORDER.map((id) => <CrewBillboard key={id} id={id} register={register} />)}
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
