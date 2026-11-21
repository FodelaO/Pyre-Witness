/**
 * Full-screen review of the 3D view with its 2D | 3D switch and the lens, reading the same
 * stores as the app. Optional query for screenshots: ?select=FIL-3&lens=both&hover=HMI-F3.
 */
"use client";

import { useEffect } from "react";
import { useCrewConnection } from "@/crew/crewStore";
import { useIdlePatrol } from "@/crew/patrol";
import { LENS_LABELS, LENS_MODES, useLensStore, type LensMode } from "@/layers/lensStore";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import View3DStage from "@/view3d/View3DStage";
import View3DToggle, { useWebGL2Support } from "@/view3d/View3DToggle";
import { useView3DStore } from "@/view3d/view3dStore";
import "@/view3d/view3d.css";

export default function Review3D() {
  // The crew on this page is the real one: pipeline events move it, the idle patrol is labelled.
  useCrewConnection();
  useIdlePatrol();
  const enabled = useView3DStore((state) => state.enabled);
  const lens = useLensStore((state) => state.mode);
  const supported = useWebGL2Support();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const wanted = query.get("lens");
    const mode = LENS_MODES.find((item) => item === wanted);
    if (mode) useLensStore.getState().setMode(mode);
    // Selecting after the fly-in behaves like a selection made in another view: the camera frames it.
    const select = query.get("select");
    const timer = select ? window.setTimeout(() => useTwinStore.getState().select(select), 2200) : null;
    const hover = query.get("hover");
    if (hover) useTwinStore.getState().setHighlight(hover.split(","));
    useView3DStore.getState().setEnabled(true);
    // Development only: lets the QA screenshot script drive the real stores (never in production).
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__pw3dStores = { useTwinStore, useRunStore, useLensStore, useView3DStore };
    }
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="pw3d-review">
      <div className="pw3d-review-bar">
        <View3DToggle />
        <div className="pw3d-toggle" role="radiogroup" aria-label="Pipeline lens">
          {LENS_MODES.map((mode: LensMode) => (
            <button key={mode} type="button" role="radio" aria-checked={lens === mode} onClick={() => useLensStore.getState().setMode(mode)}>
              {LENS_LABELS[mode]}
            </button>
          ))}
        </div>
        <span className="pw3d-review-title pw-mono">PYRE WITNESS · 3D REVIEW</span>
      </div>
      {!enabled && (
        <div className="pw3d-review-2d pw-mono">
          {supported === false ? "WEBGL2 NOT AVAILABLE · USE THE 2D FLOOR" : "2D SELECTED · THE 2D FLOOR LIVES IN THE APP"}
        </div>
      )}
      <View3DStage />
    </main>
  );
}
