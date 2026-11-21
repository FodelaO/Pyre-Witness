/** Tabletop NH₃ release indicators and local response availability. */
import { areaById, assetById } from "@/twin/geometry";
import type { MitigationEffect, Twin } from "@/twin/types";
import type { ScenarioDefinition, SimAssetEffect, StageDefinition } from "../types";
import {
  available, editAsset, exposedControl, hasProtection, inspect, proposal, removeRemoteAccess, unenrolledRemoteEndpoints,
  withoutProtection,
} from "./evidence";

const SOURCE = "C-1";
const DETECTOR = "GT-401";
const SAFETY = "PLC-UT";
const ZONE = "nh3_hazard";
const INDEPENDENT_DETECTOR = "independent-gas-detection";
const LOCAL_VENTILATION = "emergency-ventilation";
// Exact inventory statement for the documented, preinstalled fallback.
const LEGACY_VENTILATION_EVIDENCE = "detection, ventilation and trip outputs";
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
    // The documented local response remains credited alongside new hardware.
    const installedDetector = hasProtection(detector, INDEPENDENT_DETECTOR);
    const detectorIndependent = installedDetector ||
      (detector?.origin === "seed" && detector.safetyCritical === true && !!detector.description?.includes("hardwired"));
    const installedVentilation = hasProtection(safety, LOCAL_VENTILATION);
    const documentedVentilation = safety?.origin === "seed" && !!safety.description?.includes(LEGACY_VENTILATION_EVIDENCE)
      && (safety.safetyCritical === true || !exposure);
    const detected = detector?.status !== "offline" && detector?.process?.running === true;
    const visibleDetection = detected && (detectorIndependent || !exposure);
    const localResponse = visibleDetection && available(safety) && (installedVentilation || documentedVentilation);
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
        ...(!detectorIndependent && exposure ? { technique: "T0878" } : {}),
        effects: {
          assets: {
            ...(visibleDetection ? indicated(32) : {}),
            ...(localResponse ? { [SOURCE]: { status: "alarm" as const, running: false } } : {}),
          },
          areas: { [ZONE]: "alarm" }, visual: plume(0.35, 32),
        },
      },
      {
        t: 12, title: "Independent hardware response checked", where: [DETECTOR, SAFETY],
        control: {
          label: "Installed NH₃ ventilation", where: [SAFETY],
          holds: () => !!localResponse && installedDetector && installedVentilation && unrated.length === 0,
          without: (current) => withoutProtection(current, SAFETY, LOCAL_VENTILATION),
        },
      },
      {
        t: 16, title: localResponse ? "Ventilation response checked" : "Response unavailable · zone alarm",
        where: [SAFETY, ZONE],
        control: {
          label: documentedVentilation ? "Documented NH₃ ventilation" : "Installed NH₃ ventilation",
          where: [SAFETY],
          holds: () => !!localResponse && unrated.length === 0,
          without: (current) => documentedVentilation
            ? editAsset(current, SAFETY, (asset) => ({
              ...asset,
              description: asset.description?.replace(LEGACY_VENTILATION_EVIDENCE, "detection and trip outputs"),
            }))
            : withoutProtection(current, SAFETY, LOCAL_VENTILATION),
        },
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
          : started ? `${peakPpm} ppm peak · release response held` : "0 ppm simulated · source absent",
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
    const safeguards = [
      { assetId: DETECTOR, protection: INDEPENDENT_DETECTOR },
      { assetId: SAFETY, protection: LOCAL_VENTILATION },
    ].filter(({ assetId }) => context.assetById.has(assetId)).filter(({ assetId, protection }) =>
      !hasProtection(context.assetById.get(assetId), protection));
    const safetyEffects: MitigationEffect[] = safeguards.map((item) => ({ type: "add_protection", ...item }));
    const independent = safeguards.length && context.assetById.has(DETECTOR) && context.assetById.has(SAFETY) ? [proposal(
      "sim-ammonia-safeguards", "Independent detection and ventilation", "physical",
      "Credit independent gas detection and emergency ventilation protection in the exercise.",
      safeguards.map(({ assetId }) => assetId), safetyEffects,
    )] : [];
    return [...removal, ...independent, ...removeRemoteAccess("sim-ammonia-remote", unenrolledRemoteEndpoints(twin, [SAFETY]))];
  },
};
