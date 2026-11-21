/** Positions the drawing, fixed instrument dock and responsive results rail. */
"use client";

import { lazy, useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import CaptureCard from "@/capture/CaptureCard";
import CrewDock from "@/crew/CrewDock";
import { useCrewConnection } from "@/crew/crewStore";
import EscalationCall from "@/escalation/EscalationCall";
import PlantFloor from "@/floor/PlantFloor";
import { LENS_MODES, useLensStore, type LensMode } from "@/layers/lensStore";
import SidePanel from "@/panel/SidePanel";
import { useRunStore } from "@/pipeline/runStore";
import PurdueMap from "@/purdue/PurdueMap";
import { startSimRuntime } from "@/sim/runtime";
import SimControls from "@/sim/SimControls";
import { useSimStore } from "@/sim/simStore";
import TranscriptDrawer from "@/transcript/TranscriptDrawer";
import { useDropStore } from "@/twin/dropPoint";
import { useTwinStore } from "@/twin/store";
import View3DStage from "@/view3d/View3DStage";
import { useView3DStore } from "@/view3d/view3dStore";
import { Slot } from "./Slot";
import { TopBar } from "./TopBar";
import { useCaptureLensNotice } from "./useCaptureLensNotice";

const TalkToChief = lazy(() => import(/* turbopackOptional: true */ "@/voice/TalkToChief"));

const DRAWER_QUERY = "(width < 1100px)";

function subscribeDrawerWidth(onChange: () => void) {
  const width = window.matchMedia(DRAWER_QUERY);
  width.addEventListener("change", onChange);
  return () => width.removeEventListener("change", onChange);
}

const drawerWidth = () => window.matchMedia(DRAWER_QUERY).matches;

export default function AppShell() {
  useCrewConnection();
  useEffect(startSimRuntime, []);
  const lensNotice = useCaptureLensNotice();
  const requestedView = useTwinStore((state) => state.view);
  const mode = useLensStore((state) => state.mode);
  const view = mode === "data" && requestedView !== "floor" ? "split" : "floor";
  const pinning = useDropStore((state) => state.armed);
  const view3d = useView3DStore((state) => state.enabled);
  // Choosing a drop point needs the 2D drawing.
  useEffect(() => { if (pinning) useView3DStore.getState().setEnabled(false); }, [pinning]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [modelerOpen, setModelerOpen] = useState(false);
  const [captureEditor, setCaptureEditor] = useState<HTMLDivElement | null>(null);
  const [watchChoices, setWatchChoices] = useState<Partial<Record<LensMode, boolean>>>({});
  const [watchReveal, setWatchReveal] = useState(0);
  const watchOpen = watchChoices[mode] ?? mode === "data";
  const setWatchOpen = useCallback((open: boolean) => {
    if (open !== watchOpen) setWatchChoices((choices) => ({ ...choices, [mode]: open }));
  }, [mode, watchOpen]);
  const narrow = useSyncExternalStore(subscribeDrawerWidth, drawerWidth, () => false);
  const previewModel = modelerOpen && mode !== "data" && !captureOpen && (!narrow || drawerOpen);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawerTrigger = useRef<HTMLElement | null>(null);

  const revealResults = useEffectEvent(() => {
    if (!drawerWidth() || drawerOpen || captureOpen || useDropStore.getState().armed) return;
    const current = document.activeElement;
    if (current instanceof HTMLElement && current.closest(".pw-stage")) {
      drawerTrigger.current = current;
      requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    }
    setDrawerOpen(true);
  });

  useEffect(() => {
    const capture = useRunStore.subscribe((next, previous) => {
      if (next.events[0]?.type === "run.started" && next.events[0].mode !== "reassess"
        && (next.runId !== previous.runId || next.status !== previous.status)
        && (next.status === "done" || (next.status === "error" && next.assessment))) revealResults();
    });
    const simulation = useSimStore.subscribe((next, previous) => {
      if (next.outcome && (next.outcome !== previous.outcome || next.run !== previous.run)) revealResults();
    });
    const proposals = useTwinStore.subscribe((next, previous) => {
      if (next.mitigations !== previous.mitigations && next.mitigations.some((item) => item.status === "proposed"
        && "simulationScenario" in item && !previous.mitigations.some(({ id }) => id === item.id))) revealResults();
    });
    return () => { capture(); simulation(); proposals(); };
  }, []);

  useLayoutEffect(() => {
    if (requestedView !== view) useTwinStore.getState().setView(view);
  }, [requestedView, view]);

  useEffect(() => {
    function lensKeys(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable], [role='textbox'], .lens-toggle")) return;
      const mode = LENS_MODES["123".indexOf(event.key)];
      if (event.key.length !== 1 || !mode) return;
      const lens = useLensStore.getState();
      if (lens.dragging) return;
      event.preventDefault();
      lens.setMode(mode);
    }
    window.addEventListener("keydown", lensKeys);
    return () => window.removeEventListener("keydown", lensKeys);
  }, []);

  const changeCapture = useCallback((open: boolean) => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement.closest(".pw-stage")) {
      drawerTrigger.current = document.activeElement;
    }
    setCaptureOpen(open);
    setDrawerOpen(open);
  }, []);

  function closeDrawer(restoreFocus = true) {
    setCaptureOpen(false);
    setDrawerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => {
      const trigger = drawerTrigger.current?.isConnected ? drawerTrigger.current : document.querySelector<HTMLElement>(".pw-top-risk-mobile");
      trigger?.focus({ preventScroll: true });
    });
  }

  function toggleDrawer(trigger: HTMLButtonElement) {
    if (drawerOpen && !pinning) {
      closeDrawer(false);
      return;
    }
    if (pinning) useDropStore.getState().disarm();
    drawerTrigger.current = trigger;
    setDrawerOpen(true);
    requestAnimationFrame(() => closeButton.current?.focus());
  }

  function toggleWatch(trigger: HTMLButtonElement) {
    const open = !watchOpen || captureOpen || (!drawerOpen && narrow);
    if (open) {
      drawerTrigger.current = trigger;
      if (pinning) useDropStore.getState().disarm();
      setCaptureOpen(false);
      setDrawerOpen(narrow);
      setWatchReveal((n) => n + 1);
    }
    setWatchOpen(open);
  }

  function handleDrawerKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || event.defaultPrevented || captureOpen || !drawerOpen || !narrow || pinning
      || (event.target instanceof Element && event.target.closest("dialog[open]"))) return;
    event.preventDefault();
    closeDrawer();
  }

  return (
    <div className="pw-shell" onKeyDown={handleDrawerKeys}>
      <TopBar mode={mode} levels={view === "split"} lensNotice={lensNotice}
        onToggleLevels={() => useTwinStore.getState().setView(view === "split" ? "floor" : "split")}
        drawerOpen={drawerOpen && !pinning} watchOpen={watchOpen && !captureOpen && (!narrow || (drawerOpen && !pinning))}
        onToggleDrawer={toggleDrawer} onToggleWatch={toggleWatch} />
      <div className="pw-shell-body" data-view={view} data-drawer={drawerOpen} data-pinning={pinning}>
        <main className="pw-stage" aria-label="Plant twin" inert={narrow && drawerOpen && !pinning}>
          <div className="pw-stage-views" data-view={view} id="pw-drawing">
            <section className="pw-stage-view" aria-label="Floor view">
              <div className="pw-stage-escalation"><Slot name="Escalation call" quiet><EscalationCall /></Slot></div>
              <div className="pw-crew-stage">
                <div className="pw-crew-stage-dock"><CrewDock /></div>
                <div className="pw-crew-stage-drawing" data-view3d={view3d || undefined}>
                  <Slot name="Plant floor"><PlantFloor previewModel={previewModel} /></Slot>
                  <Slot name="3D view" quiet><View3DStage /></Slot>
                </div>
              </div>
            </section>
            {view === "split" && (
              <section className="pw-stage-view" aria-label="Network view">
                <Slot name="Purdue map"><PurdueMap /></Slot>
              </section>
            )}
          </div>
          <div className="pw-stage-dock">
            <div className="pw-dock-capture">
              <Slot name="Capture" quiet>
                <CaptureCard open={captureOpen} editor={captureEditor} onOpenChange={changeCapture} />
              </Slot>
            </div>
            <div className="pw-dock-sim">
              <Slot name="Simulation" quiet><SimControls /></Slot>
            </div>
            <div className="pw-dock-voice">
              <Slot name="Chief voice" quiet><TalkToChief /></Slot>
            </div>
          </div>
        </main>
        <button className="pw-rail-backdrop" type="button" tabIndex={-1} aria-label="Close results" onClick={() => closeDrawer()} />
        <aside className="pw-rail" id="pw-results" aria-label="Results and plant details">
          <header className="pw-rail-mobile-head">
            <span>Plant details</span>
            <button type="button" ref={closeButton} className="pw-tool-button" title="Close results"
              aria-label="Close results" onClick={() => closeDrawer()}><X size={20} aria-hidden /></button>
          </header>
          <Slot name="Results">
            <SidePanel captureOpen={captureOpen} setCaptureEditor={setCaptureEditor}
              modelerOpen={modelerOpen} onModelerOpen={setModelerOpen} previewModel={previewModel}
              watchOpen={watchOpen} watchReveal={watchReveal} onWatchOpen={setWatchOpen} />
          </Slot>
        </aside>
      </div>
      <TranscriptDrawer />
    </div>
  );
}
