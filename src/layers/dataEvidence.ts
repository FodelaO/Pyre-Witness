/** Joins assumed software, deterministic cyber findings, and completed watch evidence. */
import type { RuleFinding, Severity, Twin } from "@/twin/types";
import { inventoryForTwin } from "@/watch/inventory";
import type { WatchReport } from "@/watch/types";

export interface SoftwareIdentity {
  vendor?: string;
  product?: string;
  version?: string;
  os?: string;
  assumed: boolean;
}

export interface VulnerabilitySummary {
  count: number;
  worst: Severity | null;
  findings: Pick<RuleFinding, "ruleId" | "title" | "severity">[];
  advisories: string[];
}

const findingIndices = new WeakMap<readonly RuleFinding[], ReadonlyMap<string, VulnerabilitySummary["findings"]>>();

function cyberFindings(findings: readonly RuleFinding[], assetId: string) {
  let index = findingIndices.get(findings);
  if (!index) {
    const grouped = new Map<string, Map<string, VulnerabilitySummary["findings"][number]>>();
    for (const { kind, assetId, ruleId, title, severity } of findings) {
      if (kind !== "cyber") continue;
      const group = grouped.get(assetId) ?? new Map();
      const finding = group.get(ruleId);
      if (!finding || finding.severity < severity) group.set(ruleId, { ruleId, title, severity });
      grouped.set(assetId, group);
    }
    index = new Map([...grouped].map(([id, group]) => [id, [...group.values()]]));
    findingIndices.set(findings, index);
  }
  return index.get(assetId) ?? [];
}

function supportedSeverity(value: number | undefined): Severity | null {
  // Watch uses a 0–4 operational-impact scale, while the rules engine uses 1–5.
  return value === undefined || !Number.isFinite(value) || value < 0 || value > 4
    ? null
    : (1 + Math.round(value)) as Severity;
}

export function buildEvidence(twin: Twin) {
  const inventory = new Map(inventoryForTwin(twin).map((item) => [item.assetId, item]));
  const software = new Map<string, SoftwareIdentity>();
  for (const asset of twin.assets) {
    const bom = inventory.get(asset.id);
    const vendor = bom?.vendor ?? asset.cyber?.vendor?.trim();
    const product = bom?.product ?? asset.cyber?.model?.trim();
    const version = bom?.version ?? asset.cyber?.firmware?.trim();
    const os = asset.cyber?.os?.trim();
    if (vendor || product || version || os) {
      software.set(asset.id, { vendor, product, version, os, assumed: bom?.identity === "assumed" || asset.origin === "seed" });
    }
  }

  function vulnerabilityOf(assetId: string, riskFindings: readonly RuleFinding[], reports: readonly (WatchReport | undefined)[]): VulnerabilitySummary {
    const findings = cyberFindings(riskFindings, assetId);
    let worst: Severity | null = null;
    const advisories = new Set<string>();
    for (const { severity } of findings) if (worst === null || severity > worst) worst = severity;
    const identity = inventory.get(assetId);
    for (const report of reports) {
      if (!report || !identity) continue;
      const matchedItems = new Set(report.items.filter(({ affectedAssetIds }) => affectedAssetIds.includes(assetId)).map(({ threat }) => threat.id));
      for (const candidate of report.candidates) {
        const { inventory: matched, threat, disposition } = candidate;
        if (matched.assetId !== assetId || matched.vendor !== identity.vendor || matched.product !== identity.product
          || matched.version !== identity.version || disposition === "excluded" || !matchedItems.has(threat.id)) continue;
        advisories.add(threat.id);
        const severity = disposition === "supported" ? supportedSeverity(candidate.decisions?.severity) : null;
        if (severity && (worst === null || severity > worst)) worst = severity;
      }
    }
    return { count: findings.length + advisories.size, worst, findings, advisories: [...advisories].sort() };
  }

  return { softwareOf: (id: string) => software.get(id), vulnerabilityOf };
}
