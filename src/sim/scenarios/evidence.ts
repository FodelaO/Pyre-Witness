/** Reuses Inspector evidence to screen defensive controls in the fictional tabletop. */
import { createContext } from "@/rules/context";
import { buildGraph, type AttackGraph } from "@/rules/graph";
import { placementFindings } from "@/rules/registry";
import type { AreaId, Asset, Mitigation, MitigationEffect, Twin } from "@/twin/types";
import type { SimEffects } from "../types";

export const PHYSICAL_INGRESS_PROTECTIONS = ["port-lock", "locked-cabinet"] as const;

export function hasProtection(asset: Asset | undefined, protection: string): boolean {
  return asset?.protections?.includes(protection) ?? false;
}

export function editAsset(twin: Twin, id: string, edit: (asset: Asset) => Asset): Twin {
  return { ...twin, assets: twin.assets.map((asset) => asset.id === id ? edit(asset) : asset) };
}

export function withoutProtection(twin: Twin, id: string, protection: string): Twin {
  return editAsset(twin, id, (asset) => ({
    ...asset,
    protections: (asset.protections ?? []).filter((installed) => installed !== protection),
  }));
}

export function withoutBoundary(twin: Twin, id: string): Twin {
  return { ...twin, conduits: twin.conduits.map((conduit) =>
    conduit.id === id ? { ...conduit, enforcedBy: null } : conduit) };
}

export function reportArea(twin: Twin, id: AreaId): SimEffects {
  const area = twin.areas.find((candidate) => candidate.id === id);
  return area ? { areas: { [id]: area.status === "alarm" ? "alarm" : "attention" } } : {};
}

export function inspect(twin: Twin) {
  const context = createContext(twin);
  const findings = placementFindings(context);
  return { context, graph: buildGraph(context, findings), findings };
}

/** Undirected twin reachability for availability and segmentation checks. */
export function reachFrom(graph: AttackGraph, id: string) {
  const reached = new Map<string, string[]>([[id, [id]]]);
  for (const [current, route] of reached) {
    for (const edge of graph.network.get(current) ?? []) {
      if (!reached.has(edge.to)) reached.set(edge.to, [...route, edge.to]);
    }
  }
  return reached;
}

export function exposedControl(graph: AttackGraph, target: string) {
  for (const edge of graph.entries) {
    const route = reachFrom(graph, edge.to).get(target);
    if (route) return { entry: edge.from, endpoint: edge.to, assetId: target };
  }
}

export function available(asset: Asset | undefined): asset is Asset {
  return !!asset && asset.status !== "offline" && asset.status !== "alarm";
}

export function reading(asset: Asset | undefined, tag: string, fallback: number): number {
  return asset?.process?.telemetry?.find((point) => point.tag === tag)?.value ?? fallback;
}

export function proposal(
  id: string,
  title: string,
  kind: Mitigation["kind"],
  description: string,
  targets: string[],
  effects: MitigationEffect[],
): Mitigation {
  return { id, title, kind, description, targets, effects, status: "proposed", proposedBy: "inspector" };
}

export function unenrolledRemoteEndpoints(twin: Twin, targets: string[]): Asset[] {
  const { context, graph } = inspect(twin);
  const ids = new Set(graph.entries.filter((edge) =>
    (edge.via === "remote" || edge.via === "internet") &&
    targets.some((target) => reachFrom(graph, edge.to).has(target)),
  ).map((edge) => edge.to));
  return [...ids].flatMap((id) => {
    const asset = context.assetById.get(id);
    return asset ? [asset] : [];
  });
}

export function removeRemoteAccess(id: string, assets: Asset[]): Mitigation[] {
  if (!assets.length) return [];
  return [proposal(
    id,
    "Remove direct remote access",
    "software",
    "Disable unbrokered remote and cloud access on the modeled endpoints.",
    assets.map((asset) => asset.id),
    assets.map((asset) => ({
      type: "patch_cyber",
      assetId: asset.id,
      patch: { remoteAccess: false, cloudConnected: false },
    })),
  )];
}

export function enforceBoundary(
  twin: Twin, id: string, conduitId: string, enforcer: string,
): Mitigation[] {
  const context = createContext(twin);
  const conduit = context.conduitById.get(conduitId);
  const kind = context.assetById.get(enforcer)?.physical.kind;
  if (!conduit || context.isEnforced(conduit) || (kind !== "firewall" && kind !== "network_switch")) return [];
  return [proposal(
    id, `Enforce ${conduitId}`, "software",
    `Place the modeled boundary under ${enforcer} policy with default deny.`,
    [conduitId, enforcer],
    [{ type: "enforce_conduit", conduitId, enforcedBy: enforcer, allows: [] }],
  )];
}
