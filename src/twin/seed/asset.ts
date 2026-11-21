/** Shared constructors for the fictional plant inventory and nominal telemetry. */
import type { AreaId, Asset, CyberProfile, NetworkPresence, PhysicalPresence, TelemetryPoint } from "../types";

type AssetSeed = Pick<Asset, "id" | "name" | "description" | "process" | "specs" | "criticality" | "safetyCritical" | "cyber">
  & Pick<PhysicalPresence, "kind" | "scale">
  & Partial<Pick<PhysicalPresence, "rotation" | "connections">>
  & Partial<Omit<NetworkPresence, "area">>
  & { at: [x: number, y: number] };

export function makeAsset(area: AreaId, zone: string, seed: AssetSeed): Asset {
  const {
    at: [x, y], kind, scale, rotation = 0, connections = [],
    level = 0, conduit = null, ip, protocols, ...details
  } = seed;

  return {
    ...details,
    physical: { area, x, y, rotation, kind, scale, connections },
    network: { area: zone, level, conduit, ip, protocols },
    origin: "seed",
    status: "ok",
  };
}

export function wired(model: string, firmware: string, options?: Partial<CyberProfile>): CyberProfile {
  return {
    vendor: "Fictional plant inventory",
    model,
    firmware,
    radios: [],
    ports: ["RJ45"],
    removableStorage: false,
    cloudConnected: false,
    defaultCredentials: false,
    remoteAccess: false,
    managed: true,
    ...options,
  };
}

export function point(tag: string, label: string, value: number, unit: string, lo: number, hi: number): TelemetryPoint {
  return { tag, label, value, unit, lo, hi };
}
