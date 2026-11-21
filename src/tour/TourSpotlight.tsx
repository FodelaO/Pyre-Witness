/** Keeps the spotlight and caption anchored to the current app element. */
"use client";

import { RotateCcw, X } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { TourFrame } from "./tourMachine";

const edge = 12;
const gap = 14;

export function TourSpotlight({ frame, replay, dismiss }: {
  frame: TourFrame;
  replay: () => void;
  dismiss: () => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const find = frame.target;

  useLayoutEffect(() => {
    const overlay = layer.current;
    const spotlight = ring.current;
    const caption = card.current;
    if (!overlay || !spotlight || !caption) return;

    let animation: number;
    let current: Element | null = null;
    let nextLookup = 0;
    let last = "";
    function follow(now: number) {
      if (!overlay || !spotlight || !caption) return;
      animation = requestAnimationFrame(follow);
      if (now >= nextLookup || (current && !current.isConnected)) {
        current = find?.() ?? null;
        nextLookup = now + 120;
      }
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      const cardWidth = caption.offsetWidth;
      const cardHeight = caption.offsetHeight;
      const anchor = current?.getBoundingClientRect();
      const clip = current?.closest(".pw-panel-readouts, .pw3d-overlay")?.getBoundingClientRect();
      const projectedAsset = current?.classList.contains("pw3d-label");
      const padding = projectedAsset ? 16 : 6;
      const left = Math.max(1, (anchor?.left ?? 1) - padding, clip?.left ?? 1);
      const top = Math.max(1, (anchor?.top ?? 1) - padding, clip?.top ?? 1);
      const right = Math.min(width - 1, (anchor?.right ?? 1) + padding, clip?.right ?? width);
      const bottom = Math.min(height - 1, (anchor?.bottom ?? 1) + (projectedAsset ? 138 : padding), clip?.bottom ?? height);
      const hasTarget = !!anchor && right - left >= 5 && bottom - top >= 5;
      const dockLeft = left - gap - cardWidth;
      const dockRight = right + gap;
      const dockUp = top - gap - cardHeight;
      const dockDown = bottom + gap;
      const xMax = width - cardWidth - edge;
      const yMax = height - cardHeight - edge;
      let x = xMax;
      let y = 88;

      if (hasTarget) {
        x = right - cardWidth;
        y = dockDown;
        if (dockDown > yMax && dockUp >= edge) y = dockUp;
        // Keep the caption alongside tall targets so the outlined content stays visible.
        if ((bottom - top > 170 || (dockDown > yMax && dockUp < edge))
          && (dockLeft >= edge || dockRight <= xMax)) {
          x = dockLeft >= edge ? dockLeft : dockRight;
          y = top;
        }
      }
      const clamp = (value: number, max: number) => Math.round(Math.max(edge, Math.min(value, max)));
      const geometry = [left, top, right - left, bottom - top].map(Math.round);
      const cardPosition = [clamp(x, xMax), clamp(y, yMax)];
      const key = `${hasTarget}|${geometry}|${cardPosition}`;
      if (key === last) return;
      last = key;
      overlay.dataset.target = String(hasTarget);
      const [ringX, ringY, ringWidth, ringHeight] = geometry;
      if (hasTarget) {
        spotlight.style.transform = `translate(${ringX}px, ${ringY}px)`;
        spotlight.style.width = `${ringWidth}px`;
        spotlight.style.height = `${ringHeight}px`;
      }
      caption.style.transform = `translate(${cardPosition[0]}px, ${cardPosition[1]}px)`;
    }

    follow(performance.now());
    return () => cancelAnimationFrame(animation);
  }, [find]);

  const { index, total, status, title, text } = frame;
  const done = status === "done";
  const progress = Math.min(index + 1, total) / total;
  return (
    <div className="pw-tour" ref={layer}>
      <div className="pw-tour-shade" aria-hidden />
      <div className="pw-tour-ring" ref={ring} aria-hidden />
      <section className="pw-tour-card" data-proof={index === total} aria-label="Live demo · real models" ref={card}>
        <div className="pw-tour-heading">
          <span>Live demo · real models</span>
          <span className="pw-mono">{index < total ? `${index + 1}/${total}` : "Proof"}</span>
        </div>
        <div role="status">
          <h2>{title}</h2>
          <p data-skipped={status === "skipped" || text.startsWith("Skipped ·")}>{text}</p>
        </div>
        {done && <div className="pw-tour-actions">
          <button type="button" className="pw-tour-replay" onClick={replay}><RotateCcw size={13} aria-hidden />Done · Replay</button>
          <button type="button" className="pw-tour-dismiss" onClick={dismiss} aria-label="Close demo"><X size={15} aria-hidden /></button>
        </div>}
        <div className="pw-tour-track" aria-hidden>
          <div style={{ transform: `scaleX(${progress})` }} />
        </div>
      </section>
    </div>
  );
}
