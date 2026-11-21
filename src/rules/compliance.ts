/** Resolves rule citations from the shared catalogue for display and API output. */
import { clauseById, type ComplianceClause } from "@/data/compliance";

function formatReference({ framework, clause }: ComplianceClause): string {
  const [issuer, title, code] = framework.split(" ", 3);
  if (clause === framework || clause.startsWith(`${issuer} `)) return clause;
  if (code === "CFR" && clause.startsWith(`${title} CFR `)) return `${issuer} ${clause}`;
  return `${framework} ${clause}`;
}

function requireClause(id: string): ComplianceClause {
  const entry = clauseById(id);
  if (!entry) throw new Error(`Unknown rule compliance clause: ${id}`);
  return entry;
}

export function complianceReferences(...ids: string[]): string[] {
  return ids.map((id) => formatReference(requireClause(id)));
}

/** Use the catalogue's framework label when a specific clause has no catalogue entry. */
export function complianceDocument(relatedClauseId: string): string {
  return requireClause(relatedClauseId).framework;
}
