/** Renders a compact evidence list and the watch-specific approval cards. */
"use client";

import { WatchLoss } from "@/econ/mountsWatch";
import { useTwinStore } from "@/twin/store";
import { threatKey, WATCH_SOURCES } from "./sources";
import type { Candidate, ThreatItem, WatchFinding, WatchReport } from "./types";

const chip = "rounded border border-pw-line-strong px-1.5 py-0.5 font-mono text-[10px]";

interface Row {
  threat: ThreatItem;
  assetIds: string[];
  finding?: WatchFinding;
  disposition?: Candidate["disposition"];
}

function candidateRows(candidates: Candidate[]): Row[] {
  const rows = new Map<string, Row>();
  const hasSurviving = candidates.some(({ disposition }) => disposition !== "excluded");
  for (const { threat, inventory, disposition } of candidates) {
    if (hasSurviving && disposition === "excluded") continue;
    const key = `${threat.source}:${threat.id}`;
    const row = rows.get(key) ?? { threat, assetIds: [] };
    if (!row.assetIds.includes(inventory.assetId)) row.assetIds.push(inventory.assetId);
    if (disposition === "uncertain" || row.disposition === undefined) row.disposition = disposition;
    rows.set(key, row);
  }
  return [...rows.values()];
}

function ThreatRow({ row }: { row: Row }) {
  const { threat, assetIds, finding } = row;
  const hasAsset = useTwinStore((state) => state.twin.assets.some((asset) => assetIds.includes(asset.id)));
  const triage = finding?.triage ?? row.disposition;
  const evidence = [WATCH_SOURCES[threat.source].label, ...threat.cves, triage].filter(Boolean).join(" · ");
  // Several advisories can share one product title, so the identifier is what tells the rows apart.
  const extra = threat.cves.length - 1;
  return (
    <li className="min-w-0 space-y-1 border-t border-pw-line py-2" data-watch-source={threat.source}>
      {(threat.cves.length > 0 || triage) && (
        <div className="pw-watch-evidence pw-mono">
          {threat.cves[0] && <span>{threat.cves[0]}{extra > 0 && ` +${extra}`}</span>}
          {triage && <span data-triage={triage}>{triage}</span>}
        </div>
      )}
      <a className="block min-w-0 text-pw-text hover:text-pw-info [overflow-wrap:anywhere]" href={threat.url}
        target="_blank" rel="noopener noreferrer" title={evidence} aria-label={`${threat.title} · ${evidence}`}>{threat.title}</a>
      {hasAsset && row.disposition !== "excluded" && <WatchLoss item={threat} assetIds={assetIds} />}
    </li>
  );
}

function ThreatList({ rows, title }: { rows: Row[]; title: string }) {
  if (!rows.length) return null;
  const list = (items: Row[]) => (
    <ul>{items.map((row) => <ThreatRow key={threatKey(row.threat)} row={row} />)}</ul>
  );
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-medium text-pw-dim">{title} · {rows.length}</h4>
      {list(rows.slice(0, 4))}
      {rows.length > 4 && (
        <details>
          <summary className="cursor-pointer text-[11px] text-pw-dim">{rows.length - 4} more</summary>
          {list(rows.slice(4))}
        </details>
      )}
    </div>
  );
}

export function WatchThreats({ candidates, unmatchedNews, report, managed = false }: {
  candidates: Candidate[];
  unmatchedNews?: ThreatItem[];
  report?: WatchReport;
  managed?: boolean;
}) {
  const findings = report?.items ?? [];
  const rows: Row[] = findings.length > 0
    ? findings.map((finding) => ({ threat: finding.threat, assetIds: finding.affectedAssetIds, finding }))
    : candidateRows(candidates);
  const title = findings.length ? "Assessed advisories" : managed ? "Local cross-check matches" : "Candidate matches";
  return (
    <>
      <ThreatList rows={rows} title={title} />
      {!!unmatchedNews?.length && <details className="pw-watch-notes">
        <summary>{unmatchedNews.length} other items · not relevant to this plant</summary>
        <ul>{unmatchedNews.map((threat) => <ThreatRow key={threatKey(threat)} row={{ threat, assetIds: [] }} />)}</ul>
      </details>}
    </>
  );
}

export function WatchRecommendations({ report }: { report: WatchReport }) {
  const mitigations = useTwinStore((state) => state.mitigations);
  const decide = useTwinStore((state) => state.decideMitigation);
  const watchIds = new Set(report.recommendations.map(({ id }) => id));
  const pending = mitigations.filter(({ id, proposedBy }) => watchIds.has(id) && proposedBy === "threat-watch");
  if (!pending.length) return null;

  return (
    <ul className="space-y-2" aria-label="Watch recommendations">
      {pending.map((item) => {
        const delta = item.riskDelta;
        const applied = item.effects.every(({ type }) => type === "note") ? "Recorded" : "Applied";
        const status = item.status === "applied" ? applied : item.status === "rejected" ? "Rejected" : "Approved";
        return (
          <li className="space-y-1 rounded-md border border-pw-line bg-pw-panel-2 p-2" key={item.id}>
            <p className="font-medium">{item.title}</p>
            <p className="text-[11px] text-pw-dim">{item.description}</p>
            {delta === undefined ? <p className="text-[11px] text-pw-dim">Score unavailable</p> : (
              <div className={`font-mono text-[10px] ${delta < 0 ? "text-pw-ok" : "text-pw-attention"}`}>
                {delta > 0 ? "+" : ""}{delta.toFixed(2)} pts · {item.status === "applied" ? "measured on approval" : "measured at run"}
                {delta >= 0 ? " · No reduction" : ""}
              </div>
            )}
            {item.status === "proposed" ? (
              <div className="flex gap-1.5">
                <button type="button" aria-label={`Approve ${item.title}`} className={`${chip} hover:border-pw-ok`}
                  onClick={() => decide(item.id, "approved")}>Approve</button>
                <button type="button" aria-label={`Reject ${item.title}`} className={`${chip} hover:border-pw-dim`}
                  onClick={() => decide(item.id, "rejected")}>Reject</button>
              </div>
            ) : <p className="text-[11px] text-pw-dim">{status}</p>}
          </li>
        );
      })}
    </ul>
  );
}
