/** Launches the five deterministic exercises and exposes transport during a replay. */
"use client";

import { ChevronDown, CloudFog, FlaskConical, Pause, Play, RotateCcw, ServerCrash, Snowflake, Wifi, type LucideIcon } from "lucide-react";
import { ALL_SCENARIOS, SCENARIOS } from "./scenarios";
import { useSimStore } from "./simStore";
import Timeline, { formatSimTime } from "./Timeline";
import type { ScenarioId } from "./types";

const icons: Record<ScenarioId, LucideIcon> = {
  cip: FlaskConical, ammonia: CloudFog, ransomware: ServerCrash, wireless: Wifi, chiller: Snowflake,
};
const launchers = Object.keys(icons) as ScenarioId[];

export default function SimControls() {
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
    ? "Contained in " + formatSimTime(containedAt) + " · " + safeguard
    : outcome;
  const speedTip = "Switch to " + (speed === 1 ? 4 : 1) + "× speed";

  return (
    <section className="pw-sim-controls" data-mount="shell" aria-label="Deterministic plant simulation">
      <div className="pw-tool-rail pw-sim-rail" role="group" aria-label="Run a simulated scenario">
        <details className="pw-sim-extra">
          <summary aria-label="More simulations" title="More simulations">
            <span className="pw-sim-heading">Simulate</span><ChevronDown size={12} aria-hidden />
          </summary>
          <button type="button" onClick={(event) => {
            const menu = event.currentTarget.closest("details");
            if (menu) {
              menu.open = false;
              menu.querySelector("summary")?.focus();
            }
            start("carbonation");
          }}>{ALL_SCENARIOS.carbonation.label}</button>
        </details>
        {launchers.map((id) => {
          const { label } = SCENARIOS[id];
          const Icon = icons[id];
          return (
            <button type="button" className="pw-tool-button" key={id} onClick={() => start(id)}
              aria-label={label} aria-pressed={active === id} data-pw-tip={label} data-pw-tip-side="top">
              <Icon size={18} strokeWidth={1.65} aria-hidden />
            </button>
          );
        })}
      </div>
      {run && (
        <div className="pw-sim-replay">
          <div className="pw-sim-transport" role="group" aria-label="Simulation playback">
            <button type="button" className="pw-tool-button" aria-label={playback + " simulation"}
              data-pw-tip={playback + " simulation"} data-pw-tip-side="top" onClick={togglePlayback}>
              {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            </button>
            <button type="button" className="pw-tool-button pw-sim-speed" onClick={() => setSpeed(speed === 1 ? 4 : 1)}
              aria-label={"Playback speed " + speed + "×. " + speedTip} data-pw-tip={speedTip} data-pw-tip-side="top">
              {speed}×
            </button>
            <button type="button" className="pw-tool-button" onClick={reset} aria-label="Reset simulation"
              data-pw-tip="Reset simulation" data-pw-tip-side="top"><RotateCcw size={15} aria-hidden /></button>
          </div>
          <Timeline stages={run.stages} current={current} elapsed={elapsed}
            outcome={outcomeLine} outcomeDetail={outcome} contained={run.contained} />
        </div>
      )}
    </section>
  );
}
