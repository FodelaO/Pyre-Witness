/** Timeline segments and a one-line simulation readout. */
"use client";

import type { SimStage } from "./types";

export function formatSimTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60).toString().padStart(2, "0");
  return minutes + ":" + (whole % 60).toString().padStart(2, "0");
}

export default function Timeline({ stages, current, elapsed, outcome, outcomeDetail, contained }: {
  stages: SimStage[];
  current: number;
  elapsed: number;
  outcome: string | null;
  outcomeDetail: string | null;
  contained: boolean;
}) {
  const active = stages[current];

  return (
    <div className="pw-sim-timeline">
      <div className="pw-sim-track-row">
        <span className="pw-sim-state-tag">SIMULATION</span>
        <ol className="pw-sim-stages" aria-label="Simulation stages">
          {stages.map((stage, index) => (
            <li key={stage.t + ":" + index} data-state={index > current ? "waiting" : stage.outcome}
              aria-current={index === current ? "step" : undefined} title={formatSimTime(stage.t) + " · " + stage.title}>
              <span className="pw-sim-sr-only">
                {formatSimTime(stage.t) + " " + stage.title + (index > current ? ", upcoming" : stage.outcome === "blocked" ? ", contained" : "")}
              </span>
            </li>
          ))}
        </ol>
        <time aria-label="Elapsed simulation time">{formatSimTime(elapsed)}</time>
      </div>
      {outcome ? (
        <p className="pw-sim-outcome" data-outcome={contained ? "contained" : "impact"}
          title={outcomeDetail && outcomeDetail !== outcome ? outcome + ". " + outcomeDetail : outcome} role="status">{outcome}</p>
      ) : <p className="pw-sim-stage-caption" title={active?.title}>{active?.title ?? "Starting replay"}</p>}
    </div>
  );
}
