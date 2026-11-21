/** Paints replay progress and temporary incident markers over the twin floor. */
"use client";

import { useSyncExternalStore } from "react";
import { FOOTPRINT } from "@/equipment/types";
import { assetById, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import { markerPosition, markerRoute, traceTo } from "./floorGeometry";
import IncidentEffects from "./IncidentEffects";
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

function markerAnchor(twin: Twin, id: string, point: Point): Point {
  const asset = assetById(twin, id);
  if (!asset) return point;

  const footprint = FOOTPRINT[asset.physical.kind];
  const scale = asset.physical.scale ?? 1;
  return { x: point.x + footprint.w * scale / 2 + 5, y: point.y - footprint.h * scale / 2 - 5 };
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

  const stage = run?.stages[current];
  const next = run?.stages[current + 1];
  const completed = run?.stages.slice(0, current + 1) ?? [];
  const completedPath = markerRoute(twin, completed.flatMap((step) => step.where));
  const end = completedPath.at(-1);
  const activePath = end && next ? [end, ...markerRoute(twin, next.where)] : [];
  const progress = stage && next && !reduced && next.t > stage.t
    ? Math.max(0, Math.min(1, (elapsed - stage.t) / (next.t - stage.t)))
    : 0;
  const trail = [...completedPath, ...traceTo(activePath, progress).slice(1)];
  const pulse = trail.at(-1);
  const blocked = stage?.outcome === "blocked";
  const holdId = blocked ? [...stage.where].reverse().find((id) => markerPosition(twin, id)) : undefined;
  const affectedAssets = new Set(completed.flatMap((step) => Object.keys(step.effects?.assets ?? {})));
  const affectedAreas = new Set(completed.flatMap((step) => Object.keys(step.effects?.areas ?? {})));
  const visual = stage ? currentVisual(visualState, stage, next, progress) : undefined;

  return (
    <g className="pw-sim-layer" aria-label={stage ? "Simulated incident overlay" : undefined}>
      {stage && (
        <>
          {visual && <IncidentEffects twin={twin} visual={visual} />}
          {twin.areas.filter((area) => affectedAreas.has(area.id) && area.status !== "normal").map((area) => (
            <rect key={area.id} className="pw-sim-area-ring" data-state={area.status}
              x={area.bounds.x + 1} y={area.bounds.y + 1} width={area.bounds.w - 2} height={area.bounds.h - 2} rx={6} />
          ))}
          {trail.length > 1 && <polyline className="pw-sim-route" points={trail.map(({ x, y }) => `${x},${y}`).join(" ")} />}
          {twin.assets.filter((asset) => affectedAssets.has(asset.id) && asset.status !== "ok" && asset.id !== holdId).map((asset) => (
            <Marker key={asset.id} point={markerAnchor(twin, asset.id, asset.physical)}
              state={asset.status === "attention" ? "attention" : "alarm"} label={`${asset.id} · ${asset.status} in simulation`} />
          ))}
          {pulse && blocked && <Marker point={holdId ? markerAnchor(twin, holdId, pulse) : pulse}
            state="blocked" label={`Contained by ${stage.by ?? "plant safeguard"}`} />}
          {pulse && !blocked && (
            <g className="pw-sim-probe" transform={`translate(${pulse.x} ${pulse.y})`}>
              <circle r={7} /><circle r={2.7} />
            </g>
          )}
        </>
      )}
    </g>
  );
}
