/** Displays the same software and completed advisory matches as the floor annotations. */
"use client";

import { ArrowUpRight, Cpu, Radar } from "lucide-react";
import { getDataModel } from "@/layers/dataModel";
import { useTwinStore } from "@/twin/store";
import type { RuleFinding } from "@/twin/types";
import { useWatchStore } from "@/watch/watchStore";

export function AssetDataEvidence({ assetId, findings }: { assetId: string; findings: readonly RuleFinding[] }) {
  const model = useTwinStore((state) => getDataModel(state.twin));
  const local = useWatchStore((state) => state.local.report);
  const managed = useWatchStore((state) => state.managed.report);
  const reports = [local, managed];
  const identity = model.softwareOf(assetId);
  const { advisories } = model.vulnerabilityOf(assetId, findings, reports);
  const names = identity && [identity.vendor, identity.product, identity.version, identity.os].filter(Boolean).join(" · ");
  const items = reports.flatMap((report) => report?.items ?? []);
  // A tank or a valve runs no software: say nothing instead of two empty readouts.
  if (!names && !advisories.length) return null;

  return (
    <>
      {names && <div className="pw-panel-subsection">
        <h3><Cpu size={13} aria-hidden />{identity?.assumed ? "Assumed software" : "Software"}</h3>
        <p className="pw-mono pw-panel-software">{names}</p>
      </div>}
      <div className="pw-panel-subsection">
        <h3><Radar size={13} aria-hidden />Matched advisories</h3>
        {advisories.length ? (
          <ul className="pw-panel-list pw-panel-advisories">
            {advisories.map((id) => {
              const match = items.find(({ threat, affectedAssetIds }) => threat.id === id && affectedAssetIds.includes(assetId));
              if (!match) return null;
              const label = match.threat.cves[0] ?? (id === match.threat.url ? "Advisory" : id);
              return (
                <li key={id}>
                  <a className="pw-panel-link" href={match.threat.url} rel="noreferrer" target="_blank">
                    <span className="pw-mono">{label}</span> <span>{match.threat.title}</span><ArrowUpRight size={12} aria-hidden />
                  </a>
                  {match.triage === "uncertain" && <span className="pw-panel-muted">Applicability uncertain</span>}
                </li>
              );
            })}
          </ul>
        ) : <p className="pw-panel-muted">{local || managed ? "None matched." : "Threat watch has not run."}</p>}
      </div>
    </>
  );
}
