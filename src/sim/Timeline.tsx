/** Compact replay stages and the current event. */
"use client";

import type { SimStage } from "./types";

export function formatSimTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60).toString().padStart(2, "0");
  return `${minutes}:${(whole % 60).toString().padStart(2, "0")}`;
}

export default function Timeline({ stages, current, elapsed }: {
  stages: SimStage[];
  current: number;
  elapsed: number;
}) {
  const active = stages[current];

  return (
    <div className="pw-sim-timeline">
      <ol className="pw-sim-stages" aria-label="Simulation stages">
        {stages.map((stage, index) => (
          <li
            key={`${stage.t}:${index}`}
            data-state={index > current ? "waiting" : stage.outcome}
            aria-current={index === current ? "step" : undefined}
            title={`${formatSimTime(stage.t)} · ${stage.title}`}
          >
            <span className="pw-sim-sr-only">
              {`${formatSimTime(stage.t)} ${stage.title}${index > current ? ", upcoming" : stage.outcome === "blocked" ? ", contained" : ""}`}
            </span>
          </li>
        ))}
      </ol>
      <div className="pw-sim-stage-caption">
        <time aria-label="Elapsed simulation time">{formatSimTime(elapsed)}</time>
        <span title={active?.title}>{active?.title ?? "Starting replay"}</span>
      </div>
    </div>
  );
}
