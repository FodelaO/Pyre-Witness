/** Renders a compact evidence list and the watch-specific approval cards. */
"use client";

import { ArrowUpRight } from "lucide-react";
import { useTwinStore } from "@/twin/store";
import { WATCH_SOURCES } from "./sources";
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

function AssetTags({ ids }: { ids: string[] }) {
  const assets = useTwinStore((state) => state.twin.assets);
  const hover = useTwinStore((state) => state.hover);
  const select = useTwinStore((state) => state.select);
  return (
    <div className="flex flex-wrap gap-1" aria-label="Twin assets">
      {ids.map((id) => {
        const exists = assets.some((asset) => asset.id === id);
        return (
          <button key={id} type="button" disabled={!exists} className={`${chip} hover:border-pw-info disabled:opacity-50`}
            onPointerEnter={() => exists && hover(id)} onPointerLeave={() => hover(null)}
            onFocus={() => hover(id)} onBlur={() => hover(null)} onClick={() => select(id)}>
            {id}
          </button>
        );
      })}
    </div>
  );
}

function ThreatRow({ row }: { row: Row }) {
  const { threat, assetIds, finding } = row;
  const shortId = threat.cves[0] ?? (threat.id !== threat.url ? threat.id : undefined);
  return (
    <li className="min-w-0 space-y-1 border-t border-pw-line py-2">
      <div className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-pw-dim">
        <span>{WATCH_SOURCES[threat.source].label}</span>
        {shortId && <span title={[threat.id, ...threat.cves].join(" · ")}>{shortId}</span>}
        {(finding?.triage ?? row.disposition) === "uncertain" && <span className="text-pw-attention">Uncertain</span>}
        {row.disposition === "excluded" && <span>Excluded by triage</span>}
      </div>
      <a className="flex min-w-0 items-center gap-1 text-pw-text hover:text-pw-info" href={threat.url}
        target="_blank" rel="noreferrer" title={threat.title}>
        <span className="truncate">{threat.title}</span><ArrowUpRight size={12} className="shrink-0" aria-hidden />
      </a>
      <AssetTags ids={assetIds} />
      {finding && <p className="text-[11px] text-pw-dim">{finding.technique && `${finding.technique.id} · `}{finding.why}</p>}
    </li>
  );
}

export function WatchThreats({ candidates, report }: { candidates: Candidate[]; report?: WatchReport }) {
  const findings = report?.items ?? [];
  const rows: Row[] = findings.length > 0
    ? findings.map((finding) => ({ threat: finding.threat, assetIds: finding.affectedAssetIds, finding }))
    : candidateRows(candidates);
  if (!rows.length) return null;

  const list = (items: Row[]) => (
    <ul>{items.map((row) => <ThreatRow key={`${row.threat.source}:${row.threat.id}`} row={row} />)}</ul>
  );
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-medium text-pw-dim">{findings.length ? "Assessed advisories" : "Candidate matches"} · {rows.length}</h4>
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
