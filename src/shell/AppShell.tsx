"use client";

/**
 * App shell: one screen. The plant floor is the stage; the capture card floats over it; results
 * live in a side panel; the Purdue map is one click away (or side by side in split view).
 * Each feature is lazy-loaded into a Slot so features can evolve independently.
 */
import { lazy } from "react";
import { useTwinStore } from "@/twin/store";
import { Slot } from "./Slot";
import { TopBar } from "./TopBar";

const PlantFloor = lazy(() => import("@/floor/PlantFloor"));
const PurdueMap = lazy(() => import("@/purdue/PurdueMap"));
const CaptureCard = lazy(() => import("@/capture/CaptureCard"));
const SidePanel = lazy(() => import("@/panel/SidePanel"));

export default function AppShell() {
  const view = useTwinStore((s) => s.view);

  return (
    <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-pw-bg text-pw-text">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <div
            className={`absolute inset-0 grid ${view === "split" ? "grid-cols-[1.4fr_1fr]" : "grid-cols-1"}`}
          >
            {view !== "purdue" && (
              <section className="relative min-h-0 min-w-0">
                <Slot name="Plant floor">
                  <PlantFloor />
                </Slot>
              </section>
            )}
            {view !== "floor" && (
              <section className="relative min-h-0 min-w-0 border-l border-pw-line">
                <Slot name="Purdue map">
                  <PurdueMap />
                </Slot>
              </section>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-30">
            <div className="pointer-events-auto">
              <Slot name="Capture" quiet>
                <CaptureCard />
              </Slot>
            </div>
          </div>
        </main>
        <aside className="relative w-[372px] shrink-0 border-l border-pw-line bg-pw-panel">
          <Slot name="Results">
            <SidePanel />
          </Slot>
        </aside>
      </div>
    </div>
  );
}
