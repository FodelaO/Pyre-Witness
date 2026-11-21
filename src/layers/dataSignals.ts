/** Associates process units with field inputs and actuators using twin geometry and tags. */
import { distance } from "@/twin/geometry";
import type { Asset, EquipmentKind } from "@/twin/types";

export interface SignalTap {
  processId: string;
  deviceId: string;
  controllerId: string | null;
  role: "sensor" | "actuator";
}

const processKinds = new Set<EquipmentKind>([
  "vertical_tank", "bullet_tank", "agitated_tank", "pump", "valve", "ro_skid", "uv_reactor",
  "carbo_cooler", "heat_exchanger", "rotary_filler", "conveyor", "labeler", "palletizer",
  "chiller_compressor", "condenser",
]);

const levelKinds = new Set<EquipmentKind>(["vertical_tank", "bullet_tank", "agitated_tank", "rotary_filler"]);
const actuatorKinds = new Set<EquipmentKind>(["pump", "valve", "chiller_compressor"]);

export function isProcessAsset(asset: Asset): boolean {
  return processKinds.has(asset.physical.kind)
    || (asset.physical.kind === "generic_device" && asset.origin === "seed" && Boolean(asset.process));
}

function suffix(id: string): string | undefined {
  return id.match(/-(\d+)$/)?.[1];
}

function assetReferenced(description: string, id: string): boolean {
  return description.toUpperCase().split(/[^A-Z0-9_-]+/).includes(id.toUpperCase());
}

function pipeLinked(a: Asset, b: Asset): boolean {
  const leadsTo = (from: Asset, to: Asset) => from.physical.connections.some(
    (link) => link.to === to.id && link.medium !== "network" && link.medium !== "power",
  );
  return leadsTo(a, b) || leadsTo(b, a);
}

function affinity(device: Asset, host: Asset): number {
  const measuredMedium = device.process?.medium;
  const positionProof = device.id.startsWith("ZS");
  const level = device.id.startsWith("LT-");
  let score = -distance(device.physical, host.physical);
  if (assetReferenced(device.description ?? "", host.id)) score += 500;
  if (host.process?.telemetry?.some(({ tag }) => tag === device.id)) score += 375;
  if (pipeLinked(device, host)) score += 230;
  if (suffix(device.id) && suffix(device.id) === suffix(host.id)) score += 55;
  if (measuredMedium && host.process?.medium === measuredMedium) score += 30;
  if (positionProof && host.physical.kind === "valve") score += 130;
  if (level && levelKinds.has(host.physical.kind)) score += 65;
  if (device.physical.kind === "instrument") {
    const measured = `${device.name} ${device.description ?? ""} ${device.process?.telemetry?.map(({ label }) => label).join(" ") ?? ""}`.toLowerCase();
    const hostTag = host.id.split("-")[0].toLowerCase();
    const hostName = host.name.toLowerCase();
    if (hostTag.length >= 2 && measured.split(/[^a-z0-9]+/).includes(hostTag)) score += 145;
    if (host.physical.kind === "ro_skid" && /\bmembrane|\bpermeate/i.test(measured)) score += 115;
    if (host.physical.kind === "carbo_cooler" && /saturator|carbonator|dissolved co/i.test(measured)) score += 115;
    if (hostName.includes("dissolver") && /dissolv|dissolution/i.test(measured)) score += 115;
    if (hostName.includes("blend tank") && /blend density|blend tank/i.test(measured)) score += 115;
    if (hostName.includes("vaporizer") && /vaporizer/i.test(measured)) score += 115;
    if (levelKinds.has(host.physical.kind) && /finished syrup density/i.test(measured)) score += 100;
  }
  return score;
}

export function controllerFor(asset: Asset, controllers: readonly Asset[]): Asset | undefined {
  let closest: Asset | undefined;
  let minimum = Infinity;
  for (const controller of controllers) {
    if (controller.network.area !== asset.network.area) continue;
    const spacing = distance(controller.physical, asset.physical);
    if (spacing < minimum || (spacing === minimum && closest && controller.id < closest.id)) {
      closest = controller;
      minimum = spacing;
    }
  }
  return closest;
}

export function deriveSignalTaps(assets: readonly Asset[], controllers: readonly Asset[]): SignalTap[] {
  const process = assets.filter(isProcessAsset);
  return assets.flatMap((device) => {
    const kind = device.physical.kind;
    const role = kind === "instrument" ? "sensor" : actuatorKinds.has(kind) ? "actuator" : null;
    if (!role) return [];
    if (device.process?.telemetry?.some(({ label }) => /^ambient\b/i.test(label))) return [];
    let nearest: Asset | undefined;
    let highest = -Infinity;
    for (const host of process) {
      if (host.id === device.id || host.physical.area !== device.physical.area) continue;
      if (role === "actuator" && !pipeLinked(device, host)) continue;
      const score = affinity(device, host);
      if (score > highest || (score === highest && nearest && host.id < nearest.id)) {
        nearest = host;
        highest = score;
      }
    }
    if (!nearest) return [];
    return [{
      processId: nearest.id, deviceId: device.id, role,
      controllerId: controllerFor(device, controllers)?.id ?? null,
    }];
  });
}
