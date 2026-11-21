/** Builds the Inspector's static graph of modeled entry points and asset reachability. */
import type { Asset, AttackStep, EntryPoint, RuleFinding, Severity } from "@/twin/types";
import { compareText, type RuleContext } from "./context";
import { hasPhysicalPortProtection } from "./protections";

interface NetworkEdge extends AttackStep {
  ruleIds: readonly string[];
}

export interface EntryEdge extends AttackStep {
  entry: EntryPoint;
  likelihood: Severity;
  ruleIds: readonly string[];
}

export interface AttackGraph {
  entries: readonly EntryEdge[];
  network: ReadonlyMap<string, readonly NetworkEdge[]>;
}

const crossesOtBoundary = (a: Asset, b: Asset) => (a.network.level <= 3) !== (b.network.level <= 3);
const hasInfrastructureRole = (asset: Asset) => asset.physical.kind === "network_switch" || asset.physical.kind === "wifi_ap";
const NO_RULES: readonly string[] = [];
const FLAT_RULE = ["ZONE-02"] as const;
const CREDENTIAL_RULE = ["CRED-01"] as const;
const FLAT_AND_CREDENTIAL_RULES = ["ZONE-02", "CRED-01"] as const;

function hasNetworkServicePort(asset: Asset): boolean {
  return asset.cyber?.ports.some((port) => /ethernet|rj[\s-]?45|sfp|rs[\s-]?(?:232|485)|serial|profinet|profibus|can\s*bus/i.test(port)) ?? false;
}

export function buildGraph(ctx: RuleContext, findings: readonly RuleFinding[]): AttackGraph {
  const entries: EntryEdge[] = [];
  const network = new Map<string, Map<string, NetworkEdge>>();
  const edgesByEntry = new Map<EntryPoint["id"], Map<string, Partial<Record<AttackStep["via"], EntryEdge>>>>();
  const rfFindings = new Set<string>();
  const flatBoundaryFindings = new Set<string>();
  const defaultCredentialFindings = new Set<string>();
  for (const finding of findings) {
    if (finding.ruleId === "RF-01") rfFindings.add(finding.assetId);
    if (finding.ruleId === "ZONE-02") flatBoundaryFindings.add(finding.assetId);
    if (finding.ruleId === "CRED-01") defaultCredentialFindings.add(finding.assetId);
  }

  function addEntry(entry: EntryPoint, asset: Asset, via: AttackStep["via"], techniqueId: string,
    note: string, likelihood: Severity, ruleId: string): void {
    const technique = ctx.technique(techniqueId);
    if (!technique) return;
    let assets = edgesByEntry.get(entry.id);
    if (!assets) {
      assets = new Map();
      edgesByEntry.set(entry.id, assets);
    }
    let mechanisms = assets.get(asset.id);
    if (!mechanisms) {
      mechanisms = {};
      assets.set(asset.id, mechanisms);
    }
    const existing = mechanisms[via];
    if (existing) {
      if (!existing.ruleIds.includes(ruleId)) existing.ruleIds = [...existing.ruleIds, ruleId];
      if (likelihood > existing.likelihood) {
        existing.likelihood = likelihood;
        existing.note = note;
        existing.technique = technique;
      }
      return;
    }
    const edge = { entry, from: entry.id, to: asset.id, via, technique, note, likelihood, ruleIds: [ruleId] };
    mechanisms[via] = edge;
    entries.push(edge);
  }

  const movementTechnique = ctx.technique("T0886");
  const credentialTechnique = ctx.technique("T1694.001");
  function addDirection(from: Asset, to: Asset, note: string, flat: boolean): void {
    let outgoing = network.get(from.id);
    if (outgoing?.has(to.id)) return;
    const defaultCredentials = defaultCredentialFindings.has(to.id);
    const technique = defaultCredentials ? credentialTechnique : movementTechnique;
    if (!technique) return;
    const ruleIds = defaultCredentials
      ? flat ? FLAT_AND_CREDENTIAL_RULES : CREDENTIAL_RULE
      : flat ? FLAT_RULE : NO_RULES;
    if (!outgoing) {
      outgoing = new Map();
      network.set(from.id, outgoing);
    }
    outgoing.set(to.id, { from: from.id, to: to.id, via: "network", technique, note, ruleIds });
  }

  function addNetworkPair(a: Asset, b: Asset, note: string, flat = false): void {
    if (a.id === b.id || ctx.hasDisabledLink(a.id, b.id)) return;
    const matchedFlatRule = flat && flatBoundaryFindings.has(a.id) && flatBoundaryFindings.has(b.id);
    addDirection(a, b, note, matchedFlatRule);
    addDirection(b, a, note, matchedFlatRule);
  }

  for (const [asset, peer] of ctx.networkPairs) {
    if (asset.network.area === peer.network.area) {
      addNetworkPair(asset, peer, "Active network link within the modeled zone.", crossesOtBoundary(asset, peer));
      continue;
    }
    const boundaries = ctx.crossingConduits(asset, peer);
    // The twin describes allowlists in prose. A physical cable through a policy
    // boundary alone provides no evidence that it permits this lateral route.
    if (boundaries.length && boundaries.every(ctx.isEnforced)) continue;
    addNetworkPair(asset, peer, "Active cross-zone link without a verified enforcing boundary.", true);
  }

  // Attach members with independent network configuration to an established local
  // network endpoint when the drawing omits their individual cable or association.
  const zoneMembers = new Map<string, readonly Asset[]>();
  for (const [zone, members] of ctx.zoneAssets) {
    if (!zone.trim()) continue;
    const configured = members.filter((asset) => {
      // A drawn but intentionally disabled local link takes precedence over
      // inferring an alternate attachment from network configuration alone.
      if (ctx.hasDeclaredLocalLink(asset) && !ctx.hasActiveLocalLink(asset)) return false;
      const conduit = asset.network.conduit && ctx.conduitById.get(asset.network.conduit);
      return ctx.isNetworked(asset) && (
        !!asset.network.ip || !!asset.network.protocols?.length
        || !!(conduit && (conduit.from === zone || conduit.to === zone))
        || !!network.get(asset.id)?.size
      );
    });
    configured.sort((a, b) => Number(ctx.hasActiveLocalLink(b)) - Number(ctx.hasActiveLocalLink(a))
      || Number(b.origin === "seed") - Number(a.origin === "seed")
      || Number(hasInfrastructureRole(b)) - Number(hasInfrastructureRole(a)) || compareText(a.id, b.id));
    zoneMembers.set(zone, configured);
    const hub = configured[0];
    if (!hub) continue;
    for (const member of configured) {
      if (member === hub || ctx.hasDeclaredLocalLink(member) || crossesOtBoundary(member, hub)) continue;
      addNetworkPair(member, hub, `Configured members of the same network zone (${zone}).`);
    }
    const configuredIds = new Set(configured.map((member) => member.id));
    for (const member of members) {
      if (configuredIds.has(member.id) || ctx.hasDeclaredLocalLink(member) || crossesOtBoundary(member, hub)) continue;
      if (rfFindings.has(member.id) && member.cyber?.radios.includes("wifi")) {
        addNetworkPair(member, hub, `Potential Wi-Fi association with the assigned ${zone} zone. Actual association is unverified.`);
      }
    }
  }

  for (const conduit of ctx.twin.conduits) {
    if (conduit.from === conduit.to || ctx.isEnforced(conduit)
      || ctx.hasDeclaredZoneLink(conduit.from, conduit.to)) continue;
    const from = zoneMembers.get(conduit.from);
    const to = zoneMembers.get(conduit.to);
    if (!from?.length || !to?.length) continue;
    const fromEndpoint = from.find((asset) => asset.network.conduit === conduit.id);
    const toEndpoint = to.find((asset) => asset.network.conduit === conduit.id);
    if (!fromEndpoint && !toEndpoint) continue;
    addNetworkPair(fromEndpoint ?? from[0], toEndpoint ?? to[0], `Unenforced modeled conduit: ${conduit.name}.`, true);
  }

  for (const finding of findings) {
    const asset = ctx.assetById.get(finding.assetId);
    if (!asset) continue;
    switch (finding.ruleId) {
      case "RF-01":
        for (const entry of ctx.rfEntries(asset)) {
          addEntry(entry, asset, "rf", "T0860", "Radio interface is within modeled reach of an untrusted location.", 4, finding.ruleId);
        }
        break;
      case "ZONE-01":
        if (asset.cyber?.remoteAccess) {
          for (const entry of ctx.entryPointsByKind.get("remote") ?? []) {
            addEntry(entry, asset, "remote", "T0822", "Documented remote access has no verified DMZ boundary.", 4, finding.ruleId);
          }
        }
        if (asset.cyber?.cloudConnected) {
          for (const entry of ctx.entryPointsByKind.get("internet") ?? []) {
            addEntry(entry, asset, "internet", "T0883", "Potential external device exposure. Cloud connectivity alone leaves inbound reachability unverified.", 2, finding.ruleId);
          }
        }
        break;
      case "USB-01":
        if (asset.physical.kind === "usb_drive" || hasPhysicalPortProtection(asset)) break;
        for (const entry of ctx.physicalEntries(asset)) {
          addEntry(entry, asset, "usb", "T0847", "A documented removable-media interface is locally accessible in the modeled area.", finding.severity, finding.ruleId);
        }
        break;
      case "PHYS-01":
        if (hasPhysicalPortProtection(asset) || !hasNetworkServicePort(asset)) break;
        for (const entry of ctx.visitorEntries(asset)) {
          addEntry(entry, asset, "physical", "T0864", "An exposed data port admits a potential transient connection from a public area.", 3, finding.ruleId);
        }
        break;
      case "TRANS-01":
        for (const entry of ctx.physicalEntries(asset)) {
          addEntry(entry, asset, "physical", "T0864", "An unmanaged portable device is attached below site operations.", 3, finding.ruleId);
        }
        break;
    }
  }

  const adjacency = new Map<string, readonly NetworkEdge[]>();
  for (const [assetId, edges] of network) {
    adjacency.set(assetId, [...edges.values()].sort((a, b) => compareText(a.to, b.to)));
  }
  return {
    entries: entries.sort((a, b) => compareText(a.from, b.from) || compareText(a.to, b.to) || compareText(a.via, b.via)),
    network: adjacency,
  };
}
