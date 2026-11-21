/** Human approval queue and measured outcomes from applied mitigations. */
"use client";

import { Check, ClipboardList, Cpu, ShieldCheck, Timer, Wrench, X } from "lucide-react";
import { useMemo } from "react";
import { formatUsd } from "@/econ/format";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { assetLabel } from "@/floor/assetLabel";
import { useRunStore } from "@/pipeline/runStore";
import { formatSimTime } from "@/sim/Timeline";
import { useSimStore } from "@/sim/simStore";
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { projectedMitigationBenefit, type MitigationBenefit } from "./mitigationBenefit";
import { groupMitigations, isSimulationMitigation } from "./mitigationGroups";
import { projectMitigation } from "./mitigationProjection";
import { PanelHeading, TextPreview } from "./PanelParts";
import { riskDelta } from "./riskNumber";
import "./mitigationQueue.css";

const KIND = { physical: Wrench, software: Cpu, procedural: ClipboardList };

function Delta({ delta, measured }: { delta: number | undefined; measured: boolean }) {
  if (delta == null || riskDelta(delta) === "0") return measured ? <span className="pw-panel-muted">Applied</span> : null;
  return (
    <span className="pw-panel-delta pw-mono" data-direction={Math.sign(delta)}
      title={`Plant risk points, ${measured ? "measured by the rules engine after approval" : "projected by the rules engine"}`}>
      {riskDelta(delta)} <span>pts {measured ? "measured" : "projected"}</span>
    </span>
  );
}

function ContainmentGain({ item }: { item: Mitigation }) {
  if (!isSimulationMitigation(item)) return null;
  const { before, after, safeguard } = item.simulationContainment;
  const seconds = before === null ? 0 : before - after;
  if (before !== null && seconds <= 0) return null;
  const gain = before === null ? "Containment gained" : `${seconds} s earlier`;
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

function Proposal({ item, projected, benefit }: { item: Mitigation; projected: number; benefit: MitigationBenefit | null }) {
  const twin = useEconomicTwin();
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
            const label = asset ? assetLabel(asset) : area?.name ?? conduit?.name ?? id;
            return asset || area ? (
              <button type="button" className="pw-panel-chip pw-panel-chip-action pw-mono" key={id} onClick={() => select(id)}>{label}</button>
            ) : <span className="pw-panel-chip pw-mono" key={id}>{label}</span>;
          })}
        </div>
      )}
      {item.description && <TextPreview text={item.description} label="Mitigation details" />}
      <ContainmentGain item={item} />
      {benefit && <div className="pw-panel-containment"><strong>{formatUsd(benefit.amount)} est. avoided {benefit.period}</strong></div>}
      <div className="pw-panel-proposal-action">
        <Delta delta={projected} measured={false} />
        <div className="pw-panel-actions">
          <button type="button" className="pw-panel-button pw-panel-approve" aria-label={`Approve ${item.title}`} onClick={() => {
            const { twin, risk } = useTwinStore.getState();
            if (!projectMitigation(twin, item, risk.score).resolved) decide(item.id, "approved");
          }}>
            <Check size={14} aria-hidden />Approve
          </button>
          <button type="button" className="pw-panel-button" aria-label={`Reject ${item.title}`} onClick={() => decide(item.id, "rejected")}>Reject</button>
        </div>
      </div>
    </li>
  );
}

export function MitigationQueue({ items, label = "Mitigations" }: { items: Mitigation[]; label?: string }) {
  const twin = useEconomicTwin();
  const risk = useTwinStore((state) => state.risk);
  const decisions = useTwinStore((state) => state.mitigations);
  const run = useSimStore((state) => state.mode === "finished" ? state.run : null);
  const runId = useRunStore((state) => state.runId);
  const placedAssetId = useRunStore((state) => state.placedAssetId);
  const { groups, pendingCount } = useMemo(() => {
    const proposals = items.filter(({ status }) => status === "proposed").map((item) => ({
      item, ...projectMitigation(twin, item, risk.score),
    }));
    const pending = proposals.filter(({ resolved }) => !resolved).map((row) => ({
      ...row, benefit: riskDelta(row.delta) === "0" ? projectedMitigationBenefit(twin, risk, row.item, run, decisions) : null,
    }));
    const resolved = proposals.filter(({ resolved }) => resolved).map((row) => ({ ...row, benefit: null }));
    const decided = items.filter(({ status }) => status !== "proposed")
      .map((item) => ({ item, resolved: null, delta: 0, benefit: null }));
    return {
      groups: groupMitigations([...pending, ...resolved, ...decided], twin, run?.id, { runId, placedAssetId }),
      pendingCount: pending.length,
    };
  }, [items, twin, risk, run, decisions, runId, placedAssetId]);
  return (
    <>
      <PanelHeading icon={ShieldCheck} aside={pendingCount > 0 && <span className="pw-panel-chip" data-tone="attention">Awaiting approval · {pendingCount}</span>}>{label}</PanelHeading>
      <div className="pw-panel-mitigation-groups">
        {groups.map(({ key, label, active, rows }) => (
          <section className="pw-panel-mitigation-group" key={key} data-active-outcome={active || undefined}>
            <h3>{label}</h3>
            <ul className="pw-panel-list" aria-label={label}>
              {rows.map(({ item, delta, resolved, benefit }) => {
                if (item.status === "proposed" && !resolved) {
                  return <Proposal key={item.id} item={item} projected={delta} benefit={benefit} />;
                }
                const Icon = item.status === "rejected" ? X : Check;
                return (
                  <li className="pw-panel-decision" data-status={resolved ? "resolved" : item.status} key={item.id}>
                    <Icon size={13} aria-hidden />
                    <span title={item.title}>{item.title}</span>
                    {item.status === "applied" ? <Delta delta={item.riskDelta} measured />
                      : <span className="pw-panel-muted">{resolved ?? (item.status === "rejected" ? "Rejected" : "Approved")}</span>}
                    {item.status === "applied" && <ContainmentGain item={item} />}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
