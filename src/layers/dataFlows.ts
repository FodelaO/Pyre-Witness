/** Traces nominal field and software traffic through the current cable drawing. */
import { type Point } from "@/twin/geometry";
import type { Asset, EntryPoint, Twin } from "@/twin/types";
import { controllerFor, isProcessAsset, type SignalTap } from "./dataSignals";
import { pointOf, type CableTopology, type ConduitCrossing } from "./dataTopology";

export type DataFlowKind = "signal" | "control" | "supervisory" | "historian" | "enterprise" | "cloud" | "remote";

export interface DataFlow {
  id: string;
  kind: DataFlowKind;
  protocol: string;
  from: string;
  to: string;
  route: Point[];
  routeIds: string[];
  medium: "network" | "hardwired" | "external";
  crossings: ConduitCrossing[];
}

function protocolBetween(a: Asset, b: Asset, policy: readonly string[] = []): string {
  const first = a.network.protocols ?? [];
  const second = b.network.protocols ?? [];
  const common = first.filter((entry) => second.some((value) => value.toLowerCase() === entry.toLowerCase()));
  return common.find((entry) => policy.some((allowed) => allowed.toLowerCase().includes(entry.toLowerCase())))
    ?? common[0] ?? first[0] ?? second[0] ?? "Ethernet";
}

function endpoint(twin: Twin, zone: string, name: RegExp): Asset | undefined {
  return twin.assets.find((asset) => asset.network.area === zone && name.test(`${asset.name} ${asset.id}`));
}

function externalRoute(twin: Twin, entry: EntryPoint, device: Asset): Point[] {
  const { building } = twin.plant;
  const at = pointOf(device.physical);
  if (entry.y >= building.y || at.y < building.y + 180) return [pointOf(entry), at];
  const side = at.x < building.x + building.w / 2 ? building.x - 10 : building.x + building.w + 10;
  return [pointOf(entry), { x: side, y: entry.y }, { x: side, y: at.y }, at];
}

export function buildFlows(twin: Twin, topology: CableTopology, controllers: readonly Asset[], taps: readonly SignalTap[]) {
  const flows: DataFlow[] = [];
  const ids = new Set<string>();
  const { assets, neighbors, shortestPath, trace, crossingsOf } = topology;
  const conduits = new Map(twin.conduits.map((conduit) => [conduit.id, conduit]));

  function append(flow: Omit<DataFlow, "id">) {
    const id = `${flow.kind}:${flow.from}:${flow.to}:${flow.protocol}`;
    if (ids.has(id)) return;
    ids.add(id);
    flows.push({ ...flow, id });
  }

  function network(kind: DataFlowKind, from?: Asset, to?: Asset, protocol?: string) {
    if (!from || !to || from.id === to.id) return;
    const routeIds = shortestPath(from.id, to.id);
    if (routeIds.length < 2) return;
    const geometry = trace(routeIds);
    const policy = geometry.crossings.flatMap(({ conduitId }) => conduits.get(conduitId)?.allows ?? []);
    append({
      kind, from: from.id, to: to.id, protocol: protocol ?? protocolBetween(from, to, policy),
      routeIds, medium: "network", ...geometry,
    });
  }

  function hardwired(from: Asset, to: Asset) {
    if (from.status === "offline" || to.status === "offline") return;
    append({
      kind: "signal", from: from.id, to: to.id, protocol: "Hardwired I/O",
      routeIds: [from.id, to.id], route: [pointOf(from.physical), pointOf(to.physical)],
      medium: "hardwired", crossings: [],
    });
  }

  function external(kind: "cloud" | "remote", entry: EntryPoint, device: Asset, protocol: string, outbound = false, crossesWan = false) {
    if (device.status === "offline") return;
    const route = externalRoute(twin, entry, device);
    const bench = route[route.length - 2];
    const terminal = route[route.length - 1];
    const length = Math.hypot(terminal.x - bench.x, terminal.y - bench.y);
    const fraction = length ? Math.min(0.5, 35 / length) : 0;
    const at = { x: terminal.x + (bench.x - terminal.x) * fraction, y: terminal.y + (bench.y - terminal.y) * fraction };
    const from = outbound ? device.id : entry.id;
    const to = outbound ? entry.id : device.id;
    append({
      kind, protocol, from, to, route: outbound ? route.reverse() : route, routeIds: [from, to], medium: "external",
      crossings: crossesWan ? crossingsOf(device.network.area, "Internet / Cloud", at) : [],
    });
  }

  const actuatorIds = new Set(taps.filter(({ role }) => role === "actuator").map(({ deviceId }) => deviceId));
  const explicitNetwork = new Set(topology.links.flatMap(({ from, to }) => [from, to]));
  for (const field of twin.assets) {
    const sensor = field.physical.kind === "instrument";
    const process = isProcessAsset(field);
    if (!sensor && !process) continue;
    const plc = controllerFor(field, controllers);
    if (!plc) continue;
    const actuator = actuatorIds.has(field.id);
    const [from, to] = actuator ? [plc, field] : [field, plc];
    if (explicitNetwork.has(field.id)) {
      network(sensor ? "signal" : "control", from, to, sensor ? undefined : protocolBetween(field, plc));
    } else if (sensor || actuator) {
      hardwired(from, to);
    }
  }

  const scada = endpoint(twin, "Site operations", /\bscada\b/i);
  const historian = endpoint(twin, "Site operations", /historian|\bhist-/i);
  const replica = endpoint(twin, "OT DMZ", /replica|historian|\bhist-/i);
  const enterprise = endpoint(twin, "Enterprise", /\berp\b/i);
  const jump = endpoint(twin, "OT DMZ", /jump|\bjmp-/i);
  const engineering = endpoint(twin, "Site operations", /engineering workstation|\beng-/i);

  for (const plc of controllers) {
    const hmis = twin.assets.filter((asset) => asset.physical.kind === "hmi" && asset.network.area === plc.network.area);
    for (const hmi of hmis) {
      network("control", plc, hmi);
      network("control", hmi, plc);
    }
    network("supervisory", plc, scada ?? historian);
  }
  network("historian", scada, historian);
  network("historian", historian, replica);
  network("enterprise", replica, enterprise);

  const internet = twin.entryPoints.find(({ kind }) => kind === "internet");
  const vendor = twin.entryPoints.find(({ kind }) => kind === "remote");
  const edgeConduit = twin.conduits.find(({ from, to }) =>
    (from === "Internet / Cloud" && to === "Enterprise") || (from === "Enterprise" && to === "Internet / Cloud"));
  const edge = edgeConduit?.enforcedBy ? assets.get(edgeConduit.enforcedBy) : undefined;
  if (edge?.physical.kind === "firewall") {
    if (internet) {
      network("cloud", enterprise, edge, "HTTPS");
      external("cloud", internet, edge, "HTTPS", true, true);
    }
    if (vendor && edge.cyber?.remoteAccess) {
      external("remote", vendor, edge, edge.network.protocols?.find((protocol) => /^IKE/i.test(protocol)) ?? "VPN", false, true);
      network("remote", edge, jump, "HTTPS");
      if (jump?.cyber?.remoteAccess && engineering?.cyber?.remoteAccess) network("remote", jump, engineering, "RDP");
    }
  }

  for (const device of twin.assets) {
    const cellular = device.cyber?.radios.includes("cellular");
    if (!cellular) continue;
    if (internet && device.cyber?.cloudConnected) external("cloud", internet, device, "LTE", true);
    if (!vendor || !device.cyber?.remoteAccess) continue;
    external("remote", vendor, device, "LTE");
    for (const peer of neighbors.get(device.id) ?? []) {
      const asset = assets.get(peer);
      if (asset && isProcessAsset(asset)) network("remote", device, asset, "Ethernet");
    }
  }

  return flows;
}
