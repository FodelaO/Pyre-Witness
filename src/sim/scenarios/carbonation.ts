/** Defensive carbonation exercise with band-relative telemetry and product hold. */
import { assetById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import { available, enforceBoundary, exposedControl, inspect, proposal, reachFrom, reading, removeRemoteAccess, unenrolledRemoteEndpoints } from "./evidence";

const SUPERVISION = "SCADA-03";
const CONTROLLER = "PLC-BL";
const BOUNDARY = "C-OPS-BLEND";
const CARBONATOR = "CC-301";
const PRESSURE = "PT-301";
const DISSOLVED = "QT-301";
const FILLER = "FIL-3";
const PROTECTION = "independent-pressure-protection";
const RELIEF_DEMAND_AT = 18;
const FOAM_AT = 30;

function withoutBlendSegmentation(twin: Twin): Twin {
  return { ...twin, conduits: twin.conduits.map((conduit) =>
    conduit.id === BOUNDARY ? { ...conduit, enforcedBy: null } : conduit,
  ) };
}

function withoutPressureProtection(twin: Twin): Twin {
  return { ...twin, assets: twin.assets.map((asset) => asset.id === CARBONATOR
    ? { ...asset, protections: asset.protections?.filter((protection) => protection !== PROTECTION) }
    : asset) };
}

function controlExposure(twin: Twin) {
  const { context, graph } = inspect(twin);
  if (!available(context.assetById.get(CONTROLLER))) return undefined;
  // This exercise may start with a supervision incident, then checks what the twin isolates.
  if (available(context.assetById.get(SUPERVISION)) && reachFrom(graph, SUPERVISION).has(CONTROLLER)) return SUPERVISION;
  return exposedControl(graph, CONTROLLER)?.endpoint;
}

function aboveBand(twin: Twin, tag: string, fallbackHigh: number, fallbackLow: number, spanFraction: number) {
  const point = assetById(twin, tag)?.process?.telemetry?.find((sample) => sample.tag === tag);
  const high = point?.hi ?? fallbackHigh;
  const low = point?.lo ?? fallbackLow;
  const span = high > low ? high - low : fallbackHigh - fallbackLow;
  return Number(Math.max(point?.value ?? low, high + span * spanFraction).toFixed(3));
}

export const carbonation: ScenarioDefinition<"carbonation"> = {
  id: "carbonation",
  label: "CO₂ Upset",
  stages(twin: Twin): StageDefinition[] {
    const exposedFrom = controlExposure(twin);
    const creditedSegmentation = !exposedFrom && !!controlExposure(withoutBlendSegmentation(twin));
    const carbonator = assetById(twin, CARBONATOR);
    const gasTank = assetById(twin, "TK-401");
    const vaporizer = assetById(twin, "HX-401");
    const productPump = assetById(twin, "P-301");
    const filler = assetById(twin, FILLER);
    const trainOperating = available(carbonator) && carbonator.process?.running === true
      && available(gasTank) && (gasTank.process?.levelPct ?? 0) > 0
      && gasTank.physical.connections.some(({ to, medium, active }) => to === "HX-401" && medium === "co2" && active !== false)
      && available(vaporizer) && vaporizer.process?.running === true
      && vaporizer.physical.connections.some(({ to, medium, active }) => to === CARBONATOR && medium === "co2" && active !== false)
      && carbonator.physical.connections.some(({ to, medium, active }) => to === "P-301" && medium === "product" && active !== false)
      && available(productPump) && productPump.process?.running === true
      && productPump.physical.connections.some(({ to, medium, active }) => to === FILLER && medium === "product" && active !== false)
      && available(filler) && filler.process?.running === true;
    const independentlyProtected = carbonator?.protections?.includes(PROTECTION) ?? false;

    return [
      {
        t: 0, title: "Carbonation supervision challenged", where: [exposedFrom ?? SUPERVISION, CONTROLLER],
        control: {
          label: creditedSegmentation ? "Blend cell segmentation" : "Blend controller isolated", where: [creditedSegmentation ? "SW-OT" : CONTROLLER],
          holds: () => !exposedFrom,
          ...(creditedSegmentation ? { without: withoutBlendSegmentation } : {}),
        },
      },
      {
        t: 6, title: "Carbonation train checked", where: [CARBONATOR, "HX-401"],
        control: { label: "Carbonation train inactive", where: [CARBONATOR], holds: () => !trainOperating },
      },
      {
        t: 12, title: "Carbonator pressure above band", where: [CARBONATOR, PRESSURE], technique: "T0836",
        effects: {
          assets: { [PRESSURE]: { status: "attention", telemetry: { [PRESSURE]: aboveBand(twin, PRESSURE, 2.9, 2.4, 0.2) } } },
          areas: { blending: "attention" },
        },
      },
      {
        t: RELIEF_DEMAND_AT, title: "Simulated relief demand indicated", where: [PRESSURE, CARBONATOR],
        control: {
          label: "Independent pressure protection", where: [CARBONATOR],
          holds: () => independentlyProtected, without: withoutPressureProtection,
        },
        effects: {
          assets: {
            [CARBONATOR]: { status: "alarm" },
            [PRESSURE]: { status: "alarm", telemetry: { [PRESSURE]: aboveBand(twin, PRESSURE, 2.9, 2.4, 0.55) } },
          },
          areas: { blending: "alarm" },
        },
      },
      {
        t: FOAM_AT, title: "Foaming indicated · product hold", where: [DISSOLVED, FILLER],
        effects: {
          assets: {
            [DISSOLVED]: { status: "alarm", telemetry: { [DISSOLVED]: aboveBand(twin, DISSOLVED, 3.8, 3.6, 0.8) } },
            [FILLER]: { status: "alarm" },
          },
          areas: { filler3: "alarm" },
        },
      },
      {
        t: 42, title: "Filling stopped · batch held", where: [FILLER, CARBONATOR],
        effects: {
          assets: {
            [FILLER]: { running: false, status: "alarm" },
            [CARBONATOR]: { running: false, status: "alarm" },
            "P-301": { running: false, status: "alarm", telemetry: { "FT-301": 0 } },
            "FT-403": { status: "alarm", telemetry: { "FT-403": 0 } },
          },
        },
      },
    ];
  },
  consequence(twin, stages) {
    const advanced = stages.filter(({ outcome }) => outcome === "advanced");
    const peakPressureBar = Math.max(reading(assetById(twin, PRESSURE), PRESSURE, 2.6), ...advanced.flatMap(({ effects }) => {
      const value = effects?.assets?.[PRESSURE]?.telemetry?.[PRESSURE];
      return value === undefined ? [] : [value];
    }));
    const foaming = advanced.some(({ t }) => t === FOAM_AT);
    const reliefDemand = advanced.some(({ t }) => t === RELIEF_DEMAND_AT);
    const lineStopped = advanced.some(({ effects }) => effects?.assets?.[FILLER]?.running === false);
    const affectedSeconds = foaming ? Math.max(0, (advanced.at(-1)?.t ?? FOAM_AT) - FOAM_AT) : 0;
    const flow = Math.max(0, reading(assetById(twin, "FT-403"), "FT-403", 0));
    const heldL = Math.round(flow * affectedSeconds / 3.6);
    return {
      summary: `${peakPressureBar.toFixed(1)} bar(g) peak · ${reliefDemand && foaming ? "relief demand and foam · " : ""}${heldL} L held`,
      metrics: { peakPressureBar, reliefDemand, foaming, heldL, lineStopped },
    };
  },
  mitigations(twin) {
    const carbonator = assetById(twin, CARBONATOR);
    const physical = carbonator && !carbonator.protections?.includes(PROTECTION) ? [proposal(
      "sim-carbonation-independent", "Independent pressure protection", "physical",
      "Model an independent pressure safeguard on the carbonation train.", [CARBONATOR],
      [{ type: "add_protection", assetId: CARBONATOR, protection: PROTECTION }],
    )] : [];
    return [
      ...physical,
      ...enforceBoundary(twin, "sim-carbonation-boundary", BOUNDARY, "SW-OT"),
      ...removeRemoteAccess("sim-carbonation-remote", unenrolledRemoteEndpoints(twin, [CONTROLLER])),
    ];
  },
};
