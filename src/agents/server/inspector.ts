/** Answers finding questions directly from the deterministic rules snapshot. */
import type { AgentContext } from "@/agents/context";

export function inspectorReply(message: string, context: AgentContext): string {
  const tokens = new Set(message.toLowerCase().match(/[a-z0-9_-]+/g) ?? []);
  const mentioned = (tag: string) => tokens.has(tag.toLowerCase());
  const findings = [...context.findings].sort((a, b) => b.severity - a.severity);
  const matches = findings.filter(({ assetId, ruleId }) => mentioned(assetId) || mentioned(ruleId));
  const asksAboutTag = (context.selected && mentioned(context.selected.id))
    || [...tokens].some((token) => /^[a-z][a-z0-9]*[-_][a-z0-9_-]*\d[a-z0-9_-]*$/i.test(token));
  const relevant = matches.length || asksAboutTag ? matches : findings.slice(0, 3);
  if (!relevant.length) {
    return asksAboutTag ? "No matching rule findings in this snapshot." : "No rule findings in this snapshot.";
  }
  return relevant.map(({ assetId, ruleId, title, severity }) => `${assetId} · ${ruleId} · ${title} (${severity}/5)`).join("\n");
}
