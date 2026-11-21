/** Places capture evidence and rules-engine labels at projected points on the twin. */
"use client";

import { useImperativeHandle, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { Check, FileText, Radio, ScanLine } from "lucide-react";
import type { CrewVisual } from "@/crew/director";
import { resolveDropPoint } from "@/pipeline/assetFromProfile";
import type { CaptureImage } from "@/pipeline/types";
import type { Point } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import { evidencePreview, type WorkRun } from "./crewWork";
import { projectToScreen, type Vec3 } from "./gl/mat4";
import type { LabelBox } from "./labels";
import type { OverlayFrame } from "./Overlay";
import { toWorld } from "./parts";
import type { Scene } from "./scene";

export interface CrewWorkLabelsHandle {
  boxes: (frame: OverlayFrame) => LabelBox[];
  place: (shown: ReadonlyMap<string, Point>) => void;
}

interface Cue {
  id: string;
  anchor: Vec3;
  priority: number;
  body: ReactNode;
  tone: "scout" | "rank" | "proposal" | "check" | "pass";
  offset?: number;
}

export interface CrewWorkLabelProps {
  ref: Ref<CrewWorkLabelsHandle>;
  work: WorkRun;
  twin: Twin;
  scene: Scene;
  thumbnail: CaptureImage | null;
  scout?: CrewVisual;
  architect?: CrewVisual;
  inspector?: CrewVisual;
  proposalPoint?: Point;
  proposalHeld: boolean;
  checkPoint?: Point;
  placedAssetId: string | null;
}

export default function CrewWorkLabels({ ref, work, twin, scene, thumbnail, scout, architect, inspector, proposalPoint, proposalHeld, checkPoint, placedAssetId }: CrewWorkLabelProps) {
  const elements = useRef(new Map<string, HTMLDivElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const anchors = useRef(new Map<string, Point & { w: number; h: number }>());
  const cues: Cue[] = [];
  const proposalCleared = architect?.kind === "proposal" && !proposalHeld && work.proposalCheck?.event.result.passed;
  if (work.start && work.reading) {
    const drop = resolveDropPoint(twin, work.start.dropPoint);
    const kind = work.start.input.kind;
    cues.push({ id: "work:capture", anchor: toWorld(drop.x, drop.y, 2.2), priority: 65e4, tone: "scout",
      body: <>
        {/* The thumbnail is the actual browser capture or fetched product image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumbnail && <img className="pw3d-work-image" alt="" src={`data:${thumbnail.mimeType};base64,${thumbnail.dataBase64}`} />}
        <span className="pw3d-work-caption"><ScanLine size={13} />{thumbnail || kind === "photo" ? "Capture" : kind === "link" ? "Product page" : "Device description"}</span>
      </>,
    });
  }
  if (work.evidence && scout?.kind === "evidence") {
    const chips = evidencePreview(scout.chips);
    if (chips.length) cues.push({ id: `work:evidence:${work.start?.runId}`, anchor: toWorld(scout.drop.x, scout.drop.y, 2.8),
      priority: 64e4, tone: "scout", body: <>
        <b className="pw3d-work-device" title={scout.device}>{scout.device}</b>
        <ul className="pw3d-work-evidence">
          {chips.map(({ kind, text }, index) => <li key={kind} title={text} data-source={kind} style={{ "--pw3d-chip-delay": `${index * 145}ms` } as CSSProperties}>
            {kind === "radio" ? <Radio size={12} /> : <FileText size={12} />}
            <b>{kind}</b><span>{text}</span>
          </li>)}
        </ul>
      </>,
    });
  }
  if (architect?.kind === "ranked") {
    architect.areas.forEach((id, index) => {
      const area = scene.byId.get(id);
      if (area) cues.push({ id: `work:rank:${id}`, anchor: area.anchor, tone: "rank", priority: 57e4 - index,
        body: <>
          <span className="pw3d-work-caption">{index + 1} · {area.label}</span>
          {index === 0 && <span className="pw3d-work-ranking-source">rules engine ranking</span>}
        </> });
    });
  } else if (architect?.kind === "proposal") {
    const { x, y } = proposalPoint ?? architect.to;
    const name = scene.byId.get(architect.area)?.label;
    cues.push({ id: "work:proposal", anchor: toWorld(x, y, 3.2), tone: proposalHeld ? "check" : "proposal", priority: 66e4,
      body: <>
        <span className="pw3d-work-caption">
          {proposalCleared && <Check size={14} strokeWidth={3} />}
          {proposalHeld ? "Placement on hold" : "Recommended"}{name && ` · ${name}`}
        </span>
        {proposalCleared && <span className="pw3d-work-ranking-source">rules engine cleared</span>}
      </> });
  }
  if (inspector?.kind === "check") {
    const recorded = work.checks.get(inspector.phase)?.event.result;
    const stamps = new Map<string, { point: Point; rules: Set<string> }>();
    for (const { assetId, point, ruleId } of inspector.stamps) {
      const group = stamps.get(assetId) ?? { point, rules: new Set<string>() };
      group.rules.add(ruleId);
      stamps.set(assetId, group);
    }
    for (const [assetId, { point, rules }] of stamps) {
      const asset = scene.byId.get(assetId);
      const position = assetId === placedAssetId && checkPoint ? checkPoint : point;
      cues.push({ id: `work:stamp:${assetId}`, anchor: toWorld(position.x, position.y, (asset?.height ?? 1) + 1.1),
        body: <span className="pw3d-work-caption" title={`${assetId} · rules engine`}>{[...rules].join(" · ")}</span>, tone: "check", priority: 69e4, offset: 19 });
    }
    if ((recorded?.passed ?? inspector.passed) && (inspector.phase === "as-dropped" || !proposalCleared)) {
      const { x, y } = checkPoint ?? inspector.at;
      cues.push({ id: "work:pass", anchor: toWorld(x, y, 3), tone: "pass", priority: 68e4,
        body: <span className="pw3d-work-caption"><Check size={14} strokeWidth={3} />{stamps.size ? "No blocking findings" : "Rules check passed"}</span> });
    }
  }

  useImperativeHandle(ref, () => ({
    boxes({ viewProjection, width, height }) {
      anchors.current.clear();
      return cues.flatMap(({ id, anchor, priority, offset = 12 }) => {
        const node = elements.current.get(id);
        if (!node) return [];
        const p = projectToScreen(viewProjection, anchor, width, height);
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        if (!p.visible || w + 12 > width || h + 12 > height) return [];
        anchors.current.set(id, { x: p.x, y: p.y, w, h });
        const x = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, p.x));
        const y = Math.max(h + 6, Math.min(height - 6, p.y - offset));
        const right = p.x + w / 2 + 18;
        const left = p.x - w / 2 - 18;
        const below = p.y + h + 18;
        const alternates = [
          { x: right, y }, { x: left, y }, { x, y: below }, { x, y: y - 38 },
          { x: right, y: below }, { x: left, y: below }, { x, y: below + 35 }, { x, y: y - 76 },
        ].filter((point) => point.x - w / 2 >= 6 && point.x + w / 2 <= width - 6 && point.y - h >= 6 && point.y <= height - 6);
        return [{ id, x, y, width: w, height: h, priority, alternates }];
      });
    },
    place(shown) {
      for (const [id, element] of elements.current) {
        const point = shown.get(id);
        element.style.visibility = point ? "visible" : "hidden";
        if (point) element.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0) translate(-50%,-100%)`;
        const line = leaders.current.get(id);
        const anchor = anchors.current.get(id);
        if (!line) continue;
        if (!point || !anchor) {
          line.setAttribute("visibility", "hidden");
          continue;
        }
        const endX = Math.max(point.x - anchor.w / 2, Math.min(point.x + anchor.w / 2, anchor.x));
        const endY = Math.max(point.y - anchor.h, Math.min(point.y, anchor.y));
        line.setAttribute("x1", `${anchor.x}`);
        line.setAttribute("y1", `${anchor.y}`);
        line.setAttribute("x2", `${endX}`);
        line.setAttribute("y2", `${endY}`);
        line.setAttribute("visibility", "visible");
      }
    },
  }));

  return <>
    <svg className="pw3d-work-motion pw3d-work-leaders" aria-hidden="true">
      {cues.filter(({ tone }) => tone !== "rank").map(({ id }) => <line key={id} visibility="hidden"
        ref={(line) => { if (line) leaders.current.set(id, line); else leaders.current.delete(id); }} />)}
    </svg>
    {cues.map(({ id, tone, body }) => <div key={id} className="pw3d-work-plate pw-mono" data-work={tone}
      ref={(node) => { if (node) elements.current.set(id, node); else elements.current.delete(id); }}>
      {body}
    </div>)}
  </>;
}
