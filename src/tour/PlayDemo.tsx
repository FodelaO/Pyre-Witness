/** Mounts the live demo control and owns its start, stop, and replay lifecycle. */
"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TourSpotlight } from "./TourSpotlight";
import { tourLock } from "./tourLock";
import type { TourFrame } from "./tourMachine";
import "./tour.css";

export default function PlayDemo() {
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState<TourFrame | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const visible = running || frame !== null;

  function stop() {
    tourLock.stop();
    setRunning(false);
    setFrame(null);
    trigger.current?.focus({ preventScroll: true });
  }

  async function start() {
    const controller = tourLock.acquire();
    if (!controller) return;
    setFrame(null);
    setRunning(true);
    try {
      const [{ runTour }, { captureSteps }, { operationsSteps }, { proofStep }] = await Promise.all([
        import("./tourMachine"), import("./captureSteps"), import("./operationsSteps"), import("./proofStep"),
      ]);
      await runTour([...captureSteps(), ...operationsSteps], proofStep, controller.signal, setFrame);
    } catch {
      if (!controller.signal.aborted) {
        setFrame({ index: 6, total: 6, status: "done", title: "Live demo unavailable", text: "Skipped · The demo could not load." });
      }
    } finally {
      if (tourLock.release(controller)) setRunning(false);
    }
  }

  useEffect(() => () => tourLock.stop(), []);
  useEffect(() => {
    if (!visible) return;
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      stop();
    }
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [visible]);

  return (
    <>
      <button type="button" ref={trigger} className="pw-tour-launch" data-running={running}
        aria-label={running ? "Stop demo" : "Play demo"}
        aria-keyshortcuts={running ? "Escape" : undefined}
        title={running ? "Stop the live demo (Esc)" : "Play the live demo"}
        onClick={running ? stop : start}>
        {running ? <Square size={14} fill="currentColor" aria-hidden /> : <Play size={15} fill="currentColor" aria-hidden />}
      </button>
      {frame && createPortal(<TourSpotlight frame={frame} replay={start} dismiss={stop} />, document.body)}
    </>
  );
}
