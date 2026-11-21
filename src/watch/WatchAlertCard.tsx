/** Compact threat headline with severity, equipment and conditional event loss. */
"use client";

import { ChevronDown, CircleCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { displayLedger } from "@/econ/displayLedger";
import { formatUsd } from "@/econ/format";
import { LossBreakdown } from "@/econ/LossBreakdown";
import { LossGlyph } from "@/econ/LossGlyph";
import type { LossEstimate } from "@/econ/types";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";

export function WatchAlertIcon({ tone }: { tone: "alert" | "warn" | "ok" }) {
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  const label = tone === "alert" ? "High priority" : tone === "warn" ? "Advisory" : "Check complete";
  return <span className="pw-watch-alert-icon" data-tone={tone} role="img" aria-label={label} title={label}>
    <Icon size={28} strokeWidth={1.8} aria-hidden />
  </span>;
}

export function WatchAlertCard({ title, tone, asset, estimate, comparable, children }: {
  title: string;
  tone: "alert" | "warn" | "ok";
  asset?: Asset;
  estimate?: LossEstimate;
  comparable?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ledger = useMemo(() => estimate && displayLedger(estimate), [estimate]);
  return (
    <div className="pw-watch-alert">
      <WatchAlertIcon tone={tone} />
      <div className="pw-watch-alert-copy">
        <h3 title={title}>{title}</h3>
        {(asset || estimate) && <div className="pw-watch-alert-metrics">
          {asset && <button className="pw-watch-asset" type="button" data-watch-select={asset.id} aria-label={`Select ${asset.id} · ${asset.name}`}
            title={asset.name} onClick={() => useTwinStore.getState().select(asset.id)}>
            <LossGlyph kind={asset.physical.kind} size={24} /><span>{asset.id}</span>
          </button>}
          {ledger && <span className="pw-watch-amount pw-mono" title={`Estimated loss per ${comparable ? "comparable " : ""}event`}>
            {formatUsd(ledger.total)} <small>{comparable ? "est. / comparable event" : "est. / event"}</small>
          </span>}
        </div>}
        <details className="pw-panel-disclosure pw-rail-more" onToggle={(event) => {
          if (event.target === event.currentTarget) setOpen(event.currentTarget.open);
        }}>
          <summary>See more<ChevronDown size={13} className="pw-panel-disclosure-caret" aria-hidden /></summary>
          <div className="pw-panel-disclosure-body">
            {children}
            {open && estimate && ledger && <LossBreakdown estimate={estimate} ledger={ledger} />}
          </div>
        </details>
      </div>
    </div>
  );
}
