/** Telemetry band checks and Line 3 permissive detections for the simulated plant. */
import { formatTelemetry } from "@/floor/telemetryFormat";
import { areasAt } from "@/twin/geometry";
import type { AssetStatus, Area, Twin } from "@/twin/types";
import type { SimAlert } from "./types";

const SOURCE = "simulated plant";

export function readMonitors(twin: Twin): SimAlert[] {
  const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const alerts: SimAlert[] = [];
  const coveredTags = new Set<string>();
  const where = (...ids: string[]): string[] => {
    const targets = new Set<string>();
    for (const id of ids) {
      const asset = assets.get(id);
      if (!asset) continue;
      targets.add(id);
      targets.add(asset.physical.area);
      for (const area of areasAt(twin, asset.physical.x, asset.physical.y)) targets.add(area.id);
    }
    return [...targets];
  };
  const value = (id: string) => {
    const asset = assets.get(id);
    return asset?.status === "offline" ? undefined : asset?.process?.telemetry?.find((point) => point.tag === id);
  };
  const alert = (id: string, title: string, severity: SimAlert["severity"], ...assetIds: string[]) => {
    alerts.push({ id, title, severity, where: where(...assetIds), source: SOURCE });
  };

  const filler = assets.get("FIL-3");
  const filling = filler?.process?.running === true && filler.status !== "offline";
  const valve = assets.get("V-311");
  const proof = value("ZSC-311");
  const cipOpen = valve?.process?.running === true || valve?.physical.connections.some((connection) =>
    connection.medium === "cip" && connection.to === "FIL-3" && connection.active !== false,
  );
  if (filling && (cipOpen || (proof !== undefined && proof.value !== 1))) {
    alert("interlock:cip-production", cipOpen ? "V-311 open during filling" : "V-311 closed proof lost during filling", "alarm",
      "V-311", "ZSC-311", "FIL-3");
    coveredTags.add("band:ZSC-311:ZSC-311");
  }

  const gas = value("GT-401");
  if (gas?.hi !== undefined && gas.value > gas.hi) {
    alert("interlock:ammonia-detector", `GT-401 detector high · ${formatTelemetry(gas.value, gas.unit)}`, "alarm", "GT-401");
    coveredTags.add("band:GT-401:GT-401");
  }

  const cold = value("TT-301");
  if (filling && cold?.hi !== undefined && cold.value > cold.hi) {
    alert("interlock:cola-outlet", `CC-301 outlet warm · ${formatTelemetry(cold.value, cold.unit)}`, "alarm", "CC-301", "TT-301", "FIL-3");
    coveredTags.add("band:TT-301:TT-301");
  }

  for (const asset of twin.assets) {
    if (asset.status === "offline") continue;
    for (const point of asset.process?.telemetry ?? []) {
      const id = `band:${asset.id}:${point.tag}`;
      if (coveredTags.has(id)) continue;
      const below = point.lo !== undefined && point.value < point.lo;
      const above = point.hi !== undefined && point.value > point.hi;
      if (below || above) {
        alert(id, `${point.tag} ${below ? "low" : "high"} · ${formatTelemetry(point.value, point.unit)}`,
          asset.safetyCritical ? "alarm" : "attention", asset.id);
      }
    }
  }
  return alerts;
}

/** Paints current detections over a canonical unpainted twin while preserving higher statuses. */
export function applyMonitorStatus(twin: Twin, alerts: readonly SimAlert[]): Twin {
  const severity = new Map<string, SimAlert["severity"]>();
  for (const alert of alerts) {
    for (const id of alert.where) {
      if (severity.get(id) !== "alarm") severity.set(id, alert.severity);
    }
  }
  if (severity.size === 0) return twin;

  const nextStatus = (id: string, status: AssetStatus | Area["status"]) => {
    if (status === "alarm" || status === "offline") return undefined;
    return severity.get(id);
  };
  return {
    ...twin,
    assets: twin.assets.map((asset) => {
      const status = nextStatus(asset.id, asset.status);
      return status && status !== asset.status ? { ...asset, status } : asset;
    }),
    areas: twin.areas.map((area) => {
      const status = nextStatus(area.id, area.status);
      return status && status !== area.status ? { ...area, status } : area;
    }),
  };
}

export function monitorProcess(twin: Twin): { twin: Twin; alerts: SimAlert[] } {
  const alerts = readMonitors(twin);
  return { twin: applyMonitorStatus(twin, alerts), alerts };
}
