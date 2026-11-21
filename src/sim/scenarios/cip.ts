/** Tabletop CIP crossover with isolation, closed-proof and product-hold consequences. */
import { assetById } from "@/twin/geometry";
import type { MitigationEffect, Twin } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import {
  PHYSICAL_INGRESS_PROTECTIONS, available, editAsset, enforceBoundary, exposedControl, hasProtection, inspect, proposal,
  reading, removeRemoteAccess, reportArea, unenrolledRemoteEndpoints, withoutBoundary, withoutProtection,
} from "./evidence";

const VALVE = "V-311";
const FILLER = "FIL-3";
const PROOF = "ZSC-311";
const HMI = "HMI-F3";
const CONTROLLERS = ["PLC-F3", "PLC-BL"];
const BRANCH_GUARD = "cip-branch-isolation";
const INTERLOCK = "hardwired-interlock";

function controllerExposure(twin: Twin) {
  const { graph } = inspect(twin);
  return CONTROLLERS.map((id) => exposedControl(graph, id)).find(Boolean);
}

function creditedIsolation(twin: Twin) {
  const { context } = inspect(twin);
  const physical = twin.assets.flatMap((asset) => PHYSICAL_INGRESS_PROTECTIONS
    .filter((id) => hasProtection(asset, id)).map((id) => ({
      label: `${asset.id} ${id === "port-lock" ? "port lock" : "locked cabinet"}`,
      where: [asset.id],
      without: (current: Twin) => withoutProtection(current, asset.id, id),
    })));
  const boundaries = twin.conduits.filter(context.isEnforced).map((conduit) => ({
    label: `${conduit.enforcedBy} · ${conduit.id}`,
    where: [conduit.enforcedBy!],
    without: (current: Twin) => withoutBoundary(current, conduit.id),
  }));
  return [...physical, ...boundaries].find(({ without }) => !!controllerExposure(without(twin)));
}

export const cip: ScenarioDefinition = {
  id: "cip",
  label: "CIP Crossover",
  stages(twin: Twin): StageDefinition[] {
    const exposure = controllerExposure(twin);
    const credited = exposure ? undefined : creditedIsolation(twin);
    const proof = assetById(twin, PROOF);
    const valve = assetById(twin, VALVE);
    const filler = assetById(twin, FILLER);
    const installed = hasProtection(valve, INTERLOCK);
    const isolated = hasProtection(valve, BRANCH_GUARD);
    const branch = valve?.physical.connections.some((link) => link.to === FILLER && link.medium === "cip");
    const conductivity = assetById(twin, "CT-210")?.process?.telemetry?.find(({ tag }) => tag === "CT-210");
    const preview = (intensity: number) => ({ kind: "caustic" as const, where: [VALVE, FILLER], intensity });
    return [
      {
        t: 0, title: "CIP control anomaly reported", where: [VALVE, "blending"],
        effects: reportArea(twin, "blending"),
      },
      {
        t: 4, title: "Controller exposure checked",
        where: exposure ? [exposure.entry, exposure.endpoint, exposure.assetId] : ["PLC-F3"],
        control: { label: "Controller isolation", where: ["PLC-F3"], ...credited, holds: () => !exposure },
      },
      {
        t: 6, title: "CIP branch checked", where: [VALVE, FILLER],
        control: { label: "CIP branch isolation", where: [VALVE],
          holds: () => isolated || !available(valve) || !branch || !filler?.process?.running,
          ...(isolated ? { without: (current: Twin) => withoutProtection(current, VALVE, BRANCH_GUARD) } : {}),
        },
      },
      {
        t: 10, title: "Valve safeguard checked", where: [VALVE],
        control: {
          label: "V-311 hardwired interlock", where: [VALVE], holds: () => installed,
          without: (current) => withoutProtection(current, VALVE, INTERLOCK),
        },
      },
      {
        t: 12, title: "CIP crossover indicated", where: [VALVE, FILLER], technique: "T1692.001",
        control: {
          label: "ZSC-311 hardwired permissive", where: [PROOF],
          holds: () => available(proof) && proof.safetyCritical === true && reading(proof, PROOF, 0) === 1,
          without: (current) => editAsset(current, PROOF, (asset) => ({ ...asset, safetyCritical: false })),
        },
        effects: {
          assets: { [VALVE]: { status: "alarm", running: true }, [PROOF]: { status: "alarm", telemetry: { [PROOF]: 0 } } },
          areas: { blending: "alarm" }, visual: preview(0.28),
        },
      },
      {
        t: 24, title: "Conductivity excursion · product hold", where: ["CT-210", FILLER],
        effects: {
          assets: {
            "CT-210": { status: "alarm", telemetry: { "CT-210": (conductivity?.hi ?? 0.2) + 0.8 } },
            [FILLER]: { status: "alarm" },
          },
          areas: { filler3: "alarm" }, visual: preview(0.72),
        },
      },
      {
        t: 42, title: "Filling stopped · batch quarantined", where: [FILLER, "P-301"],
        effects: {
          assets: {
            [FILLER]: { status: "alarm", running: false },
            "P-301": { status: "alarm", running: false, telemetry: { "FT-301": 0 } },
            "FT-403": { status: "alarm", telemetry: { "FT-403": 0 } },
          },
          visual: preview(1),
        },
      },
    ];
  },
  consequence(twin, stages) {
    const crossover = stages.find((stage) => stage.outcome === "advanced" && stage.effects?.visual?.kind === "caustic");
    const flow = reading(assetById(twin, "FT-403"), "FT-403", 18);
    const elapsed = crossover ? (stages.at(-1)?.t ?? crossover.t) - crossover.t : 0;
    const volume = Number((Math.max(0, flow) * elapsed / 3600).toFixed(2));
    return {
      summary: crossover ? `Batch held · ${volume.toFixed(2)} m³ potentially affected` : "0 m³ affected · product isolated",
      metrics: { contaminatedM3: volume, lineStopped: !!crossover },
    };
  },
  mitigations(twin) {
    const segmentation = enforceBoundary(twin, "sim-cip-f3-pack", "C-F3-PACK", "SW-F3");
    const valve = assetById(twin, VALVE);
    const hmi = assetById(twin, HMI);
    const interfaces = hmi?.cyber;
    const localAccess = interfaces?.removableStorage && proposal(
      "sim-cip-port", "Disable HMI service media", "software",
      "Remove the modeled removable media interface from the Filler 3 operator panel.",
      [HMI], [{
        type: "patch_cyber", assetId: HMI,
        patch: { removableStorage: false, ports: interfaces.ports.filter((port) => !/usb|\b(?:sd|cf)\b/i.test(port)) },
      }],
    );
    const localControls = localAccess ? [...segmentation, localAccess] : segmentation;
    const combined = localControls.length > 1 ? [proposal(
      "sim-cip-controller", "Enforce cell boundary and disable HMI service media", "software",
      "Enforce the intercell boundary and remove the modeled HMI service-media exposure.",
      localControls.flatMap(({ targets }) => targets), localControls.flatMap(({ effects }) => effects),
    )] : [];
    const ingressControls = hmi && interfaces?.removableStorage ? PHYSICAL_INGRESS_PROTECTIONS
      .filter((id) => !hasProtection(hmi, id)).map((id) => proposal(
        `sim-cip-${id}`, id === "port-lock" ? "Lock HMI service port" : "Lock HMI cabinet", "physical",
        "Restrict modeled local service-media access at the operator panel.",
        [HMI], [{ type: "add_protection", assetId: HMI, protection: id }],
      )) : [];
    const legacyBridge = assetById(twin, "SW-PK")?.physical.connections.some((link) =>
      link.to === "SW-F3" && link.medium === "network" && link.active !== false);
    const physicalIsolation = ingressControls.length && legacyBridge ? [proposal(
      "sim-cip-physical-ingress", "Lock HMI port and disconnect cell bridge", "physical",
      "Lock the operator panel’s service port and remove the modeled legacy intercell bridge.",
      [HMI, "SW-PK", "SW-F3"],
      [...ingressControls[0].effects, { type: "remove_connection", assetId: "SW-PK", to: "SW-F3", medium: "network" }],
    )] : [];
    const valveProtection = (id: string, title: string, description: string, protection: string) => {
      if (!valve || hasProtection(valve, protection)) return [];
      const effect: MitigationEffect = { type: "add_protection", assetId: VALVE, protection };
      return [proposal(id, title, "physical", description, [VALVE], [effect])];
    };
    return [
      ...valveProtection("sim-cip-isolate", "Isolate CIP branch",
        "Represent positive physical segregation of the CIP and product circuits in the twin.",
        BRANCH_GUARD),
      ...valveProtection("sim-cip-hardwired-interlock", "Add V-311 hardwired interlock",
        "Credit an independent, hardwired closure interlock at the CIP branch valve.", INTERLOCK),
      ...ingressControls,
      ...physicalIsolation,
      ...localControls,
      ...combined,
      ...removeRemoteAccess("sim-cip-remote", unenrolledRemoteEndpoints(twin, CONTROLLERS)),
    ];
  },
};
