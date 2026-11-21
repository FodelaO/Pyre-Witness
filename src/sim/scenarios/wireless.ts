/** Screens an in-range OT radio for modeled exposure to Filler 3 supervision and control. */
import { areaById, assetById, distance, entryPointById, UNITS_PER_METRE } from "@/twin/geometry";
import type { MitigationEffect, Twin } from "@/twin/types";
import type { ScenarioContext, ScenarioDefinition, StageDefinition } from "../types";
import { editAsset, enforceBoundary, inspect, proposal, reachFrom, reading, reportArea } from "./evidence";

const ORIGIN = "parking_rf";
const HMI = "HMI-F3";
const PLC = "PLC-F3";
const FILLER = "FIL-3";
const RF_FALLBACK = 30 * UNITS_PER_METRE;
const FILLER_BOUNDARIES = ["C-F3-PACK", "C-OPS-F3"];

function wirelessEvidence(twin: Twin) {
  const { context, graph } = inspect(twin);
  const point = entryPointById(twin, ORIGIN);
  const parking = areaById(twin, "parking_lot");
  const candidates = point && parking?.attrs.publicAccess ? graph.entries.flatMap((edge) => {
    if (edge.from !== ORIGIN || edge.via !== "rf") return [];
    const asset = context.assetById.get(edge.to);
    if (!asset || asset.status === "offline" || asset.network.level > 3
      || distance(asset.physical, point) > (point.reach ?? RF_FALLBACK)) return [];
    const hmiRoute = context.assetById.get(HMI)?.status === "offline" ? undefined : reachFrom(graph, asset.id).get(HMI);
    const inferredWifi = hmiRoute && asset.cyber?.radios.includes("wifi") && !context.links(asset).length
      && !asset.network.ip && !asset.network.protocols?.length && !asset.network.conduit;
    return [{ asset, hmiRoute, inferredWifi }];
  }) : [];
  return {
    context,
    candidates,
    hmiEndpoint: candidates.find(({ hmiRoute }) => !!hmiRoute),
    controllerReachable: context.assetById.get(PLC)?.status !== "offline" && reachFrom(graph, HMI).has(PLC),
  };
}

function creditedBoundary(twin: Twin, assessment: ReturnType<typeof wirelessEvidence>) {
  if (assessment.hmiEndpoint || !assessment.candidates.length) return undefined;
  for (const id of FILLER_BOUNDARIES) {
    const conduit = assessment.context.conduitById.get(id);
    if (!conduit?.enforcedBy || !assessment.context.isEnforced(conduit)) continue;
    const without = (current: Twin): Twin => ({
      ...current,
      conduits: current.conduits.map((link) => link.id === id ? { ...link, enforcedBy: null } : link),
    });
    if (wirelessEvidence(without(twin)).hmiEndpoint) return { where: [conduit.enforcedBy], without };
  }
}

function creditedRadioControl(twin: Twin, context?: ScenarioContext) {
  for (const effect of context?.appliedEffects ?? []) {
    if (effect.type !== "disable_radio") continue;
    const asset = assetById(twin, effect.assetId);
    if (!asset?.cyber || asset.cyber.radios.includes(effect.radio)) continue;
    const without = (current: Twin) => editAsset(current, asset.id, (entry) => entry.cyber ? {
      ...entry, cyber: { ...entry.cyber, radios: [...entry.cyber.radios, effect.radio] },
    } : entry);
    if (wirelessEvidence(without(twin)).candidates.some(({ asset: candidate }) => candidate.id === asset.id)) {
      return { label: `${asset.id} radio disable`, where: [asset.id], without };
    }
  }
}

export const wireless: ScenarioDefinition = {
  id: "wireless",
  label: "Rogue Wireless",
  stages(twin: Twin, context?: ScenarioContext): StageDefinition[] {
    const assessment = wirelessEvidence(twin);
    const { candidates, hmiEndpoint, controllerReachable } = assessment;
    const endpoint = hmiEndpoint?.asset ?? candidates[0]?.asset;
    const radioControl = endpoint ? undefined : creditedRadioControl(twin, context);
    const boundary = creditedBoundary(twin, assessment);
    const flow = reading(assetById(twin, "FT-403"), "FT-403", 18);
    return [
      {
        t: 0, title: "Untrusted RF activity reported", where: [ORIGIN, "parking_lot"],
        effects: reportArea(twin, "parking_lot"),
      },
      {
        t: 4, title: endpoint ? `${endpoint.id} within parking RF reach` : "Parking-lot RF exposure checked",
        where: endpoint ? [ORIGIN, endpoint.id] : [ORIGIN],
        technique: "T0860",
        control: { label: "No exposed OT radio in range", where: [ORIGIN], ...radioControl, holds: () => !endpoint },
      },
      {
        t: 8,
        title: hmiEndpoint?.inferredWifi ? `Modeled Wi-Fi path reaches ${HMI}` : `Network exposure to ${HMI} checked`,
        where: hmiEndpoint?.hmiRoute ?? (endpoint ? [endpoint.id, HMI] : [HMI]),
        control: {
          label: boundary ? `Filler isolation at ${boundary.where[0]}` : "Filler cell isolation",
          where: boundary?.where ?? [HMI], holds: () => !hmiEndpoint,
          ...(boundary ? { without: boundary.without } : {}),
        },
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
    const rate = `${fillerRateBph.toLocaleString("en-US")} bph`;
    const endpoint = stages[0]?.where[1];
    return {
      summary: affectedFlow !== undefined ? `${rate} · ${endpoint ?? "In-range radio"} reached ${HMI}` : `${rate} · filling rate held`,
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
