/** Keeps the spotlight and caption anchored to the current app element. */
"use client";

import { RotateCcw, X } from "lucide-react";
import { useLayoutEffect, useRef, type MouseEventHandler } from "react";
import { tourController } from "./controller";
import { TOUR_STEP_IDS, type TourStepId } from "./stepIds";
import type { TourFrame } from "./tourMachine";

const edge = 12;
const gap = 14;
// Open app surfaces the caption must not cover (the capture fan, its card, popovers).
const SURFACES = ".pw-capture-toolbar, .pw-capture-card, .pw-es-popover, .pw-chief-bar, [role='dialog'], dialog[open]";
type Box = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export function TourSpotlight({ frame, completed, next, preserveEditor }: {
  frame: TourFrame;
  completed: TourStepId[];
  next: () => void;
  preserveEditor: MouseEventHandler<HTMLButtonElement>;
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
    let surfaces: Element[] = [];
    let nextLookup = 0;
    let last = "";
    let checkedScroll = false;
    const topBar = document.querySelector(".pw-top");
    function follow(now: number) {
      if (!overlay || !spotlight || !caption) return;
      animation = requestAnimationFrame(follow);
      if (now >= nextLookup || (current && !current.isConnected)) {
        current = find?.() ?? null;
        surfaces = Array.from(document.querySelectorAll(SURFACES)).filter((el) => !overlay.contains(el));
        nextLookup = now + 120;
      }
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      const cardWidth = caption.offsetWidth;
      const cardHeight = caption.offsetHeight;
      const anchor = current?.getBoundingClientRect();
      if (anchor && current && !checkedScroll) {
        checkedScroll = true;
        if (anchor.bottom <= 0 || anchor.top >= height || anchor.right <= 0 || anchor.left >= width) {
          current.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
      const clip = current?.closest(".pw-panel-readouts, .pw3d-overlay")?.getBoundingClientRect();
      const left = Math.max(1, (anchor?.left ?? 1) - 5, clip?.left ?? 1);
      const top = Math.max(1, (anchor?.top ?? 1) - 5, clip?.top ?? 1);
      const right = Math.min(width - 1, (anchor?.right ?? 1) + 5, clip?.right ?? width);
      const bottom = Math.min(height - 1, (anchor?.bottom ?? 1) + 5, clip?.bottom ?? height);
      const hasTarget = !!anchor && right > left && bottom > top;
      const xMax = width - cardWidth - edge;
      const yMin = Math.max(edge, Math.ceil(topBar?.getBoundingClientRect().bottom ?? 0) + edge);
      const yMax = height - cardHeight - edge;
      const alignedX = Math.max(edge, Math.min(right - cardWidth, xMax));
      const alignedY = Math.max(yMin, Math.min(top, yMax));
      const avoid = surfaces.map((el) => el.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
      // Surfaces touching the target (an open fan, the capture card around a sample) widen the anchor.
      const near = avoid.filter((box) => overlaps(box, { left: left - 80, top: top - 80, right: right + 80, bottom: bottom + 80 }));
      const outer = near.reduce((box, other) => ({
        left: Math.min(box.left, other.left), top: Math.min(box.top, other.top),
        right: Math.max(box.right, other.right), bottom: Math.max(box.bottom, other.bottom),
      }), { left, top, right, bottom });
      const candidates = hasTarget ? [
        [alignedX, bottom + gap], [alignedX, top - gap - cardHeight],
        [left - gap - cardWidth, alignedY], [right + gap, alignedY],
        [outer.right + gap, Math.max(yMin, Math.min(outer.top, yMax))], [outer.right + gap, yMax],
        [Math.max(edge, Math.min(outer.left, xMax)), outer.top - gap - cardHeight],
        [outer.left - gap - cardWidth, Math.max(yMin, Math.min(outer.top, yMax))],
      ] : [];
      const position = candidates.find(([x, y]) => x >= edge && x <= xMax && y >= yMin && y <= yMax
        && !avoid.some((box) => overlaps(box, { left: x, top: y, right: x + cardWidth, bottom: y + cardHeight })))
        ?? [Math.max(edge, xMax), Math.max(edge, Math.min(yMin, yMax))];
      const geometry = [left, top, right - left, bottom - top].map(Math.round);
      const key = `${hasTarget}|${geometry}|${position}`;
      if (key === last) return;
      last = key;
      overlay.dataset.target = String(hasTarget);
      const [ringX, ringY, ringWidth, ringHeight] = geometry;
      if (hasTarget) {
        spotlight.style.transform = `translate(${ringX}px, ${ringY}px)`;
        spotlight.style.width = `${ringWidth}px`;
        spotlight.style.height = `${ringHeight}px`;
      }
      caption.style.visibility = "visible";
      caption.style.transform = `translate(${position[0]}px, ${position[1]}px)`;
    }

    follow(performance.now());
    return () => cancelAnimationFrame(animation);
  }, [find]);

  const { index, total, status, title, text } = frame;
  const done = status === "done";
  const canAdvance = status === "ready" || status === "skipped";
  return (
    <div className="pw-tour" ref={layer}>
      <div className="pw-tour-ring" ref={ring} />
      <section className="pw-tour-card" data-proof={index === total} aria-label="Live demo · real models" ref={card}>
        <div className="pw-tour-heading">
          <span>Live demo · real models</span>
          <span className="pw-mono">{index < total ? `${index + 1}/${total}` : "Proof"}</span>
        </div>
        <div role="status">
          <h2>{title}</h2>
          <p data-skipped={status === "skipped" || text.startsWith("Skipped ·")}>{text}</p>
        </div>
        <div className="pw-tour-dots" role="group" aria-label="Demo steps">
          {TOUR_STEP_IDS.map((id, step) => {
            const label = tourController.stepTitle(id);
            const checked = completed.includes(id);
            return <button key={id} type="button" aria-label={checked ? `${label}, done` : label} title={label}
              aria-current={index === step ? "step" : undefined} data-done={checked}
              onMouseDown={preserveEditor} onClick={() => tourController.goTo(id)} />;
          })}
        </div>
        <div className="pw-tour-actions">
          {done
            ? <button type="button" onMouseDown={preserveEditor} onClick={tourController.start}><RotateCcw size={13} aria-hidden />Replay</button>
            : <>
              <button type="button" aria-disabled={!canAdvance} onMouseDown={preserveEditor} onClick={next}>Next →</button>
              <button type="button" onMouseDown={preserveEditor} onClick={tourController.skip}>Skip</button>
            </>}
          <button type="button" onMouseDown={preserveEditor} onClick={tourController.stop} aria-label="Stop demo"><X size={15} aria-hidden /></button>
        </div>
      </section>
    </div>
  );
}
