/** Advances the process clock and applies its readings to the existing twin tags. */
import type { Twin } from "@/twin/types";
import { balanceFlows } from "./flows";
import { clamp, noise, tankCapacityKg, TANK_IDS } from "./model";
import type { ProcessState } from "./model";
import { thermalReadings } from "./thermal";

export function tickProcess(twin: Twin, previous: ProcessState, dtSeconds = 1) {
  const seconds = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
  const inventory = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const { mass, balance, state, beverageM3, dissolvedCo2Volumes } = balanceFlows(inventory, previous, seconds);
  if (seconds === 0) return { twin, state: previous, balance };

  const hours = seconds / 3600;
  const elapsed = state.elapsedSeconds;
  const levels = new Map<string, number>();
  for (const id of TANK_IDS) {
    const capacity = tankCapacityKg(inventory, id);
    if (capacity > 0) levels.set(id, clamp(100 * mass[id] / capacity, 0, 100));
  }
  const trim = (tag: string, nominal: number, amplitude: number) => nominal + noise(tag, elapsed) * amplitude;
  const co2Kgh = (balance.dissolvedCo2Kg + balance.purgeCo2Kg) / hours;
  const values: Partial<Record<string, number>> = {
    ...thermalReadings(inventory, elapsed, seconds, balance.beverageKg / hours, co2Kgh),
    "LT-101": levels.get("TK-101"),
    "LT-102": levels.get("TK-102"),
    "LT-203": levels.get("TK-203"),
    "LT-301": levels.get("BL-301"),
    "LT-401": levels.get("TK-401"),
    "LT-402": inventory.get("TK-402")?.process?.levelPct,
    "LT-411": inventory.get("R-401")?.process?.levelPct,
    "PT-101": trim("PT-101", 3.2, 0.08),
    "PT-102": trim("PT-102", 11.5, 0.13),
    "FT-101": balance.roPermeateKg / hours / 1000,
    "FT-102": (balance.treatedToBlendKg + balance.treatedToSyrupKg + balance.rinseKg) / hours / 1000,
    "FT-103": balance.rinseKg / hours / 1000,
    "FT-104": balance.roFeedKg / hours / 1000,
    "FT-105": balance.roRejectKg / hours / 1000,
    "IT-101": trim("IT-101", 46, 0.8),
    "CT-101": trim("CT-101", 9, 0.22),
    "FT-201": balance.simpleSyrupKg / hours,
    "FT-202": balance.concentrateDoseKg / hours,
    "FT-203": balance.syrupToBlendKg / hours,
    "DT-203": trim("DT-203", 1252, 0.8),
    "AT-203": trim("AT-203", 54, 0.05),
    "FT-303": balance.treatedToBlendKg / hours,
    "FT-304": balance.blendInKg / hours,
    "DT-301": trim("DT-301", 10.6, 0.025),
    "QT-301": dissolvedCo2Volumes,
    "FT-301": beverageM3 / hours,
    "FT-401": co2Kgh,
    "FT-403": beverageM3 / hours,
    "LT-404": trim("LT-404", 64, 0.35),
    "LT-405": beverageM3 > 0 ? trim("LT-405", 500, 0.55) : undefined,
  };

  const assets = twin.assets.map((asset) => {
    const process = asset.process;
    if (!process || asset.status === "offline") return asset;
    const levelPct = levels.get(asset.id) ?? process.levelPct;
    const telemetryChanged = process.telemetry?.some((point) => {
      const value = values[point.tag];
      return value !== undefined && value !== point.value;
    });
    if (!telemetryChanged && levelPct === process.levelPct) return asset;
    const telemetry = telemetryChanged ? process.telemetry?.map((point) => {
      const value = values[point.tag];
      return value === undefined || value === point.value ? point : { ...point, value };
    }) : process.telemetry;
    return {
      ...asset,
      process: {
        ...process,
        ...(telemetry !== undefined ? { telemetry } : {}),
        ...(levelPct !== undefined ? { levelPct } : {}),
      },
    };
  });

  return { twin: { ...twin, assets }, state, balance };
}
