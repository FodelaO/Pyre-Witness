/** Resolves rule citations from the shared catalogue for display and API output. */
import { clauseById, type ComplianceClause } from "@/data/compliance";

function formatReference({ framework, clause }: ComplianceClause): string {
  const [issuer, title, code] = framework.split(" ", 3);
  if (clause === framework || clause.startsWith(`${issuer} `)) return clause;
  if (code === "CFR" && clause.startsWith(`${title} CFR `)) return `${issuer} ${clause}`;
  return `${framework} ${clause}`;
}

export function complianceReferences(...ids: string[]): string[] {
  return ids.map((id) => {
    const entry = clauseById(id);
    if (!entry) throw new Error(`Unknown rule compliance clause: ${id}`);
    return formatReference(entry);
  });
}
