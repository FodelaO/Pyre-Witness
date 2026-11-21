/** Human approval queue and measured outcomes from applied mitigations. */
"use client";

import { Check, ClipboardList, Cpu, ShieldCheck, Timer, Wrench, X } from "lucide-react";
import { formatSimTime } from "@/sim/Timeline";
import type { SimulationMitigation } from "@/sim/types";
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { formatDelta, PanelHeading, TextPreview } from "./PanelParts";

const KIND = { physical: Wrench, software: Cpu, procedural: ClipboardList };

function Delta({ delta, measured }: { delta: number | undefined; measured: boolean }) {
  if (delta == null) return <span className="pw-panel-muted">{measured ? "Delta unavailable" : "Projection unavailable"}</span>;
  return (
    <span className="pw-panel-delta pw-mono" data-direction={Math.sign(delta)}>
      {formatDelta(delta)} <span>risk pts {measured ? "measured" : "projected"}</span>
    </span>
  );
}

function ContainmentGain({ item }: { item: Mitigation }) {
  const benefit = (item as Partial<SimulationMitigation>).simulationContainment;
  if (!benefit) return null;
  const { before, after, safeguard } = benefit;
  const seconds = before === null ? 0 : before - after;
  const gain = before === null ? "Containment gained" : seconds > 0 ? `${seconds} s earlier` : "Earlier safeguard";
  const interval = `${before === null ? "Uncontained" : formatSimTime(before)} → ${formatSimTime(after)}`;
  return (
    <div className="pw-panel-containment">
      <Timer size={14} aria-hidden />
      <div>
        <strong>{gain}</strong> <span className="pw-mono">{interval}</span>
        <small>Simulated projection · {safeguard}</small>
      </div>
    </div>
  );
}

function Proposal({ item }: { item: Mitigation }) {
  const twin = useTwinStore((state) => state.twin);
  const select = useTwinStore((state) => state.select);
  const decide = useTwinStore((state) => state.decideMitigation);
  const Icon = KIND[item.kind];
  return (
    <li className="pw-panel-proposal">
      <div className="pw-panel-proposal-title"><Icon size={14} aria-label={item.kind} /><strong>{item.title}</strong></div>
      {item.targets.length > 0 && (
        <div className="pw-panel-chips" aria-label="Mitigation targets">
          {item.targets.map((id) => {
            const asset = twin.assets.find((candidate) => candidate.id === id);
            const area = twin.areas.find((candidate) => candidate.id === id);
            const conduit = twin.conduits.find((candidate) => candidate.id === id);
            const label = area?.name ?? conduit?.name ?? id;
            return asset || area ? (
              <button type="button" className="pw-panel-chip pw-panel-chip-action pw-mono" key={id} onClick={() => select(id)}>{label}</button>
            ) : <span className="pw-panel-chip pw-mono" key={id}>{label}</span>;
          })}
        </div>
      )}
      {item.description && <TextPreview text={item.description} label="Mitigation details" />}
      <ContainmentGain item={item} />
      <div className="pw-panel-proposal-action">
        <Delta delta={item.riskDelta} measured={false} />
        <div className="pw-panel-actions">
          <button type="button" className="pw-panel-button pw-panel-approve" aria-label={`Approve ${item.title}`} onClick={() => decide(item.id, "approved")}>
            <Check size={14} aria-hidden />Approve
          </button>
          <button type="button" className="pw-panel-button" aria-label={`Reject ${item.title}`} onClick={() => decide(item.id, "rejected")}>Reject</button>
        </div>
      </div>
    </li>
  );
}

export function MitigationQueue({ items }: { items: Mitigation[] }) {
  const pending = items.filter((item) => item.status === "proposed");
  const decided = items.filter((item) => item.status !== "proposed");
  return (
    <>
      <PanelHeading icon={ShieldCheck} aside={pending.length > 0 && <span className="pw-panel-chip" data-tone="attention">Awaiting approval · {pending.length}</span>}>Mitigations</PanelHeading>
      <ul className="pw-panel-list">
        {pending.map((item) => <Proposal key={item.id} item={item} />)}
        {decided.map((item) => {
          const Icon = item.status === "rejected" ? X : Check;
          return (
            <li className="pw-panel-decision" data-status={item.status} key={item.id}>
              <Icon size={13} aria-hidden />
              <span title={item.title}>{item.title}</span>
              {item.status === "applied" ? <Delta delta={item.riskDelta} measured /> : <span className="pw-panel-muted">{item.status === "rejected" ? "Rejected" : "Approved"}</span>}
              {item.status === "applied" && <ContainmentGain item={item} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
