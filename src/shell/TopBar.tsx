/** Brand, plant disclosure and controls shared across drawing views. */
"use client";

import Link from "next/link";
import { BadgeCheck, Layers3, Map } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import LensToggle from "@/layers/LensToggle";
import type { LensMode } from "@/layers/lensStore";
import { displayedRiskChange, riskDelta, riskScore } from "@/panel/riskNumber";
import ThemeToggle from "@/theme/ThemeToggle";
import PlayDemo from "@/tour/PlayDemo";
import { useTwinStore } from "@/twin/store";
import View3DToggle from "@/view3d/View3DToggle";
import { useWatchStore } from "@/watch/watchStore";
import { BrandMark } from "./BrandMark";
import { watchStatus } from "./watchStatus";

type Props = {
  mode: LensMode;
  levels: boolean;
  lensNotice: boolean;
  drawerOpen: boolean;
  watchOpen: boolean;
  onToggleLevels: () => void;
  onToggleDrawer: (trigger: HTMLButtonElement) => void;
  onToggleWatch: (trigger: HTMLButtonElement) => void;
};

export function TopBar({ mode, levels, lensNotice, drawerOpen, watchOpen, onToggleLevels, onToggleDrawer, onToggleWatch }: Props) {
  const plant = useTwinStore((state) => state.twin.plant);
  const risk = useTwinStore((state) => state.risk);
  const baseline = useTwinStore((state) => state.baselineScore);
  const watch = useWatchStore(useShallow(({ local, feedStatus, review }) => watchStatus(local, { feedStatus, review })));
  const score = riskScore(risk.score);
  const delta = displayedRiskChange(risk.score, baseline);

  const riskReadout = (
    <>
      <span>Risk</span>
      <strong className="pw-mono">{score}</strong>
      {delta !== 0 && <span className="pw-top-delta pw-mono" data-increased={delta > 0}>{riskDelta(delta)}</span>}
    </>
  );
  const band = "Plant risk " + score + " of 100, " + risk.band;

  return (
    <header className="pw-top">
      <div className="pw-top-context">
        <BrandMark />
        <p className="pw-top-disclosure" title={`Simulated plant: ${plant.name}, ${plant.line} (fictional)`}>
          <strong>Simulated plant:</strong> {plant.name}, {plant.line} (fictional)
        </p>
      </div>
      <div className="pw-top-lens">
        <View3DToggle />
        <LensToggle />
        {mode === "data" && (
          <button type="button" className="pw-tool-button pw-levels-toggle" aria-controls="pw-drawing"
            aria-label="Purdue Levels" aria-pressed={levels}
            title={levels ? "Show plan only" : "Show Purdue levels"} onClick={onToggleLevels}>
            {levels ? <Map size={14} aria-hidden /> : <Layers3 size={14} aria-hidden />}
            <span>{levels ? "Plan" : "Levels"}</span>
          </button>
        )}
      </div>
      <div className="pw-top-actions">
        <PlayDemo />
        <button type="button" className="pw-top-watch" aria-expanded={watchOpen} aria-controls="pw-watch"
          aria-label={watch.label} data-pw-tip={watch.label}
          onClick={(event) => onToggleWatch(event.currentTarget)}>
          <span className="pw-live-pulse" data-tone={watch.tone} aria-hidden />
        </button>
        <Link className="pw-top-proof pw-top-proof-icon" href="/proof" aria-label="Proof" title="Proof: evaluation against a single Gemini call"><BadgeCheck size={15} aria-hidden /></Link>
        <ThemeToggle />
        <span className="pw-top-risk pw-top-risk-desktop" data-band={risk.band} title={band}>{riskReadout}</span>
        <button className="pw-top-risk pw-top-risk-mobile" type="button" data-band={risk.band}
          aria-controls="pw-results" aria-expanded={drawerOpen} aria-label={"Plant details · " + band}
          data-pw-tip="Plant details" data-pw-tip-align="end" onClick={(event) => onToggleDrawer(event.currentTarget)}>
          {riskReadout}
        </button>
      </div>
      <div className="pw-lens-notice" role="status">
        {lensNotice && <span>Lens: Both, this device changes the data pipeline</span>}
      </div>
    </header>
  );
}
