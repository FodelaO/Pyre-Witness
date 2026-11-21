/** Tabletop NH₃ release indicators and local response availability. */
import { areaById, assetById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { ScenarioDefinition, SimAssetEffect, StageDefinition } from "../types";
import { available, exposedControl, inspect, proposal, removeRemoteAccess, unenrolledRemoteEndpoints } from "./evidence";

const SOURCE = "C-1";
const DETECTOR = "GT-401";
const SAFETY = "PLC-UT";
const ZONE = "nh3_hazard";
// Reference value only. Exercise concentration tiers are illustrative.
const IDLH_PPM = 300;

export const ammonia: ScenarioDefinition = {
  id: "ammonia",
  label: "Ammonia Release",
  stages(twin: Twin): StageDefinition[] {
    const { context, graph, findings } = inspect(twin);
    const source = assetById(twin, SOURCE);
    const detector = assetById(twin, DETECTOR);
    const safety = assetById(twin, SAFETY);
    const exposure = exposedControl(graph, SAFETY);
    const independent = detector?.safetyCritical && safety?.safetyCritical;
    const detected = detector?.status !== "offline" && detector?.process?.running === true;
    const visibleDetection = detected && (independent || !exposure);
    const localResponse = visibleDetection && available(safety);
    const indicated = (ppm: number): Record<string, SimAssetEffect> => ({ [DETECTOR]: { status: "alarm" as const, telemetry: { [DETECTOR]: ppm } } });
    const plume = (intensity: number, estimatedPpm: number) => ({ kind: "ammonia" as const,
      where: [SOURCE, ZONE], intensity, estimatedPpm });
    const unrated = findings.filter((finding) => finding.ruleId === "HAZ-01").map((finding) => finding.assetId);

    return [
      {
        t: 0, title: "Simulated release reported", where: [SOURCE, ZONE],
        control: { label: "Machinery room source absent", where: [ZONE], holds: () =>
          !source || !context.areasFor(source).some((area) => area.id === ZONE) ||
          areaById(twin, ZONE)?.attrs.hazard !== "NH3" },
        effects: { assets: { [SOURCE]: { status: "attention" } }, areas: { [ZONE]: "attention" }, visual: plume(0.18, 0) },
      },
      {
        t: 8, title: localResponse ? "Local alarm responding" : "Local response unconfirmed",
        where: [DETECTOR, SAFETY],
        ...(!independent && exposure ? { technique: "T0878" } : {}),
        effects: {
          assets: {
            ...(visibleDetection ? indicated(32) : {}),
            ...(localResponse ? { [SOURCE]: { status: "alarm" as const, running: false } } : {}),
          },
          areas: { [ZONE]: "alarm" }, visual: plume(0.35, 32),
        },
      },
      {
        t: 16, title: localResponse ? "Ventilation response checked" : "Response unavailable · zone alarm",
        where: [SAFETY, ZONE],
        control: { label: independent ? "Independent NH₃ response" : "Local NH₃ response", where: [SAFETY],
          holds: () => !!localResponse && unrated.length === 0 },
        effects: {
          assets: {
            ...(!localResponse && visibleDetection ? indicated(155) : {}),
            ...Object.fromEntries(unrated.map((id) => [id, { status: "attention" as const }])),
          },
          visual: localResponse ? plume(0.18, 12) : plume(0.64, 155),
        },
      },
      {
        t: 34, title: localResponse ? "Equipment suitability unresolved" : "Simulated evacuation · compressor stopped",
        where: localResponse ? [...unrated, ZONE] : [ZONE, SOURCE],
        effects: {
          assets: {
            [SOURCE]: { status: "alarm", running: false },
            ...(!localResponse && visibleDetection ? indicated(330) : {}),
          },
          visual: localResponse ? plume(0.08, 4) : plume(1, 330),
        },
      },
    ];
  },
  consequence(_twin, stages) {
    const advanced = stages.filter((stage) => stage.outcome === "advanced");
    const started = advanced.length > 0;
    const unrated = advanced.at(-1)?.title === "Equipment suitability unresolved";
    const peakPpm = Math.max(0, ...advanced.map(({ effects }) =>
      effects?.visual?.kind === "ammonia" ? effects.visual.estimatedPpm : 0));
    const reachedEvacuation = peakPpm >= IDLH_PPM;
    return {
      summary: reachedEvacuation
        ? `${peakPpm} ppm vs ${IDLH_PPM} ppm IDLH · simulated evacuation`
        : unrated ? `${peakPpm} ppm peak · equipment suitability unresolved`
          : started ? `${peakPpm} ppm peak · release response held` : "No release challenge in this zone",
      metrics: { peakPpm, idlhPpm: IDLH_PPM, evacuation: reachedEvacuation, unratedEquipment: unrated },
    };
  },
  mitigations(twin) {
    const { context, findings } = inspect(twin);
    const unrated = findings.filter((finding) => finding.ruleId === "HAZ-01" &&
      context.assetById.get(finding.assetId)?.origin === "added").map((finding) => finding.assetId);
    const removal = unrated.length ? [proposal(
      "sim-ammonia-rated", "Remove unverified equipment", "physical",
      "Take equipment with unverified suitability out of service in the modeled NH₃ area.",
      unrated, unrated.map((assetId) => ({ type: "remove_asset", assetId })),
    )] : [];
    return [...removal, ...removeRemoteAccess("sim-ammonia-remote", unenrolledRemoteEndpoints(twin, [SAFETY]))];
  },
};
