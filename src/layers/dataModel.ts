/** Memoizes the material/data lens topology and provides ordered hover chains. */
import type { Asset, Twin } from "@/twin/types";
import { buildEvidence } from "./dataEvidence";
import { buildFlows } from "./dataFlows";
import { deriveSignalTaps } from "./dataSignals";
import { buildTopology, buildZoneHulls } from "./dataTopology";

export type { SoftwareIdentity, VulnerabilitySummary } from "./dataEvidence";
export type { DataFlow, DataFlowKind } from "./dataFlows";
export type { SignalTap } from "./dataSignals";
export type { ConduitCrossing, NetworkLink, ZoneHull } from "./dataTopology";

function deriveDataModel(twin: Twin) {
  const topology = buildTopology(twin);
  const controllers = twin.assets.filter((asset) => asset.physical.kind === "plc_cabinet");
  const signalTaps = deriveSignalTaps(twin.assets, controllers);
  const dataFlows = buildFlows(twin, topology, controllers, signalTaps);
  const zoneHulls = buildZoneHulls(twin.assets);
  const controllerIds = new Set(controllers.map(({ id }) => id));
  const chains = new Map<string, string[]>();

  function chainOf(assetId: string): string[] {
    const known = chains.get(assetId);
    if (known) return known;
    if (!topology.assets.has(assetId) && !twin.entryPoints.some(({ id }) => id === assetId)) return [];
    const ids = new Set<string>([assetId]);
    const upstream = new Set<string>();
    const append = (route: readonly string[]) => route.forEach((id) => ids.add(id));

    for (const { processId, deviceId, controllerId } of signalTaps) {
      if (assetId !== processId && assetId !== deviceId && assetId !== controllerId) continue;
      ids.add(processId);
      ids.add(deviceId);
      if (controllerId) upstream.add(controllerId);
    }
    if (controllerIds.has(assetId)) upstream.add(assetId);
    for (const flow of dataFlows) {
      if (flow.kind !== "signal" && flow.kind !== "control") continue;
      const controller = controllerIds.has(flow.to) ? flow.to : controllerIds.has(flow.from) ? flow.from : null;
      if (!controller) continue;
      const local = flow.from === controller ? flow.to : flow.from;
      if (ids.has(local) || (assetId === controller && topology.assets.get(local)?.physical.kind !== "hmi")) {
        append(flow.from === controller ? [...flow.routeIds].reverse() : flow.routeIds);
        upstream.add(controller);
      }
    }

    const seen = new Set<string>();
    const next = (node: string) => {
      if (seen.has(node)) return;
      seen.add(node);
      for (const flow of dataFlows) {
        if (flow.from !== node || (flow.kind !== "supervisory" && flow.kind !== "historian" && flow.kind !== "enterprise")) continue;
        append(flow.routeIds);
        next(flow.to);
      }
    };
    for (const controller of upstream) {
      ids.add(controller);
      next(controller);
    }
    next(assetId);

    const chain = [...ids];
    chains.set(assetId, chain);
    return chain;
  }

  return {
    signalTaps,
    dataFlows,
    zoneHulls,
    networkLinks: topology.links,
    assets: twin.assets as readonly Asset[],
    entryPoints: twin.entryPoints as readonly Twin["entryPoints"][number][],
    canvas: twin.plant.canvas,
    chainOf,
    ...buildEvidence(twin),
  };
}

export type DataModel = ReturnType<typeof deriveDataModel>;
const models = new WeakMap<Twin, DataModel>();
let previous: { twin: Twin; model: DataModel } | undefined;

function sameLensAsset(a: Asset, b: Asset): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.name !== b.name || a.description !== b.description || a.origin !== b.origin
    || a.physical !== b.physical || a.network !== b.network || a.cyber !== b.cyber
    || (a.status === "offline") !== (b.status === "offline")
    || Boolean(a.process) !== Boolean(b.process) || a.process?.medium !== b.process?.medium) return false;
  const first = a.process?.telemetry;
  const second = b.process?.telemetry;
  return first === second || Boolean(first && second && first.length === second.length
    && first.every(({ tag, label }, index) => tag === second[index].tag && label === second[index].label));
}

function sameLensInputs(a: Twin, b: Twin): boolean {
  return a.plant === b.plant && a.conduits === b.conduits && a.entryPoints === b.entryPoints
    && a.assets.length === b.assets.length && a.assets.every((asset, index) => sameLensAsset(asset, b.assets[index]));
}

export function getDataModel(twin: Twin): DataModel {
  const cached = models.get(twin);
  if (cached) return cached;
  // Process readings change every second. Preserve drawing identity while topology is stable.
  const model = previous && sameLensInputs(twin, previous.twin) ? previous.model : deriveDataModel(twin);
  models.set(twin, model);
  previous = { twin, model };
  return model;
}
