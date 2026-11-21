"use client";

/**
 * Top bar: brand, the "simulated plant" disclosure, the view switch and the live risk score.
 * Deliberately quiet: three icon buttons and one number.
 */
import { Factory, Network, SquareSplitHorizontal } from "lucide-react";
import { useTwinStore } from "@/twin/store";
import type { RiskBand, ViewMode } from "@/twin/types";

const VIEWS: { id: ViewMode; label: string; icon: typeof Factory }[] = [
  { id: "floor", label: "Plant floor", icon: Factory },
  { id: "purdue", label: "Purdue network map", icon: Network },
  { id: "split", label: "Side by side", icon: SquareSplitHorizontal },
];

const BAND_COLOR: Record<RiskBand, string> = {
  low: "var(--pw-ok)",
  guarded: "var(--pw-ok)",
  elevated: "var(--pw-attention)",
  high: "var(--pw-ember)",
  critical: "var(--pw-alarm)",
};

export function TopBar() {
  const view = useTwinStore((s) => s.view);
  const setView = useTwinStore((s) => s.setView);
  const plant = useTwinStore((s) => s.twin.plant);
  const risk = useTwinStore((s) => s.risk);
  const baseline = useTwinStore((s) => s.baselineScore);
  const delta = Math.round(risk.score - baseline);

  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-pw-line bg-pw-panel px-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--pw-ember)", boxShadow: "0 0 10px var(--pw-ember)" }}
        />
        <span className="text-[13px] font-semibold tracking-[0.22em]">PYRE WITNESS</span>
      </div>

      <span className="pw-mono hidden text-[10.5px] text-pw-faint md:inline">
        Simulated plant: {plant.name}, {plant.line} (fictional)
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div
          className="flex items-center overflow-hidden rounded-md border border-pw-line"
          role="tablist"
          aria-label="Twin view"
        >
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              aria-label={label}
              title={label}
              onClick={() => setView(id)}
              className={`flex h-7 w-9 items-center justify-center transition-colors ${
                view === id ? "bg-pw-panel-2 text-pw-text" : "text-pw-faint hover:text-pw-dim"
              }`}
            >
              <Icon size={15} strokeWidth={1.6} />
            </button>
          ))}
        </div>

        <div
          className="flex items-baseline gap-1.5 rounded-md border border-pw-line px-2.5 py-1"
          title={`Plant risk score (${risk.band})`}
        >
          <span className="text-[9.5px] uppercase tracking-[0.18em] text-pw-faint">Risk</span>
          <span className="pw-mono text-[15px] font-semibold leading-none" style={{ color: BAND_COLOR[risk.band] }}>
            {Math.round(risk.score)}
          </span>
          {delta !== 0 && (
            <span
              className="pw-mono text-[10.5px] leading-none"
              style={{ color: delta > 0 ? "var(--pw-alarm)" : "var(--pw-ok)" }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
