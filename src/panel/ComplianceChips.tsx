/** Assessment clauses grouped by framework, with notes available on hover or tap. */
"use client";

import { Check, CircleHelp, ClipboardCheck, Minus } from "lucide-react";
import type { ComplianceItem } from "@/pipeline/types";
import { PanelHeading } from "./PanelParts";

const STATUS = {
  met: { icon: Check, label: "Met" },
  gap: { icon: Minus, label: "Gap" },
  unknown: { icon: CircleHelp, label: "Unknown" },
};

function Clause({ item }: { item: ComplianceItem }) {
  const { icon: Icon, label } = STATUS[item.status];
  const content = <><Icon size={12} aria-hidden /><span className="pw-mono">{item.clause}</span><span>{label}</span></>;
  return item.note ? (
    <details className="pw-panel-clause">
      <summary className="pw-panel-chip" data-status={item.status} title={item.note}>{content}</summary>
      <p>{item.note}</p>
    </details>
  ) : <span className="pw-panel-chip" data-status={item.status}>{content}</span>;
}

export function ComplianceChips({ items }: { items: ComplianceItem[] }) {
  const grouped = new Map<string, ComplianceItem[]>();
  for (const item of items) {
    const clauses = grouped.get(item.framework) ?? [];
    clauses.push(item);
    grouped.set(item.framework, clauses);
  }
  return (
    <>
      <PanelHeading icon={ClipboardCheck}>Compliance</PanelHeading>
      <div className="pw-panel-frameworks">
        {Array.from(grouped, ([framework, clauses]) => (
          <div key={framework}>
            <h3>{framework}</h3>
            <div className="pw-panel-chips">
              {clauses.map((item, index) => <Clause key={`${item.clause}-${index}`} item={item} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
