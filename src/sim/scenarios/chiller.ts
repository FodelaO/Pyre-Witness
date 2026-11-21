/** Models loss of duty cooling, available standby and the out-of-band product response. */
import { assetById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import { available, enforceBoundary, exposedControl, inspect, reading, removeRemoteAccess, unenrolledRemoteEndpoints } from "./evidence";

const DUTY = "C-1";
const STANDBY = "C-2";
const SAFETY = "PLC-UT";
const PRODUCT_TEMP = "TT-301";
const GLYCOL_LOOP = ["EV-401", "TK-402", "P-402", "CC-301", "EV-401"];

export const chiller: ScenarioDefinition = {
  id: "chiller",
  label: "Chiller Trip",
  stages(twin: Twin): StageDefinition[] {
    const { graph } = inspect(twin);
    const standby = assetById(twin, STANDBY);
    const safety = assetById(twin, SAFETY);
    const evaporator = assetById(twin, "EV-401");
    const productTemp = assetById(twin, PRODUCT_TEMP)?.process?.telemetry?.find(({ tag }) => tag === PRODUCT_TEMP);
    const sharedExposure = !safety?.safetyCritical && !!exposedControl(graph, SAFETY);
    const hasStandbyLoop = evaporator?.physical.connections.some(({ medium, to }) => medium === "ammonia" && to === STANDBY) &&
      standby?.physical.connections.some(({ medium, to }) => medium === "ammonia" && to === "EC-401");
    const glycolLoop = GLYCOL_LOOP.slice(0, -1).every((id, index) => {
      const asset = assetById(twin, id);
      return available(asset) && asset.physical.connections.some(({ medium, active, to }) =>
        medium === "glycol" && active !== false && to === GLYCOL_LOOP[index + 1]);
    });
    const backupHolds = available(standby) && available(safety) && !!hasStandbyLoop && glycolLoop && !sharedExposure;
    const limit = productTemp?.hi ?? 4;

    return [
      {
        t: 0, title: "Duty compressor trip", where: [DUTY, "EV-401"],
        control: { label: "Duty cooling unavailable to exercise", holds: () =>
          !assetById(twin, DUTY) || !assetById(twin, "CC-301") },
        effects: { assets: { [DUTY]: { status: "alarm", running: false } }, areas: { utilities: "attention" } },
      },
      {
        t: 6, title: backupHolds ? "Standby cooling engaged" : "Standby readiness checked",
        where: [SAFETY, STANDBY],
        effects: backupHolds ? { assets: { [STANDBY]: { status: "ok", running: true } } } : undefined,
      },
      {
        t: 12, title: "Cooling containment checked", where: [STANDBY, "EV-401"],
        control: { label: "C-2 standby cooling", where: [STANDBY], holds: () => backupHolds },
        effects: { assets: { "TT-401": { status: "attention", telemetry: { "TT-401": -2.4 } } }, areas: { utilities: "alarm" } },
      },
      {
        t: 24, title: "Carbo-cooler outlet above band", where: ["CC-301", PRODUCT_TEMP],
        effects: {
          assets: { [PRODUCT_TEMP]: { status: "alarm", telemetry: { [PRODUCT_TEMP]: limit + 0.4 } } },
          areas: { blending: "alarm" },
        },
      },
      {
        t: 39, title: "Warm product held · filling stopped", where: [PRODUCT_TEMP, "FIL-3"],
        effects: {
          assets: {
            [PRODUCT_TEMP]: { status: "alarm", telemetry: { [PRODUCT_TEMP]: limit + 2.5 } },
            "FIL-3": { status: "alarm", running: false },
            "FT-403": { status: "attention", telemetry: { "FT-403": 0 } },
          },
          areas: { filler3: "alarm" },
        },
      },
    ];
  },
  consequence(twin, stages) {
    const last = stages.at(-1);
    const warm = last?.effects?.assets?.[PRODUCT_TEMP]?.telemetry?.[PRODUCT_TEMP];
    const outletTempC = warm ?? reading(assetById(twin, PRODUCT_TEMP), PRODUCT_TEMP, 3);
    const backupStarted = stages.some((stage) => stage.effects?.assets?.[STANDBY]?.running);
    return {
      summary: warm !== undefined ? `${outletTempC.toFixed(1)} °C outlet · warm product held`
        : backupStarted ? "Standby cooling held outlet within band" : "Cooling challenge unavailable",
      metrics: { outletTempC, lineStopped: warm !== undefined },
    };
  },
  mitigations(twin) {
    return [
      ...enforceBoundary(twin, "sim-chiller-utility", "C-OPS-UTIL", "SW-OT"),
      ...removeRemoteAccess("sim-chiller-remote", unenrolledRemoteEndpoints(twin, [SAFETY])),
    ];
  },
};
