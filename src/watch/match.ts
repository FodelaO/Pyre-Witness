/** Ranks advisory-to-asset hypotheses using product identity, version mentions and modeled exposure. */
import type { Candidate, InventoryEntry, ThreatItem } from "./types";

const MAX_CANDIDATES = 24;

function words(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mentions(text: string, term: string): boolean {
  const normalized = words(term);
  return !!normalized && ` ${text} `.includes(` ${normalized} `);
}

function matchThreat(threat: ThreatItem, inventory: InventoryEntry[]): Candidate[] {
  const text = words([threat.title, threat.vendor, threat.product, threat.summary].filter(Boolean).join(" "));
  const versions = new Set(`${threat.title} ${threat.summary}`.match(/\bv?\d+(?:\.\d+)+(?:\([\da-z]+\)[a-z\d]+)?\b/gi)
    ?.map((value) => value.toLowerCase().replace(/^v/, "")) ?? []);

  return inventory.flatMap((entry) => {
    const vendors = [entry.vendor, ...(entry.vendorAliases ?? [])];
    const vendorMentioned = vendors.some((vendor) => mentions(words(threat.vendor ?? text), vendor));
    if (threat.vendor && !vendorMentioned) return [];
    const product = [entry.product, ...(entry.productAliases ?? [])].find((name) => mentions(text, name));
    if (!product) return [];

    const { exposure } = entry;
    const reasons = [`Product family · ${product}`];
    let score = 6 + (vendorMentioned ? 3 : 0);
    const versionMentioned = !!entry.version && versions.has(entry.version.toLowerCase().replace(/^v/, ""));
    if (versionMentioned) {
      score += 2;
      reasons.push(`Version mentioned · ${entry.version}`);
    }

    const protocol = exposure.protocols.find((name) => mentions(text, name));
    if (protocol) {
      score += 2;
      reasons.push(`Protocol · ${protocol}`);
    }
    if (/\b(?:remote|internet|network|vpn)\b/.test(text) && (exposure.internetFacing || exposure.remoteAccess)) {
      score += 2;
      reasons.push(exposure.internetFacing ? "Internet boundary" : "Modeled remote access");
    }
    if (/\b(?:wireless|wi fi|wifi|bluetooth|cellular|lte|radio)\b/.test(text) && exposure.radios.length > 0) {
      score += 2;
      reasons.push(`Radio · ${exposure.radios.join(", ")}`);
    }
    if (threat.source === "cisa-ics" && exposure.level <= 2) {
      score += 1;
      reasons.push(`Control network · L${exposure.level}`);
    }
    return [{ threat, inventory: entry, score, reasons, versionMentioned }];
  });
}

export function matchThreats(threats: ThreatItem[], inventory: InventoryEntry[]): Candidate[] {
  return threats.flatMap((threat) => matchThreat(threat, inventory))
    .sort((a, b) => b.score - a.score || b.inventory.criticality - a.inventory.criticality
      || b.threat.published.localeCompare(a.threat.published) || a.threat.id.localeCompare(b.threat.id)
      || a.threat.source.localeCompare(b.threat.source) || a.inventory.assetId.localeCompare(b.inventory.assetId))
    .slice(0, MAX_CANDIDATES);
}
