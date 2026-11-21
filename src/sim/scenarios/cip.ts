/** Tabletop CIP crossover with isolation, closed-proof and product-hold consequences. */
import { assetById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import { available, enforceBoundary, exposedControl, inspect, proposal, reading, removeRemoteAccess, unenrolledRemoteEndpoints } from "./evidence";

const VALVE = "V-311";
const FILLER = "FIL-3";
const PROOF = "ZSC-311";
const CONTROLLERS = ["PLC-F3", "PLC-BL"];

export const cip: ScenarioDefinition = {
  id: "cip",
  label: "CIP Crossover",
  stages(twin: Twin): StageDefinition[] {
    const { graph } = inspect(twin);
    const exposure = CONTROLLERS.map((id) => exposedControl(graph, id)).find(Boolean);
    const proof = assetById(twin, PROOF);
    const valve = assetById(twin, VALVE);
    const filler = assetById(twin, FILLER);
    const branch = valve?.physical.connections.some((link) => link.to === FILLER && link.medium === "cip");
    const conductivity = assetById(twin, "CT-210")?.process?.telemetry?.find(({ tag }) => tag === "CT-210");
    const preview = (intensity: number) => ({ kind: "caustic" as const, where: [VALVE, FILLER], intensity });
    return [
      {
        t: 0, title: "Production permissive challenged", where: exposure ? [exposure.entry, exposure.endpoint, exposure.assetId] : ["PLC-F3"],
        control: { label: "Controller isolation", where: ["PLC-F3"], holds: () => !exposure },
      },
      {
        t: 6, title: "CIP branch checked", where: [VALVE, FILLER],
        control: { label: "CIP branch isolation", where: [VALVE],
          holds: () => !available(valve) || !branch || !filler?.process?.running },
      },
      {
        t: 12, title: "CIP crossover indicated", where: [VALVE, FILLER], technique: "T1692.001",
        control: { label: "ZSC-311 hardwired permissive", where: [PROOF], holds: () => available(proof) &&
          proof.safetyCritical === true && reading(proof, PROOF, 0) === 1 },
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
      summary: crossover ? `Batch held · ${volume.toFixed(2)} m³ potentially affected` : "Product remains isolated",
      metrics: { contaminatedM3: volume, lineStopped: !!crossover },
    };
  },
  mitigations(twin) {
    const segmentation = enforceBoundary(twin, "sim-cip-f3-pack", "C-F3-PACK", "SW-F3");
    const hmi = assetById(twin, "HMI-F3");
    const interfaces = hmi?.cyber;
    const localAccess = interfaces?.removableStorage && proposal(
      "sim-cip-port", "Disable HMI service media", "software",
      "Remove the modeled removable media interface from the Filler 3 operator panel.",
      ["HMI-F3"], [{
        type: "patch_cyber", assetId: "HMI-F3",
        patch: { removableStorage: false, ports: interfaces.ports.filter((port) => !/usb|\b(?:sd|cf)\b/i.test(port)) },
      }],
    );
    const localControls = localAccess ? [...segmentation, localAccess] : segmentation;
    const combined = localControls.length > 1 ? [proposal(
      "sim-cip-controller", "Isolate controller access", "software",
      "Enforce the intercell boundary and remove the modeled HMI service-media exposure.",
      localControls.flatMap(({ targets }) => targets), localControls.flatMap(({ effects }) => effects),
    )] : [];
    return [
      proposal("sim-cip-isolate", "Isolate CIP branch", "physical",
        "Represent positive physical segregation of the CIP and product circuits in the twin.",
        [VALVE, FILLER], [{ type: "remove_connection", assetId: VALVE, to: FILLER, medium: "cip" }]),
      ...localControls,
      ...combined,
      ...removeRemoteAccess("sim-cip-remote", unenrolledRemoteEndpoints(twin, CONTROLLERS)),
    ];
  },
};
