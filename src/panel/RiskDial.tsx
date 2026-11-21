/** Sticky plant risk arc and a bounded, session-only score history. */
"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { PlantLossExposure } from "@/econ/mountsPlant";
import { useTwinStore } from "@/twin/store";
import { displayedRiskChange, riskDelta, riskScore } from "./riskNumber";

const HISTORY_SIZE = 24;
const ARC = "M8 61 A53 53 0 0 1 114 61";

const useRiskHistory = create<{ scores: number[]; record: (score: number) => void }>((set) => ({
  scores: [],
  record: (score) => set((state) => state.scores.at(-1) === score
    ? state
    : { scores: [...state.scores.slice(1 - HISTORY_SIZE), score] }),
}));

function RiskHistory({ score }: { score: number }) {
  const history = useRiskHistory((state) => state.scores);
  const scores = history.length ? history : [score];
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  const span = Math.max(1, high - low);
  const mid = (low + high) / 2;
  const points = scores.map((value, index) => ({
    x: 3 + 98 * index / Math.max(1, scores.length - 1),
    y: 14 - 20 * (value - mid) / span,
  }));
  const last = points[points.length - 1];
  return (
    <figure className="pw-panel-sparkline" aria-label={`Session risk history, ${scores.length} ${scores.length === 1 ? "reading" : "readings"}`}>
      <svg viewBox="0 0 104 28" aria-hidden="true">
        <path d="M3 14h98" stroke="var(--pw-line-strong)" strokeDasharray="2 4" />
        {points.length > 1 && <polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />}
        <circle cx={last.x} cy={last.y} r="2.4" />
      </svg>
      <figcaption>Session trend</figcaption>
    </figure>
  );
}

export function RiskDial({ action }: { action?: ReactNode }) {
  const score = useTwinStore((state) => state.risk.score);
  const band = useTwinStore((state) => state.risk.band);
  const baseline = useTwinStore((state) => state.baselineScore);
  const delta = displayedRiskChange(score, baseline);
  const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const reducedMotion = useReducedMotion();
  const dialValue = useMotionValue(score);
  const display = useTransform(dialValue, riskScore);

  useEffect(() => {
    const { record } = useRiskHistory.getState();
    record(useTwinStore.getState().risk.score);
    return useTwinStore.subscribe((state, previous) => {
      if (state.risk.score !== previous.risk.score) record(state.risk.score);
    });
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      dialValue.set(score);
      return;
    }
    const animation = animate(dialValue, score, { duration: 0.18, ease: "easeOut" });
    return () => animation.stop();
  }, [score, dialValue, reducedMotion]);

  return (
    <section className="pw-panel-dial" data-band={band} aria-labelledby="pw-panel-risk-title">
      <div className="pw-panel-dial-head">
        <h2 id="pw-panel-risk-title">Plant risk</h2>
        {action}
      </div>
      <div className="pw-panel-dial-body">
        <div className="pw-panel-gauge" role="meter" aria-label="Plant risk score" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={riskScore(score)} aria-valuetext={`${riskScore(score)} of 100, ${band}`}>
          <svg viewBox="0 0 122 70" aria-hidden="true">
            <path className="pw-panel-gauge-track" d={ARC} />
            <path className="pw-panel-gauge-fill" d={ARC} pathLength="100" strokeDasharray={`${score} 100`} />
          </svg>
          <span className="pw-panel-gauge-value pw-mono" aria-hidden="true">
            <motion.span>{display}</motion.span><span>/100</span>
          </span>
        </div>
        <div className="pw-panel-dial-band">
          <strong>{band}</strong>
          <span className="pw-panel-delta pw-mono" data-direction={Math.sign(delta)} title={`Baseline ${riskScore(baseline)}`}>
            <DeltaIcon size={13} aria-hidden />{riskDelta(delta)} <span>vs baseline</span>
          </span>
        </div>
        <RiskHistory score={score} />
      </div>
      <PlantLossExposure />
    </section>
  );
}
