/** Builds the Inspector's static graph of modeled entry points and asset reachability. */
import type { Asset, AttackStep, EntryPoint, RuleFinding, Severity } from "@/twin/types";
import { compareText, type RuleContext } from "./context";

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

const pairKey = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a]);
const crossesOtBoundary = (a: Asset, b: Asset) => (a.network.level <= 3) !== (b.network.level <= 3);

function localPhysicalEntries(ctx: RuleContext, asset: Asset): EntryPoint[] {
  const visitorEntries = ctx.visitorEntries(asset);
  // An internal origin can only seed exposure in its own modeled physical area.
  return [...visitorEntries, ...ctx.twin.entryPoints.filter((entry) =>
    entry.kind === "physical"
    && entry.id !== "visitor"
    && entry.area === asset.physical.area
    && !visitorEntries.includes(entry),
  )];
}

function hasNetworkServicePort(asset: Asset): boolean {
  return asset.cyber?.ports.some((port) => /ethernet|rj[\s-]?45|sfp|rs[\s-]?(?:232|485)|serial|profinet|profibus|can\s*bus/i.test(port)) ?? false;
}

export function buildGraph(ctx: RuleContext, findings: readonly RuleFinding[]): AttackGraph {
  const entries: EntryEdge[] = [];
  const network = new Map<string, Map<string, NetworkEdge>>();
  const disabledLinks = new Set<string>();
  const explicitZonePairs = new Set<string>();
  const assetsWithLocalLinks = new Set<string>();
  const assetsWithActiveLocalLinks = new Set<string>();
  const entryByKey = new Map<string, EntryEdge>();
  const rfFindings = new Set<string>();
  const flatBoundaryFindings = new Set<string>();
  const defaultCredentialFindings = new Set<string>();
  for (const finding of findings) {
    if (finding.ruleId === "RF-01") rfFindings.add(finding.assetId);
    if (finding.ruleId === "ZONE-02") flatBoundaryFindings.add(finding.assetId);
    if (finding.ruleId === "CRED-01") defaultCredentialFindings.add(finding.assetId);
  }

  for (const asset of ctx.twin.assets) {
    network.set(asset.id, new Map());
    for (const connection of asset.physical.connections) {
      if (connection.medium !== "network") continue;
      if (connection.active === false) disabledLinks.add(pairKey(asset.id, connection.to));
      const peer = ctx.assetById.get(connection.to);
      if (!peer || peer.id === asset.id) continue;
      if (asset.network.area === peer.network.area) {
        assetsWithLocalLinks.add(asset.id);
        assetsWithLocalLinks.add(peer.id);
      } else {
        explicitZonePairs.add(pairKey(asset.network.area, peer.network.area));
      }
    }
  }

  function addEntry(entry: EntryPoint, asset: Asset, via: AttackStep["via"], techniqueId: string,
    note: string, likelihood: Severity, ruleId: string): void {
    const technique = ctx.technique(techniqueId);
    const key = JSON.stringify([entry.id, asset.id, via]);
    if (!technique) return;
    const existing = entryByKey.get(key);
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
    entryByKey.set(key, edge);
    entries.push(edge);
  }

  function addNetworkPair(a: Asset, b: Asset, note: string, flat = false): void {
    if (a.id === b.id || disabledLinks.has(pairKey(a.id, b.id))) return;
    const addDirection = (from: Asset, to: Asset) => {
      const outgoing = network.get(from.id)!;
      if (outgoing.has(to.id)) return;
      const defaultCredentials = defaultCredentialFindings.has(to.id);
      const technique = ctx.technique(defaultCredentials ? "T1694.001" : "T0886");
      if (!technique) return;
      const ruleIds = [
        ...(flat && flatBoundaryFindings.has(a.id) && flatBoundaryFindings.has(b.id) ? ["ZONE-02"] : []),
        ...(defaultCredentials ? ["CRED-01"] : []),
      ];
      outgoing.set(to.id, { from: from.id, to: to.id, via: "network", technique, note, ruleIds });
    };
    addDirection(a, b);
    addDirection(b, a);
  }

  for (const asset of ctx.twin.assets) {
    for (const peer of ctx.links(asset)) {
      // The physical network links are undirected even when drawn by one endpoint.
      if (network.get(asset.id)?.has(peer.id) || disabledLinks.has(pairKey(asset.id, peer.id))) continue;
      if (asset.network.area === peer.network.area) {
        assetsWithActiveLocalLinks.add(asset.id);
        assetsWithActiveLocalLinks.add(peer.id);
        addNetworkPair(asset, peer, "Active network link within the modeled zone.", crossesOtBoundary(asset, peer));
        continue;
      }
      const boundaries = ctx.crossingConduits(asset, peer);
      // The twin describes allowlists in prose. A physical cable through a policy
      // boundary alone provides no evidence that it permits this lateral route.
      if (boundaries.length && boundaries.every((boundary) => ctx.isEnforced(boundary))) continue;
      addNetworkPair(asset, peer, "Active cross-zone link without a verified enforcing boundary.", true);
    }
  }

  // Attach members with independent network configuration to an established local
  // network endpoint when the drawing omits their individual cable or association.
  const zoneMembers = new Map<string, readonly Asset[]>();
  for (const [zone, members] of ctx.zoneAssets) {
    if (!zone.trim()) continue;
    const configured = members.filter((asset) => {
      // A drawn but intentionally disabled local link takes precedence over
      // inferring an alternate attachment from network configuration alone.
      if (assetsWithLocalLinks.has(asset.id) && !assetsWithActiveLocalLinks.has(asset.id)) return false;
      const conduit = asset.network.conduit && ctx.conduitById.get(asset.network.conduit);
      return ctx.isNetworked(asset) && (
        !!asset.network.ip || !!asset.network.protocols?.length
        || !!(conduit && (conduit.from === zone || conduit.to === zone))
        || !!network.get(asset.id)?.size
      );
    });
    const hasInfrastructureRole = (asset: Asset) => asset.physical.kind === "network_switch" || asset.physical.kind === "wifi_ap";
    configured.sort((a, b) => Number(assetsWithActiveLocalLinks.has(b.id)) - Number(assetsWithActiveLocalLinks.has(a.id))
      || Number(b.origin === "seed") - Number(a.origin === "seed")
      || Number(hasInfrastructureRole(b)) - Number(hasInfrastructureRole(a)) || compareText(a.id, b.id));
    zoneMembers.set(zone, configured);
    const hub = configured[0];
    if (!hub) continue;
    for (const member of configured) {
      if (member === hub || assetsWithLocalLinks.has(member.id) || crossesOtBoundary(member, hub)) continue;
      addNetworkPair(member, hub, `Configured members of the same network zone (${zone}).`);
    }
    const configuredIds = new Set(configured.map((member) => member.id));
    for (const member of members) {
      if (configuredIds.has(member.id) || assetsWithLocalLinks.has(member.id) || crossesOtBoundary(member, hub)) continue;
      if (rfFindings.has(member.id) && member.cyber?.radios.includes("wifi")) {
        addNetworkPair(member, hub, `Potential Wi-Fi association with the assigned ${zone} zone. Actual association is unverified.`);
      }
    }
  }

  for (const conduit of ctx.twin.conduits) {
    if (conduit.from === conduit.to || ctx.isEnforced(conduit)
      || explicitZonePairs.has(pairKey(conduit.from, conduit.to))) continue;
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
        for (const entry of ctx.twin.entryPoints) {
          if (entry.kind === "remote" && asset.cyber?.remoteAccess) {
            addEntry(entry, asset, "remote", "T0822", "Documented remote access has no verified DMZ boundary.", 4, finding.ruleId);
          }
          if (entry.kind === "internet" && asset.cyber?.cloudConnected) {
            addEntry(entry, asset, "internet", "T0883", "Potential external device exposure. Cloud connectivity alone leaves inbound reachability unverified.", 2, finding.ruleId);
          }
        }
        break;
      case "USB-01":
        if (asset.physical.kind === "usb_drive") break;
        for (const entry of localPhysicalEntries(ctx, asset)) {
          addEntry(entry, asset, "usb", "T0847", "A documented removable-media interface is locally accessible in the modeled area.", finding.severity, finding.ruleId);
        }
        break;
      case "PHYS-01":
        if (!hasNetworkServicePort(asset)) break;
        for (const entry of ctx.visitorEntries(asset)) {
          addEntry(entry, asset, "physical", "T0864", "An exposed data port admits a potential transient connection from a public area.", 3, finding.ruleId);
        }
        break;
      case "TRANS-01":
        for (const entry of localPhysicalEntries(ctx, asset)) {
          addEntry(entry, asset, "physical", "T0864", "An unmanaged portable device is attached below site operations.", 3, finding.ruleId);
        }
        break;
    }
  }

  return {
    entries: entries.sort((a, b) => compareText(a.from, b.from) || compareText(a.to, b.to) || compareText(a.via, b.via)),
    network: new Map(Array.from(network, ([id, edges]) => [id, [...edges.values()].sort((a, b) => compareText(a.to, b.to))])),
  };
}
