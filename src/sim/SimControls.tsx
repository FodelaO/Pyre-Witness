/** Launches exercises for the selected lens and keeps replay transport available. */
"use client";

import { CloudFog, FlaskConical, Gauge, Pause, Play, RotateCcw, ServerCrash, Snowflake, Wifi, type LucideIcon } from "lucide-react";
import { useLensStore } from "@/layers/lensStore";
import { scenarioLens } from "./scenarioLens";
import { ALL_SCENARIOS } from "./scenarios";
import { useSimStore } from "./simStore";
import Timeline, { formatSimTime } from "./Timeline";
import type { SimScenarioId } from "./types";

const icons: Record<SimScenarioId, LucideIcon> = {
  cip: FlaskConical, ammonia: CloudFog, chiller: Snowflake, carbonation: Gauge, ransomware: ServerCrash, wireless: Wifi,
};
const launchers = Object.keys(icons) as SimScenarioId[];

export default function SimControls() {
  const lens = useLensStore((state) => state.mode);
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
  const seek = useSimStore((state) => state.seek);
  const playing = mode === "playing";
  const playback = playing ? "Pause" : mode === "finished" ? "Rerun" : "Play";
  const containedAt = run?.containedAt;
  const outcomeLine = outcome && (containedAt === undefined ? "Uncontained" : `Contained ${formatSimTime(containedAt)}`);
  const speedTip = "Switch to " + (speed === 1 ? 4 : 1) + "× speed";

  return (
    <section className="pw-sim-controls" data-mount="shell" aria-label="Deterministic plant simulation">
      <div className="pw-sim-launch" data-replaying={!!run || undefined}>
        <div className="pw-tool-rail pw-sim-rail" role="group" aria-label="Run a simulated scenario">
          <span className="pw-sim-heading">Simulate</span>
          {launchers.filter((id) => lens === "both" || scenarioLens[id] === lens).map((id) => {
            const { label } = ALL_SCENARIOS[id];
            const Icon = icons[id];
            return (
              <button type="button" className="pw-tool-button" key={id} onClick={() => start(id)}
                aria-label={label} aria-pressed={active === id} data-pw-tip={label} data-pw-tip-side="top">
                <Icon size={18} strokeWidth={1.65} aria-hidden />
              </button>
            );
          })}
        </div>
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
            outcome={outcomeLine} outcomeDetail={outcome} contained={run.contained} onSeek={seek} />
        </div>
      )}
    </section>
  );
}
