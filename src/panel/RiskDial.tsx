/** Shows the live plant risk and opens the rail's review sections. */
"use client";

import { ChevronDown } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { formatUsd, plantExposure } from "@/econ/model";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { useTwinStore } from "@/twin/store";
import { riskScore } from "./riskNumber";
import "./riskHero.css";

const ARC = "M31 133 A70 70 0 1 1 129 133";
const layoutTransition = { duration: 0.36, ease: "easeOut" } as const;

export function RiskDial({ expanded, composing, reducedMotion, onToggle, action }: {
  expanded: boolean;
  composing: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
  action?: ReactNode;
}) {
  const risk = useTwinStore((state) => state.risk);
  const { score } = risk;
  const band = risk.band === "guarded" ? "low" : risk.band;
  const twin = useEconomicTwin();
  const loss = plantExposure(twin, risk).totalAnnualised;
  const compact = expanded || composing;
  const showLoss = !compact && Number.isFinite(loss);
  const layout = !reducedMotion;
  const dialValue = useMotionValue(score);
  const display = useTransform(dialValue, riskScore);
  const sweep = useTransform(dialValue, (value) => `${value} 100`);
  const fillOpacity = useTransform(dialValue, (value) => Math.min(1, value));

  useEffect(() => {
    if (reducedMotion) {
      dialValue.set(score);
      return;
    }
    const animation = animate(dialValue, score, { duration: 0.48, ease: "easeOut" });
    return () => animation.stop();
  }, [score, dialValue, reducedMotion]);

  return (
    <section className="pw-risk-hero" data-band={band} data-compact={compact} aria-label="Plant risk assessment">
      <motion.button className="pw-risk-toggle" type="button" disabled={composing}
        layout={layout} transition={layoutTransition} onClick={onToggle}
        aria-label={`Plant risk, ${riskScore(score)} out of 100, ${band}`}
        aria-describedby={showLoss ? "pw-risk-loss" : undefined}
        aria-expanded={expanded && !composing} aria-controls="pw-risk-reviews">
        <motion.span className="pw-risk-title" layout={layout} transition={layoutTransition}>Plant risk</motion.span>
        <motion.span className="pw-risk-ring" layout={layout} transition={layoutTransition} aria-hidden="true">
          <svg viewBox="0 0 160 160">
            <path className="pw-risk-track" d={ARC} />
            <motion.path className="pw-risk-fill" d={ARC} pathLength="100"
              strokeDasharray={reducedMotion ? `${score} 100` : sweep} opacity={reducedMotion ? Math.min(1, score) : fillOpacity} />
          </svg>
          <span className="pw-risk-value pw-mono">
            <motion.span className="pw-risk-score">{reducedMotion ? riskScore(score) : display}</motion.span><span className="pw-risk-total">/100</span>
          </span>
        </motion.span>
        <motion.span className="pw-risk-band" layout={layout} transition={layoutTransition}>{band}</motion.span>
        {showLoss && (
          <span className="pw-risk-loss" id="pw-risk-loss"><strong className="pw-mono">{formatUsd(loss)}</strong> est. annual loss</span>
        )}
        {!composing && <ChevronDown className="pw-risk-caret" size={16} aria-hidden />}
      </motion.button>
      {action && <div className="pw-risk-action">{action}</div>}
    </section>
  );
}
