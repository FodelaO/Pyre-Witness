/** Positions the drawing, fixed instrument dock and responsive results rail. */
"use client";

import { lazy, useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useDropStore } from "@/twin/dropPoint";
import { useTwinStore } from "@/twin/store";
import { Slot } from "./Slot";
import { TopBar } from "./TopBar";
import "./shell.css";

const PlantFloor = lazy(() => import("@/floor/PlantFloor"));
const PurdueMap = lazy(() => import("@/purdue/PurdueMap"));
const CaptureCard = lazy(() => import("@/capture/CaptureCard"));
const SimControls = lazy(() => import("@/sim/SimControls"));
const SidePanel = lazy(() => import("@/panel/SidePanel"));
const TalkToChief = lazy(() => import(/* turbopackOptional: true */ "@/voice/TalkToChief"));

const DRAWER_QUERY = "(width < 1280px)";

function subscribeDrawerWidth(onChange: () => void) {
  const width = window.matchMedia(DRAWER_QUERY);
  width.addEventListener("change", onChange);
  return () => width.removeEventListener("change", onChange);
}

const drawerWidth = () => window.matchMedia(DRAWER_QUERY).matches;

export default function AppShell() {
  const view = useTwinStore((state) => state.view);
  const pinning = useDropStore((state) => state.armed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureEditor, setCaptureEditor] = useState<HTMLDivElement | null>(null);
  const [watchOpen, setWatchOpen] = useState(false);
  const narrow = useSyncExternalStore(subscribeDrawerWidth, drawerWidth, () => false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawerTrigger = useRef<HTMLElement | null>(null);

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
    if (restoreFocus) drawerTrigger.current?.focus();
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
      <TopBar drawerOpen={drawerOpen && !pinning} watchOpen={watchOpen && !captureOpen}
        onToggleDrawer={toggleDrawer} onToggleWatch={toggleWatch} />
      <div className="pw-shell-body" data-drawer={drawerOpen} data-pinning={pinning}>
        <main className="pw-stage" aria-label="Plant twin" inert={narrow && drawerOpen && !pinning}>
          <div className="pw-stage-views" data-view={view} id="pw-drawing" role="tabpanel" aria-labelledby={"pw-view-" + view}>
            {view !== "purdue" && (
              <section className="pw-stage-view" aria-label="Floor view">
                <Slot name="Plant floor"><PlantFloor /></Slot>
              </section>
            )}
            {view !== "floor" && (
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
              watchOpen={watchOpen} onWatchOpen={setWatchOpen} />
          </Slot>
        </aside>
      </div>
    </div>
  );
}
