/** Flags flat or unenforced network links across different trust or consequence zones. */
import type { Asset, Severity } from "@/twin/types";
import { complianceReferences } from "../compliance";
import type { Rule, RuleContext, RuleEvidence } from "../context";

interface ZoneProfile {
  assets: Asset[];
  minCriticality: Severity;
  maxCriticality: Severity;
  hasSafetyCritical: boolean;
  hasOtherAssets: boolean;
  hasOt: boolean;
  hasExternal: boolean;
}

interface BoundaryEvidence {
  details: Set<string>;
  severity: Severity;
}

function zoneProfiles(ctx: RuleContext): Map<string, ZoneProfile> {
  const profiles = new Map<string, ZoneProfile>();
  for (const [zone, zoneAssets] of ctx.zoneAssets) {
    const profile: ZoneProfile = {
      assets: [], minCriticality: 5, maxCriticality: 1,
      hasSafetyCritical: false, hasOtherAssets: false, hasOt: false, hasExternal: false,
    };
    for (const asset of zoneAssets) {
      if (!ctx.hasCyberSurface(asset) || !ctx.isNetworked(asset)) continue;
      profile.assets.push(asset);
      if (asset.criticality < profile.minCriticality) profile.minCriticality = asset.criticality;
      if (asset.criticality > profile.maxCriticality) profile.maxCriticality = asset.criticality;
      if (asset.safetyCritical === true) profile.hasSafetyCritical = true;
      else profile.hasOtherAssets = true;
      if (asset.network.level <= 3) profile.hasOt = true;
      else profile.hasExternal = true;
    }
    if (profile.assets.length) profiles.set(zone, profile);
  }
  return profiles;
}

function differentTrust(a: ZoneProfile, b: ZoneProfile): boolean {
  return (a.hasOt && b.hasExternal) || (b.hasOt && a.hasExternal);
}

function crossesSafety(a: ZoneProfile, b: ZoneProfile): boolean {
  return (a.hasSafetyCritical && b.hasOtherAssets) || (b.hasSafetyCritical && a.hasOtherAssets);
}

function differentCriticality(a: ZoneProfile, b: ZoneProfile): boolean {
  return a.maxCriticality > b.minCriticality || b.maxCriticality > a.minCriticality;
}

export default {
  id: "ZONE-02",
  title: "Unenforced network boundary",
  kind: "cyber",
  references: complianceReferences("iec62443-3-3-sr-5.1", "iec62443-3-3-sr-5.2", "nist-800-82r3-5.2.3"),
  description: "An active link or declared conduit crosses a trust boundary or connects assets of unequal consequence across zones without verified enforcement.",
  check(ctx) {
    const zones = zoneProfiles(ctx);
    const evidence = new Map<string, BoundaryEvidence>();
    const observedConduits = new Set<string>();

    function add(asset: Asset, detail: string, severity: Severity) {
      const existing = evidence.get(asset.id);
      if (existing) {
        existing.details.add(detail);
        if (severity > existing.severity) existing.severity = severity;
      } else {
        evidence.set(asset.id, { details: new Set([detail]), severity });
      }
    }

    for (const asset of ctx.twin.assets) {
      for (const peer of ctx.links(asset)) {
        if (asset.id >= peer.id) continue;
        const zoneA = asset.network.area;
        const zoneB = peer.network.area;
        const crossesTrust = (asset.network.level <= 3) !== (peer.network.level <= 3);
        if (zoneA === zoneB) {
          if (!crossesTrust) continue;
          const detail = `The shared ${zoneA} network directly connects OT to the DMZ or enterprise side (${asset.id} and ${peer.id}).`;
          add(asset, detail, 4);
          add(peer, detail, 4);
          continue;
        }

        const a = zones.get(zoneA);
        const b = zones.get(zoneB);
        if (!a || !b) continue;
        const safetyBoundary = crossesSafety(a, b);
        if (!crossesTrust && !safetyBoundary && !differentCriticality(a, b)) continue;
        const conduits = ctx.crossingConduits(asset, peer);
        const unenforced = conduits.filter((conduit) => !ctx.isEnforced(conduit));
        if (conduits.length > 0 && unenforced.length === 0) continue;
        for (const conduit of unenforced) observedConduits.add(conduit.id);

        const name = unenforced.map((conduit) => conduit.name).join(", ");
        const boundary = name ? `Unenforced conduit ${name}` : "A network link with no declared conduit";
        const detail = `${boundary} joins ${zoneA} and ${zoneB} (${asset.id} and ${peer.id}).`;
        const severity = crossesTrust || safetyBoundary ? 4 : 3;
        add(asset, detail, severity);
        add(peer, detail, severity);
      }
    }

    for (const conduit of ctx.twin.conduits) {
      if (conduit.from === conduit.to || observedConduits.has(conduit.id) || ctx.isEnforced(conduit)) continue;
      const a = zones.get(conduit.from);
      const b = zones.get(conduit.to);
      if (!a || !b) continue;
      const crossesTrust = differentTrust(a, b);
      const safetyBoundary = crossesSafety(a, b);
      if (!crossesTrust && !safetyBoundary && !differentCriticality(a, b)) continue;

      const detail = `Declared conduit ${conduit.name} joins ${conduit.from} and ${conduit.to} without verified enforcement.`;
      const severity = crossesTrust || safetyBoundary ? 4 : 3;
      for (const zone of [a, b]) {
        const endpoint = zone.assets.find((asset) => asset.network.conduit === conduit.id) ?? zone.assets[0];
        add(endpoint, detail, severity);
      }
    }

    const findings: RuleEvidence[] = [];
    for (const [assetId, { details, severity }] of evidence) {
      findings.push({
        assetId,
        severity,
        detail: [...details].join(" "),
        fix: "Remove the flat link or enforce a conduit that permits only approved flows between the zones.",
        techniqueId: "T0886",
      });
    }
    return findings;
  },
} satisfies Rule;
