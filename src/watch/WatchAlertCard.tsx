/** Compact threat headline with severity, equipment and conditional event loss. */
"use client";

import {
  ChevronDown, CircleCheck, FileLock2, FileWarning, LaptopMinimal, Microchip,
  PackageCheck, PackagePlus, Radio, TriangleAlert, Utensils,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { displayLedger } from "@/econ/displayLedger";
import { formatUsd } from "@/econ/format";
import { LossBreakdown } from "@/econ/LossBreakdown";
import type { LossEstimate } from "@/econ/types";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { VULN_LABELS, type VulnType } from "./vulnType";

const typeIcons = {
  ransomware: FileLock2,
  plcFirmware: Microchip,
  remoteAccess: LaptopMinimal,
  wireless: Radio,
  softwareUpdate: PackageCheck,
  newSoftware: PackagePlus,
  foodRecall: Utensils,
  advisory: FileWarning,
} satisfies Record<VulnType, typeof FileWarning>;

export function WatchTypeLabel({ type, drill = false }: { type: VulnType; drill?: boolean }) {
  const Icon = typeIcons[type];
  return <span className="pw-watch-type">
    <Icon size={14} aria-hidden />
    <span>{VULN_LABELS[type]}</span>
    {drill && <span className="pw-watch-drill">Drill</span>}
  </span>;
}

export function WatchAlertIcon({ tone }: { tone: "alert" | "warn" | "ok" }) {
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  const label = tone === "alert" ? "High priority" : tone === "warn" ? "Advisory" : "Check complete";
  return <span className="pw-watch-alert-icon" data-tone={tone} role="img" aria-label={label} title={label}>
    <Icon size={28} strokeWidth={1.8} aria-hidden />
  </span>;
}

export function WatchAlertCard({ title, type, tone, asset, estimate, comparable, drill = false, children }: {
  title: string;
  type: VulnType;
  tone?: "alert" | "warn";
  asset?: Asset;
  estimate?: LossEstimate;
  comparable?: boolean;
  drill?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const ledger = useMemo(() => estimate && displayLedger(estimate), [estimate]);
  return (
    <div className="pw-watch-alert" data-tone={tone} data-watch-type={type} data-watch-drill={drill || undefined}>
      <button type="button" className="pw-watch-card-toggle" title={title}
        aria-label={`${VULN_LABELS[type]}${drill ? " drill" : ""} · ${title}`}
        aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
        <WatchTypeLabel type={type} drill={drill} />
        <ChevronDown size={12} className="pw-watch-card-caret" aria-hidden />
      </button>
      {asset && <button className="pw-watch-asset" type="button" data-watch-select={asset.id} aria-label={`Select ${asset.id} · ${asset.name}`}
        title={asset.name} onClick={() => useTwinStore.getState().select(asset.id)}>
        {asset.id}
      </button>}
      {!asset && <span className="pw-watch-no-match">No plant match</span>}
      {ledger && <span className="pw-watch-amount pw-mono" title={`Estimated loss per ${comparable ? "comparable " : ""}event`}>
        <small>est.</small> {formatUsd(ledger.total)}
      </span>}
      <div id={detailsId} className="pw-watch-card-body" hidden={!open}>
        {open && <div className="pw-panel-disclosure-body">
          {children}
          {estimate && ledger && <LossBreakdown estimate={estimate} ledger={ledger} />}
        </div>}
      </div>
    </div>
  );
}
