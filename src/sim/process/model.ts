/** The nominal Line 3 design basis and deterministic process state. */
import type { Asset, Medium, Twin } from "@/twin/types";

export const NOMINAL = {
  fillerM3h: 18,
  bottleL: 0.5,
  roFeedM3h: 24,
  roRecovery: 0.75,
  syrupWaterKgh: 1676.848,
  sugarKgh: 1961.952,
  concentrateKgh: 50,
  syrupKgh: 3688.8,
  blendWaterKgh: 15103.2,
  blendKgh: 18792,
  rinseKgh: 1220,
  co2Kgh: 135,
  co2Volumes: 3.7,
  glycolM3h: 78,
} as const;

const TANKS = {
  "TK-101": 1,
  "TK-102": 1,
  "TK-201": 1.252,
  "TK-202": 1.28,
  "TK-203": 1.252,
  "BL-301": 1.044,
  "TK-401": 1,
} as const;

export type TankId = keyof typeof TANKS;
export type TankMasses = Record<TankId, number>;
export const TANK_IDS = Object.keys(TANKS) as TankId[];

export interface ProcessState {
  elapsedSeconds: number;
  rawWaterRefilling: boolean;
  concentrateRefilling: boolean;
}

export function createProcessState(twin: Twin): ProcessState {
  const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
  return {
    elapsedSeconds: 0,
    rawWaterRefilling: (assets.get("TK-101")?.process?.levelPct ?? 100) <= 71,
    concentrateRefilling: (assets.get("TK-202")?.process?.levelPct ?? 100) <= 51.7,
  };
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function tankCapacityKg(assets: ReadonlyMap<string, Asset>, id: TankId): number {
  const capacityL = assets.get(id)?.process?.capacityL ?? 0;
  return Number.isFinite(capacityL) && capacityL > 0 ? capacityL * TANKS[id] : 0;
}

export function tankMasses(assets: ReadonlyMap<string, Asset>): TankMasses {
  return Object.fromEntries(TANK_IDS.map((id) => {
    const reading = assets.get(id)?.process?.levelPct ?? 0;
    const level = Number.isFinite(reading) ? clamp(reading, 0, 100) : 0;
    return [id, tankCapacityKg(assets, id) * level / 100];
  })) as TankMasses;
}

export function online(assets: ReadonlyMap<string, Asset>, id: string): boolean {
  const asset = assets.get(id);
  return asset !== undefined && asset.status !== "offline" && asset.process?.running !== false;
}

export function connected(assets: ReadonlyMap<string, Asset>, from: string, to: string, medium: Medium): boolean {
  return online(assets, from) && online(assets, to)
    && (assets.get(from)?.physical.connections.some((pipe) =>
      pipe.to === to && pipe.medium === medium && pipe.active !== false,
    ) ?? false);
}

export function reading(assets: ReadonlyMap<string, Asset>, id: string, tag: string): number | undefined {
  return assets.get(id)?.process?.telemetry?.find((point) => point.tag === tag)?.value;
}

function seededSample(tag: string, index: number): number {
  let hash = 0x6083a12d ^ index;
  for (const character of tag) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff * 2 - 1;
}

/** Smoothly interpolated seeded samples avoid step changes in displayed instruments. */
export function noise(tag: string, seconds: number, cadence = 12): number {
  const phase = seconds / cadence;
  const index = Math.floor(phase);
  const fraction = phase - index;
  const weight = fraction * fraction * (3 - 2 * fraction);
  return seededSample(tag, index) * (1 - weight) + seededSample(tag, index + 1) * weight;
}
