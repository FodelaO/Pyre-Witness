/** One keyboard- and pointer-operated slider for Material, Both and Data. */
"use client";

import { Droplet, Link2, Network } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { LENS_LABELS, LENS_MODES, lensModeAt, restoreLensMode, useLensStore } from "./lensStore";

const ICONS = { material: Droplet, both: Link2, data: Network };

function positionAtPointer(event: PointerEvent<HTMLDivElement>) {
  const { left, width } = event.currentTarget.getBoundingClientRect();
  const firstStop = left + width / 6;
  return (event.clientX - firstStop) / (2 * width / 3);
}

export default function LensToggle() {
  const mode = useLensStore((state) => state.mode);
  const position = useLensStore((state) => state.position);
  const setMode = useLensStore((state) => state.setMode);
  const setPosition = useLensStore((state) => state.setPosition);
  const dragging = useLensStore((state) => state.dragging);
  const setDragging = useLensStore((state) => state.setDragging);
  const pointer = useRef<number | null>(null);
  const index = LENS_MODES.indexOf(mode);
  const nearest = lensModeAt(position);
  useEffect(restoreLensMode, []);
  useEffect(() => () => {
    if (pointer.current === null) return;
    const lens = useLensStore.getState();
    lens.setMode(lens.mode);
    lens.setDragging(false);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const stops: Record<string, number> = {
      "1": 0, "2": 1, "3": 2, Home: 0, End: 2,
      ArrowLeft: index - 1, ArrowDown: index - 1, ArrowRight: index + 1, ArrowUp: index + 1,
    };
    const target = stops[event.key];
    if (typeof target !== "number" || event.altKey || event.metaKey || event.ctrlKey || pointer.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    setMode(LENS_MODES[Math.min(2, Math.max(0, target))]);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || pointer.current !== null) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    setDragging(true);
    setPosition(positionAtPointer(event));
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setMode(commit ? lensModeAt(positionAtPointer(event)) : mode);
    setDragging(false);
  }

  return (
    <div className="lens-toggle" role="slider" tabIndex={0} aria-label="Pipeline lens"
      aria-valuemin={1} aria-valuemax={3} aria-valuenow={LENS_MODES.indexOf(nearest) + 1}
      aria-valuetext={LENS_LABELS[nearest]} data-dragging={dragging || undefined}
      style={{ "--lens-thumb-position": `${position * 100}%` } as CSSProperties}
      onKeyDown={onKeyDown} onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) setPosition(positionAtPointer(event));
      }}
      onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, false)}>
      <span className="lens-toggle-rail" aria-hidden="true"><span className="lens-toggle-thumb" /></span>
      {LENS_MODES.map((stop) => {
        const Icon = ICONS[stop];
        return (
          <span key={stop} className="lens-toggle-stop" data-stop={stop} data-current={nearest === stop || undefined} aria-hidden="true">
            <Icon size={16} strokeWidth={1.85} />
            <span>{LENS_LABELS[stop]}</span>
          </span>
        );
      })}
    </div>
  );
}
