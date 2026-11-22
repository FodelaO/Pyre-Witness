/** Mounts the demo card and controls for the shared tour controller. */
"use client";

import { ArrowRight, Play, Square } from "lucide-react";
import { useEffect, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { tourController, useTourStore } from "./controller";
import { TourSpotlight } from "./TourSpotlight";
import { handleTourArrow, isEditing } from "./tourAdvance";
import "./tour.css";

export default function PlayDemo() {
  const { frame, completed } = useTourStore();
  const visible = frame !== null;
  const running = visible && frame.status !== "done";
  const canAdvance = frame?.status === "ready" || frame?.status === "skipped";

  // A pointer press on Next always counts; only the ArrowRight shortcut defers to an open editor.
  function next() {
    tourController.next();
  }

  function preserveEditor(event: MouseEvent<HTMLButtonElement>) {
    if (isEditing(document.activeElement)) event.preventDefault();
  }

  useEffect(() => () => { tourController.stop(); }, []);
  useEffect(() => {
    if (!visible) return;
    function escape(event: KeyboardEvent) {
      // Bubble phase: an Escape that closes a chat, popover, or capture card is not a demo stop.
      if (event.key === "Escape" && !event.defaultPrevented) tourController.stop();
    }
    function arrow(event: KeyboardEvent) {
      handleTourArrow(event, document.activeElement, tourController.next);
    }
    window.addEventListener("keydown", escape);
    window.addEventListener("keydown", arrow);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("keydown", arrow);
    };
  }, [visible]);

  return (
    <div className="pw-tour-controls">
      <button type="button" className="pw-tour-launch" data-running={running}
        aria-label={running ? "Next demo step" : "Play demo"}
        aria-keyshortcuts={running ? "ArrowRight" : undefined}
        title={running ? "Next demo step (→)" : "Play the live demo"}
        aria-disabled={running && !canAdvance}
        onMouseDown={preserveEditor}
        onClick={running ? next : tourController.start}>
        {running ? <ArrowRight size={15} aria-hidden /> : <Play size={15} fill="currentColor" aria-hidden />}
      </button>
      {visible && <button type="button" className="pw-tour-launch" aria-label="Stop demo"
        aria-keyshortcuts="Escape" title="Stop the live demo (Esc)"
        onMouseDown={preserveEditor} onClick={tourController.stop}>
        <Square size={12} fill="currentColor" aria-hidden />
      </button>}
      {frame && createPortal(
        <TourSpotlight frame={frame} completed={completed} next={next} preserveEditor={preserveEditor} />,
        document.body,
      )}
    </div>
  );
}
