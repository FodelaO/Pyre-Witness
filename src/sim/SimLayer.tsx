/** Paints replay progress and temporary incident markers over the twin floor. */
"use client";

import { useSyncExternalStore } from "react";
import type { Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { floorAreaBounds, markerAnchor, replayRoute } from "./floorGeometry";
import IncidentEffects from "./IncidentEffects";
import { scenarioLens } from "./scenarioLens";
import { useSimStore } from "./simStore";
import type { SimEffects, SimStage } from "./types";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const serverFalse = () => false;

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function reducedMotion() {
  return window.matchMedia(MOTION_QUERY).matches;
}

function Marker({ point, state, label }: { point: Point; state: "blocked" | "alarm" | "attention"; label: string }) {
  return (
    <g className="pw-sim-marker" data-state={state} transform={`translate(${point.x} ${point.y})`}>
      <title>{label}</title>
      <circle className="pw-sim-marker-back" r={state === "blocked" ? 13 : 9} />
      {state === "blocked" ? (
        <path className="pw-sim-marker-mark" d="M0 -8 L7 -5 V0 Q7 5 0 9 Q-7 5 -7 0 V-5 Z M-3 0 L-1 2 L3 -2" />
      ) : (
        <path className="pw-sim-marker-mark" d="M0 -4 V1 M0 4 H0.01" />
      )}
    </g>
  );
}

function currentVisual(visual: SimEffects["visual"], stage: SimStage, next: SimStage | undefined, progress: number) {
  if (!visual) return undefined;
  if (stage.outcome === "blocked" && visual.kind === "ammonia" && !stage.effects?.visual) {
    return { ...visual, intensity: Math.min(visual.intensity, 0.15) };
  }

  const following = next?.effects?.visual;
  if (following?.kind !== visual.kind || following.where.join() !== visual.where.join()) return visual;
  if (next?.outcome === "blocked") return visual;
  return { ...visual, intensity: visual.intensity + (following.intensity - visual.intensity) * progress };
}

export default function SimLayer() {
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, serverFalse);
  const twin = useTwinStore((state) => state.twin);
  const run = useSimStore((state) => state.run);
  const current = useSimStore((state) => state.currentStage);
  const elapsed = useSimStore((state) => state.elapsed);
  const visualState = useSimStore((state) => state.visual);

  if (!run) return null;
  const lens = scenarioLens[run.id];
  const stage = run.stages[current];
  const next = run.stages[current + 1];
  const completed = run.stages.slice(0, current + 1);
  const progress = stage && next && !reduced && next.t > stage.t
    ? Math.max(0, Math.min(1, (elapsed - stage.t) / (next.t - stage.t)))
    : 0;
  const { trails, pulse, hold } = replayRoute(twin, run.stages, current, reduced || !next ? 1 : progress, lens);
  const affectedAssets = new Set(completed.flatMap((step) => Object.keys(step.effects?.assets ?? {})));
  const affectedAreas = new Set(completed.flatMap((step) => Object.keys(step.effects?.areas ?? {})));
  const visual = stage ? currentVisual(visualState, stage, next, progress) : undefined;

  return (
    <g className={`pw-sim-layer lens-${lens}-only`} aria-label={stage ? "Simulated incident overlay" : undefined}>
      {stage && (
        <>
          {visual && <IncidentEffects twin={twin} visual={visual} />}
          {twin.areas.filter((area) => affectedAreas.has(area.id) && area.status !== "normal").map((area) => {
            const bounds = floorAreaBounds(twin, area);
            if (!bounds || bounds.w <= 2 || bounds.h <= 2) return null;
            // Three sides only: the room title sits on the top boundary, which the floor already recolours.
            const x1 = bounds.x + 1, x2 = bounds.x + bounds.w - 1, y1 = bounds.y + 1, y2 = bounds.y + bounds.h - 1;
            const r = Math.min(6, (x2 - x1) / 2, (y2 - y1) / 2);
            return <path key={area.id} className="pw-sim-area-ring" data-state={area.status}
              d={`M${x1} ${y1}V${y2 - r}Q${x1} ${y2} ${x1 + r} ${y2}H${x2 - r}Q${x2} ${y2} ${x2} ${y2 - r}V${y1}`} />;
          })}
          {trails.map((trail, index) => trail.length > 1 && (
            <polyline key={index} className="pw-sim-route" points={trail.map(({ x, y }) => `${x},${y}`).join(" ")} />
          ))}
          {twin.assets.filter((asset) => affectedAssets.has(asset.id) && asset.status !== "ok" && asset.id !== hold?.id).map((asset) => {
            const point = markerAnchor(twin, asset.id);
            return point && <Marker key={asset.id} point={point}
              state={asset.status === "attention" ? "attention" : "alarm"} label={`${asset.id} · ${asset.status} in simulation`} />;
          })}
          {hold?.point && <Marker point={hold.point}
            state="blocked" label={`Contained by ${stage.by ?? "plant safeguard"}`} />}
          {pulse && (
            <g className="pw-sim-probe" transform={`translate(${pulse.x} ${pulse.y})`}>
              <circle r={7} /><circle r={2.7} />
            </g>
          )}
        </>
      )}
    </g>
  );
}
