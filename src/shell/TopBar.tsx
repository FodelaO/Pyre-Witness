/** Brand, plant disclosure and controls shared across drawing views. */
"use client";

import Link from "next/link";
import { Factory, Network, SquareSplitHorizontal } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useTwinStore } from "@/twin/store";
import type { ViewMode } from "@/twin/types";
import { useWatchStore } from "@/watch/watchStore";
import { BrandMark } from "./BrandMark";
import { watchStatus } from "./watchStatus";

const VIEWS: readonly { id: ViewMode; label: string; short: string; icon: typeof Factory }[] = [
  { id: "floor", label: "Plant floor", short: "Floor", icon: Factory },
  { id: "purdue", label: "Purdue network map", short: "Purdue", icon: Network },
  { id: "split", label: "Side by side", short: "Split", icon: SquareSplitHorizontal },
];

function viewKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
  const keys: Record<string, number> = {
    ArrowLeft: (index + VIEWS.length - 1) % VIEWS.length,
    ArrowRight: (index + 1) % VIEWS.length,
    Home: 0,
    End: VIEWS.length - 1,
  };
  const next = VIEWS[keys[event.key]];
  if (!next) return;
  event.preventDefault();
  useTwinStore.getState().setView(next.id);
  event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-view="' + next.id + '"]')?.focus();
}

type Props = {
  drawerOpen: boolean;
  watchOpen: boolean;
  onToggleDrawer: (trigger: HTMLButtonElement) => void;
  onToggleWatch: (trigger: HTMLButtonElement) => void;
};

export function TopBar({ drawerOpen, watchOpen, onToggleDrawer, onToggleWatch }: Props) {
  const view = useTwinStore((state) => state.view);
  const setView = useTwinStore((state) => state.setView);
  const plant = useTwinStore((state) => state.twin.plant);
  const risk = useTwinStore((state) => state.risk);
  const baseline = useTwinStore((state) => state.baselineScore);
  const watch = useWatchStore((state) => watchStatus(state.local));
  const delta = Math.round(risk.score - baseline);

  const riskReadout = (
    <>
      <span>Risk</span>
      <strong className="pw-mono">{Math.round(risk.score)}</strong>
      {delta !== 0 && <span className="pw-top-delta pw-mono" data-increased={delta > 0}>{delta > 0 ? "+" : ""}{delta}</span>}
    </>
  );
  const band = "Plant risk " + Math.round(risk.score) + " of 100, " + risk.band;

  return (
    <header className="pw-top">
      <div className="pw-top-context"><BrandMark /></div>
      <p className="pw-top-disclosure"><strong>Simulated plant:</strong> {plant.name}, {plant.line} (fictional)</p>
      <div className="pw-top-views" role="tablist" aria-label="Twin view">
        {VIEWS.map(({ id, label, short, icon: Icon }, index) => (
          <button key={id} className="pw-tool-button" role="tab" type="button" data-view={id}
            id={"pw-view-" + id} aria-controls="pw-drawing"
            aria-selected={view === id} aria-label={label} tabIndex={view === id ? 0 : -1}
            data-pw-tip={label} onKeyDown={(event) => viewKeys(event, index)} onClick={() => setView(id)}>
            <Icon size={17} strokeWidth={1.65} aria-hidden /><span>{short}</span>
          </button>
        ))}
      </div>
      <div className="pw-top-actions">
        <button type="button" className="pw-top-watch" aria-expanded={watchOpen} aria-controls="pw-watch"
          aria-label={"Threat watch · " + watch} data-pw-tip={"Threat watch · " + watch}
          onClick={(event) => onToggleWatch(event.currentTarget)}>
          <span className="pw-status-dot" data-status={watch} aria-hidden /><span className="pw-top-watch-label">Watch</span>
        </button>
        <Link className="pw-top-proof" href="/proof">Proof</Link>
        <span className="pw-top-risk pw-top-risk-desktop" data-band={risk.band} title={band}>{riskReadout}</span>
        <button className="pw-top-risk pw-top-risk-mobile" type="button" data-band={risk.band}
          aria-controls="pw-results" aria-expanded={drawerOpen} aria-label={"Plant details · " + band}
          data-pw-tip="Plant details" data-pw-tip-align="end" onClick={(event) => onToggleDrawer(event.currentTarget)}>
          {riskReadout}
        </button>
      </div>
    </header>
  );
}
