/** Applies temporary incident readings and restores the fields owned by a projection. */
import type { Area, Asset, ProcessProfile, TelemetryPoint, Twin } from "@/twin/types";
import type { SimEffects } from "./types";

export function applySimEffects(twin: Twin, effects: SimEffects): Twin {
  const assets = effects.assets ? twin.assets.map((asset) => {
    const effect = effects.assets?.[asset.id];
    if (!effect) return asset;
    const telemetry = effect.telemetry && asset.process?.telemetry?.map((point) => {
      const value = effect.telemetry?.[point.tag];
      return value === undefined || value === point.value ? point : { ...point, value };
    });
    const process = telemetry || effect.running !== undefined ? {
      ...asset.process,
      ...(telemetry ? { telemetry } : {}),
      ...(effect.running !== undefined ? { running: effect.running } : {}),
    } : asset.process;
    if (process === asset.process && (effect.status === undefined || effect.status === asset.status)) return asset;
    return { ...asset, ...(effect.status ? { status: effect.status } : {}), ...(process ? { process } : {}) };
  }) : twin.assets;
  const areas = effects.areas ? twin.areas.map((area) => {
    const status = effects.areas?.[area.id];
    return !status || area.status === status ? area : { ...area, status };
  }) : twin.areas;
  return assets === twin.assets && areas === twin.areas ? twin : { ...twin, assets, areas };
}

export interface Projection {
  before: Twin;
  painted: Twin;
}

function restoreTelemetry(current: TelemetryPoint[], before: TelemetryPoint[], painted: TelemetryPoint[]) {
  const originals = new Map(before.map((point) => [point.tag, point]));
  const displayed = new Map(painted.map((point) => [point.tag, point]));
  const restored = current.map((point) => {
    const original = originals.get(point.tag);
    const display = displayed.get(point.tag);
    return original && display && original.value !== display.value && point.value === display.value
      ? { ...point, value: original.value } : point;
  });
  return restored.every((point, index) => point === current[index]) ? current : restored;
}

function restoreProcess(current?: ProcessProfile, before?: ProcessProfile, painted?: ProcessProfile) {
  if (before === painted) return current;
  if (current === painted) return before;
  if (!current) return current;

  const next = { ...current };
  if (before?.running !== painted?.running && current.running === painted?.running) {
    if (before?.running === undefined) delete next.running;
    else next.running = before.running;
  }
  if (before?.levelPct !== painted?.levelPct && current.levelPct === painted?.levelPct) {
    if (before?.levelPct === undefined) delete next.levelPct;
    else next.levelPct = before.levelPct;
  }
  if (current.telemetry && before?.telemetry && painted?.telemetry && before.telemetry !== painted.telemetry) {
    next.telemetry = current.telemetry === painted.telemetry
      ? before.telemetry : restoreTelemetry(current.telemetry, before.telemetry, painted.telemetry);
  }
  return next.running === current.running && next.levelPct === current.levelPct && next.telemetry === current.telemetry
    ? current : next;
}

function restoreAsset(current: Asset, before: Asset, painted: Asset): Asset {
  const status = before.status !== painted.status && current.status === painted.status ? before.status : current.status;
  const process = restoreProcess(current.process, before.process, painted.process);
  if (status === current.status && process === current.process) return current;
  const next = { ...current, status };
  if (process) next.process = process;
  else delete next.process;
  return next;
}

function restoreArea(current: Area, before: Area, painted: Area): Area {
  return before.status !== painted.status && current.status === painted.status
    ? { ...current, status: before.status } : current;
}

function restoreItems<T extends { id: string }>(current: T[], before: T[], painted: T[],
  restore: (current: T, before: T, painted: T) => T): T[] {
  if (before === painted) return current;
  if (current === painted) return before;
  const originals = new Map(before.map((item) => [item.id, item]));
  const displayed = new Map(painted.map((item) => [item.id, item]));
  const next = current.map((item) => {
    const original = originals.get(item.id);
    const display = displayed.get(item.id);
    if (!original || !display || original === display) return item;
    return item === display ? original : restore(item, original, display);
  });
  return next.every((item, index) => item === current[index]) ? current : next;
}

export function restoreProjection(twin: Twin, projection: Projection | null): Twin {
  if (!projection || projection.before === projection.painted) return twin;
  const { before, painted } = projection;
  if (twin === painted) return before;
  const assets = restoreItems(twin.assets, before.assets, painted.assets, restoreAsset);
  const areas = restoreItems(twin.areas, before.areas, painted.areas, restoreArea);
  return assets === twin.assets && areas === twin.areas ? twin : { ...twin, assets, areas };
}
