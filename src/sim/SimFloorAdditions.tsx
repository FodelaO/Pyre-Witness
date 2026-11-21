/** Adds the carbonation launcher and completed-run comparison to the floor view. */
"use client";

import { Gauge } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { counterfactualText } from "./outcome";
import { ALL_SCENARIOS } from "./scenarios";
import { useSimStore } from "./simStore";
import "./sim-comparison.css";

const label = ALL_SCENARIOS.carbonation.label;
const nullHost = () => null;

export default function SimFloorAdditions({ floor }: { floor: HTMLDivElement }) {
  const host = useCallback(() => {
    const rail = floor.querySelector(".pw-sim-launchers");
    if (rail?.querySelector(`button[aria-label="${label}"]:not([data-floor-carbonation])`)) return null;
    return rail;
  }, [floor]);
  const subscribe = useCallback((listener: () => void) => {
    const observer = new MutationObserver(listener);
    observer.observe(floor, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [floor]);
  const rail = useSyncExternalStore(subscribe, host, nullHost);
  const mode = useSimStore((state) => state.mode);
  const run = useSimStore((state) => state.run);
  const start = useSimStore((state) => state.start);

  return (
    <>
      {rail && createPortal(
        <button type="button" className="pw-tool-button" data-floor-carbonation onClick={() => start("carbonation")}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={label} aria-pressed={run?.id === "carbonation"} data-pw-tip={label} data-pw-tip-side="top">
          <Gauge size={18} strokeWidth={1.65} aria-hidden />
        </button>, rail,
      )}
      {mode === "finished" && run && createPortal(
        <aside className="pw-sim-comparison" aria-label="Simulated outcome comparison" aria-live="polite" aria-atomic="true">
          <p><strong>Simulated outcome</strong> {run.consequence.summary}</p>
          <p><strong>Counterfactual</strong> {counterfactualText(run)}</p>
        </aside>, floor,
      )}
    </>
  );
}
