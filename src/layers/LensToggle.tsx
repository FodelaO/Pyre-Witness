/** One keyboard- and pointer-operated slider for Material, Both and Data. */
"use client";

import { Droplet, Link2, Network } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { LENS_LABELS, LENS_MODES, lensModeAt, restoreLensMode, useLensStore } from "./lensStore";

const ICONS = { material: Droplet, both: Link2, data: Network };

function positionAtPointer(x: number, edges: number[]) {
  const stop = x < edges[1] ? 0 : x < edges[2] ? 1 : 2;
  const fraction = (x - edges[stop]) / (edges[stop + 1] - edges[stop]);
  return (stop + fraction - 0.5) / 2;
}

export default function LensToggle() {
  const mode = useLensStore((state) => state.mode);
  const position = useLensStore((state) => state.position);
  const setMode = useLensStore((state) => state.setMode);
  const setPosition = useLensStore((state) => state.setPosition);
  const dragging = useLensStore((state) => state.dragging);
  const setDragging = useLensStore((state) => state.setDragging);
  const pointer = useRef<{ id: number; edges: number[] } | null>(null);
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
    const [material, both, data] = Array.from(event.currentTarget.children, (stop) => stop.getBoundingClientRect());
    // Keep hit ranges stable while the preview label expands its segment.
    const edges = [material.left, (material.right + both.left) / 2, (both.right + data.left) / 2, data.right];
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, edges };
    setDragging(true);
    setPosition(positionAtPointer(event.clientX, edges));
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const drag = pointer.current;
    if (drag?.id !== event.pointerId) return;
    pointer.current = null;
    setMode(commit ? lensModeAt(positionAtPointer(event.clientX, drag.edges)) : mode);
    setDragging(false);
  }

  return (
    <div className="lens-toggle" role="slider" tabIndex={0} aria-label="Pipeline lens"
      aria-description="1 for Material, 2 for Both, 3 for Data."
      aria-valuemin={1} aria-valuemax={3} aria-valuenow={LENS_MODES.indexOf(nearest) + 1}
      aria-valuetext={LENS_LABELS[nearest]} data-dragging={dragging || undefined}
      onKeyDown={onKeyDown} onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        const drag = pointer.current;
        if (drag?.id === event.pointerId) setPosition(positionAtPointer(event.clientX, drag.edges));
      }}
      onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, false)}>
      {LENS_MODES.map((stop) => {
        const Icon = ICONS[stop];
        const label = LENS_LABELS[stop];
        const current = nearest === stop;
        return (
          <span key={stop} className="lens-toggle-stop" data-stop={stop} data-current={current || undefined}
            data-pw-tip={current ? undefined : label}>
            <Icon size={14} strokeWidth={1.85} role="img" aria-label={label} />
            {current && <span>{label}</span>}
          </span>
        );
      })}
    </div>
  );
}
