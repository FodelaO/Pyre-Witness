/** Screens an in-range OT radio for modeled exposure to Filler 3 supervision and control. */
import { areaById, assetById, distance, entryPointById, UNITS_PER_METRE } from "@/twin/geometry";
import type { MitigationEffect, Twin } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import { enforceBoundary, inspect, proposal, reachFrom, reading } from "./evidence";

const ORIGIN = "parking_rf";
const HMI = "HMI-F3";
const PLC = "PLC-F3";
const FILLER = "FIL-3";
const RF_FALLBACK = 30 * UNITS_PER_METRE;

function wirelessEvidence(twin: Twin) {
  const { context, graph } = inspect(twin);
  const point = entryPointById(twin, ORIGIN);
  const parking = areaById(twin, "parking_lot");
  const candidates = point && parking?.attrs.publicAccess ? graph.entries.flatMap((edge) => {
    if (edge.from !== ORIGIN || edge.via !== "rf") return [];
    const asset = context.assetById.get(edge.to);
    if (!asset || asset.network.level > 3 || distance(asset.physical, point) > (point.reach ?? RF_FALLBACK)) return [];
    return [{ asset, reachesHmi: reachFrom(graph, asset.id).has(HMI) }];
  }) : [];
  return {
    candidates,
    hmiEndpoint: candidates.find(({ reachesHmi }) => reachesHmi)?.asset,
    controllerReachable: reachFrom(graph, HMI).has(PLC),
  };
}

export const wireless: ScenarioDefinition = {
  id: "wireless",
  label: "Rogue Wireless",
  stages(twin: Twin): StageDefinition[] {
    const { candidates, hmiEndpoint, controllerReachable } = wirelessEvidence(twin);
    const endpoint = hmiEndpoint ?? candidates[0]?.asset;
    const flow = reading(assetById(twin, "FT-403"), "FT-403", 18);
    return [
      {
        t: 0, title: "Parking-lot RF exposure checked", where: endpoint ? [ORIGIN, endpoint.id] : [ORIGIN],
        technique: "T0860",
        control: { label: "No exposed OT radio in range", where: [ORIGIN], holds: () => !endpoint },
      },
      {
        t: 8, title: "Filler supervision exposed", where: endpoint ? [endpoint.id, HMI] : [HMI],
        control: { label: "Filler cell isolation", where: [HMI], holds: () => !hmiEndpoint },
        effects: { assets: { [HMI]: { status: "attention" } } },
      },
      {
        t: 16, title: "Filler control exposure checked", where: [HMI, PLC],
        control: { label: "Filler controller isolation", where: [PLC], holds: () => !controllerReachable },
        effects: { assets: { [PLC]: { status: "attention" } } },
      },
      {
        t: 27, title: "Filling rate outside band", where: [PLC, FILLER, "FT-403"], technique: "T0831",
        control: { label: "Filler idle", where: [FILLER], holds: (current) =>
          !assetById(current, FILLER)?.process?.running || flow <= 0 },
        effects: {
          assets: {
            [FILLER]: { status: "alarm" },
            "FT-403": { status: "alarm", telemetry: { "FT-403": Math.max(0, flow * 0.82) } },
          },
          areas: { filler3: "alarm" },
        },
      },
    ];
  },
  consequence(twin, stages) {
    const startFlow = reading(assetById(twin, "FT-403"), "FT-403", 18);
    const affectedFlow = stages.at(-1)?.effects?.assets?.["FT-403"]?.telemetry?.["FT-403"];
    const fillerRateBph = Math.round((affectedFlow ?? startFlow) * 2000);
    return {
      summary: affectedFlow !== undefined ? `Filling rate fell to ${fillerRateBph.toLocaleString("en-US")} bph`
        : "Filler rate held",
      metrics: { fillerRateBph },
    };
  },
  mitigations(twin) {
    const endpoints = wirelessEvidence(twin).candidates.map(({ asset }) => asset);
    const radioEffects: MitigationEffect[] = endpoints.flatMap((asset) =>
      (asset.cyber?.radios ?? []).filter((radio) => radio !== "nfc").map((radio) =>
        ({ type: "disable_radio", assetId: asset.id, radio })),
    );
    const disable = radioEffects.length ? [proposal(
      "sim-wireless-radio", "Disable exposed radios", "software",
      "Disable radios on the modeled endpoints in parking-lot RF reach.",
      endpoints.map((asset) => asset.id), radioEffects,
    )] : [];
    const added = endpoints.filter((asset) => asset.origin === "added");
    const quarantine = added.length ? [proposal(
      "sim-wireless-quarantine", "Remove exposed devices", "physical",
      "Take the newly placed wireless endpoints out of the modeled production cell.",
      added.map((asset) => asset.id), added.map((asset) => ({ type: "remove_asset", assetId: asset.id })),
    )] : [];
    return [...disable, ...quarantine, ...enforceBoundary(twin, "sim-wireless-f3-pack", "C-F3-PACK", "SW-F3")];
  },
};
