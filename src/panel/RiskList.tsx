/** Risk rows with a 5×5 severity and likelihood marker and expandable mitigations. */
"use client";

import { ClipboardCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import type { RiskItem } from "@/pipeline/types";
import { Disclosure, PanelHeading, TechniqueChip } from "./PanelParts";

export const RISK_ICONS = { cyber: ShieldAlert, physical: TriangleAlert, compliance: ClipboardCheck };

function RiskMatrix({ severity, likelihood }: Pick<RiskItem, "severity" | "likelihood">) {
  const label = `Severity ${severity} of 5, likelihood ${likelihood} of 5`;
  return (
    <svg className="pw-panel-matrix" data-severity={severity} viewBox="0 0 26 26" role="img" aria-label={label}>
      <title>{label}</title>
      <path d="M1 1h24v24H1z M1 6h24 M1 11h24 M1 15h24 M1 20h24 M6 1v24 M11 1v24 M15 1v24 M20 1v24" />
      <circle cx={3.4 + (likelihood - 1) * 4.8} cy={22.6 - (severity - 1) * 4.8} r="1.9" />
    </svg>
  );
}

export function RiskList({ risks }: { risks: RiskItem[] }) {
  return (
    <>
      <PanelHeading icon={ShieldAlert}>Risks <span className="pw-panel-muted pw-mono">{risks.length}</span></PanelHeading>
      {!risks.length && <p className="pw-panel-muted">No additional risks reported.</p>}
      <ul className="pw-panel-list">
        {risks.map((risk) => {
          const Icon = RISK_ICONS[risk.kind];
          return (
            <li key={risk.id} className="pw-panel-risk-row">
              <Disclosure label={
                <span className="pw-panel-risk-label">
                  <RiskMatrix severity={risk.severity} likelihood={risk.likelihood} />
                  <span title={risk.kind}><Icon size={14} aria-label={`${risk.kind} risk`} /></span>
                  <strong>{risk.title}</strong>
                </span>
              }>
                {risk.description && <p>{risk.description}</p>}
                {risk.mitigation && <p><strong>Mitigation</strong> {risk.mitigation}</p>}
              </Disclosure>
              {risk.technique && <div className="pw-panel-risk-technique"><TechniqueChip technique={risk.technique} /></div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
