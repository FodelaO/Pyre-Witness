/** Scenario launcher and replay transport for the plant overlay. */
"use client";

import { Activity, CloudFog, FlaskConical, Pause, Play, RotateCcw, ServerCrash, Snowflake, Wifi, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { startSimRuntime } from "./runtime";
import { SCENARIOS } from "./scenarios";
import { useSimStore } from "./simStore";
import Timeline, { formatSimTime } from "./Timeline";
import type { ScenarioId } from "./types";
import "./sim.css";

const icons: Record<ScenarioId, LucideIcon> = {
  cip: FlaskConical, ammonia: CloudFog, ransomware: ServerCrash, wireless: Wifi, chiller: Snowflake,
};

let shellMounts = 0;
const mountListeners = new Set<() => void>();

export function subscribeShellControls(listener: () => void) {
  mountListeners.add(listener);
  return () => { mountListeners.delete(listener); };
}

export function hasShellControls() {
  return shellMounts > 0;
}

export default function SimControls({ embedded = false }: { embedded?: boolean } = {}) {
  useEffect(startSimRuntime, []);
  useEffect(() => {
    if (embedded) return;

    shellMounts++;
    mountListeners.forEach((listener) => listener());
    return () => {
      shellMounts--;
      mountListeners.forEach((listener) => listener());
    };
  }, [embedded]);

  const active = useSimStore((state) => state.activeScenario);
  const run = useSimStore((state) => state.run);
  const current = useSimStore((state) => state.currentStage);
  const elapsed = useSimStore((state) => state.elapsed);
  const mode = useSimStore((state) => state.mode);
  const speed = useSimStore((state) => state.speed);
  const outcome = useSimStore((state) => state.outcome);
  const start = useSimStore((state) => state.start);
  const togglePlayback = useSimStore((state) => state.togglePlayback);
  const setSpeed = useSimStore((state) => state.setSpeed);
  const reset = useSimStore((state) => state.reset);
  const playing = mode === "playing";
  const playback = playing ? "Pause" : mode === "finished" ? "Rerun" : "Play";
  const containedAt = run?.containedAt;
  const safeguard = run?.stages.at(-1)?.by;
  const outcomeLine = outcome && containedAt !== undefined && safeguard
    ? `Contained in ${formatSimTime(containedAt)} · ${safeguard}`
    : outcome;

  return (
    <section className="pw-sim-controls" data-mount={embedded ? "floor" : "shell"} aria-label="Deterministic plant simulation">
      <div className="pw-sim-controls-header">
        <span className="pw-sim-heading"><Activity size={13} aria-hidden="true" /> Deterministic simulation</span>
        <div className="pw-sim-transport" role="group" aria-label="Simulation playback">
          <button
            type="button"
            title={playback}
            aria-label={`${playback} simulation`}
            onClick={togglePlayback}
            disabled={!run}
          >
            {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="pw-sim-speed"
            onClick={() => setSpeed(speed === 1 ? 4 : 1)}
            aria-label={`Playback speed ${speed} times. Switch to ${speed === 1 ? 4 : 1} times`}
            title={`Switch to ${speed === 1 ? 4 : 1}× speed`}
          >
            {speed}×
          </button>
          <button type="button" onClick={reset} disabled={!run} title="Reset simulation" aria-label="Reset simulation">
            <RotateCcw size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="pw-sim-launchers" role="group" aria-label="Run a scenario">
        {Object.values(SCENARIOS).map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <button type="button" key={id} onClick={() => start(id)} aria-pressed={active === id} title={`Run ${label} simulation`}>
              <Icon size={15} strokeWidth={1.55} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {run && <Timeline stages={run.stages} current={current} elapsed={elapsed} />}
      {outcomeLine && <p className="pw-sim-outcome" data-outcome={run?.contained ? "contained" : "impact"}
        title={outcomeLine === outcome ? outcomeLine : `${outcomeLine}. ${outcome}`} role="status">{outcomeLine}</p>}
    </section>
  );
}
