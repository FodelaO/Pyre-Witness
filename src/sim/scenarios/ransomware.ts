/** Availability tabletop for enterprise, site operations and separated production cells. */
import { applyEffect } from "@/twin/effects";
import type { AreaId } from "@/twin/types";
import type { ScenarioDefinition, StageDefinition } from "../types";
import { enforceBoundary, inspect, proposal, reachFrom, withoutBoundary } from "./evidence";

const CELLS: ReadonlyArray<{ area: AreaId; controller: string; equipment: string; conduit: string }> = [
  { area: "water_treatment", controller: "PLC-WT", equipment: "RO-101", conduit: "C-OPS-WATER" },
  { area: "syrup_room", controller: "PLC-SY", equipment: "P-203", conduit: "C-OPS-SYRUP" },
  { area: "blending", controller: "PLC-BL", equipment: "BL-301", conduit: "C-OPS-BLEND" },
  { area: "filler3", controller: "PLC-F3", equipment: "FIL-3", conduit: "C-OPS-F3" },
  { area: "packaging", controller: "PLC-PK", equipment: "PAL-3", conduit: "C-OPS-PACK" },
  { area: "utilities", controller: "PLC-UT", equipment: "P-402", conduit: "C-OPS-UTIL" },
];

export const ransomware: ScenarioDefinition = {
  id: "ransomware",
  label: "Site Ransomware",
  stages(twin) {
    const { context, graph } = inspect(twin);
    const portable = twin.assets.filter((asset) =>
      asset.physical.kind === "laptop" && asset.network.level <= 3 && context.isNetworked(asset),
    );
    const enterprise = context.assetById.get("IT-WS1") ?? twin.assets.find((asset) => asset.network.level === 4);
    const entries = portable.filter((asset) => asset.cyber?.managed === false);
    const origin = [...entries, ...(enterprise ? [enterprise] : [])].map((asset) => {
      const routes = reachFrom(graph, asset.id);
      const cells = CELLS.filter(({ controller }) => routes.has(controller));
      return { asset, routes, cells };
    }).sort((a, b) => b.cells.length - a.cells.length ||
      Number(b.routes.has("SCADA-03")) - Number(a.routes.has("SCADA-03")))[0];
    const hasViewLoss = origin?.routes.has("SCADA-03") ?? false;
    const boundary = ["C-ENT-DMZ", "C-DMZ-OPS"].map((id) => context.conduitById.get(id))
      .find((conduit) => conduit && context.isEnforced(conduit));
    const managed = portable.find((asset) => {
      if (asset.cyber?.managed !== true) return false;
      const reach = reachFrom(graph, asset.id);
      return reach.has("SCADA-03") || CELLS.some(({ controller }) => reach.has(controller));
    });
    const stopped = (origin?.cells ?? []).sort((a, b) =>
      (origin?.routes.get(a.controller)?.length ?? 0) - (origin?.routes.get(b.controller)?.length ?? 0),
    );
    if (managed && !hasViewLoss && stopped.length === 0) {
      return [{
        t: 0, title: "Transient admission checked", where: [managed.id], technique: "T0864",
        control: {
          label: `${managed.id} managed admission`, where: [managed.id], holds: () => true,
          without: (current) => applyEffect(current, { type: "patch_cyber", assetId: managed.id, patch: { managed: false } }),
        },
      }];
    }
    const activeBoundary = origin?.asset === enterprise ? boundary : undefined;
    const defense = activeBoundary?.enforcedBy;
    const stages: StageDefinition[] = [
      {
        t: 0, title: "Endpoint availability lost", where: [origin?.asset.id ?? "corporate_office"],
        control: { label: "No modeled entry endpoint", holds: () => !origin },
        ...(origin?.asset.physical.kind === "laptop" ? { technique: "T0864" } : {}),
        effects: { assets: origin ? { [origin.asset.id]: { status: "alarm" } } : {} },
      },
      {
        t: 8, title: hasViewLoss ? "Site supervision unavailable"
          : stopped.length ? "Local cell availability affected" : "OT availability checked",
        where: [hasViewLoss ? "SCADA-03" : stopped[0]?.controller ?? defense ?? "SW-OT"],
        ...(hasViewLoss ? { technique: "T0829" } : {}),
        control: {
          label: activeBoundary ? `${defense} · ${activeBoundary.id}` : "Site isolation", where: [defense ?? "SW-OT"],
          holds: () => !hasViewLoss && !stopped.length,
          ...(activeBoundary ? { without: (current) => withoutBoundary(current, activeBoundary.id) } : {}),
        },
        effects: hasViewLoss ? {
          assets: { "SCADA-03": { status: "alarm" }, "HIST-03": { status: "alarm" } },
          areas: { control_room: "alarm" },
        } : undefined,
      },
    ];

    if (!stopped.length) {
      const cellBoundary = hasViewLoss && origin ? CELLS.map(({ conduit, controller }) => ({
        boundary: context.conduitById.get(conduit), controller,
      })).find(({ boundary, controller }) => boundary && context.isEnforced(boundary) &&
        reachFrom(inspect(withoutBoundary(twin, boundary.id)).graph, origin.asset.id).has(controller))?.boundary : undefined;
      return [...stages, {
        t: 14, title: "Production cells remain available", where: ["SW-OT"],
        control: {
          label: cellBoundary ? `${cellBoundary.enforcedBy} · ${cellBoundary.id}` : "Production cell isolation",
          where: [cellBoundary?.enforcedBy ?? "SW-OT"], holds: () => true,
          ...(cellBoundary ? { without: (current) => withoutBoundary(current, cellBoundary.id) } : {}),
        },
      }];
    }

    const cells = stopped.map(({ area, controller, equipment }, index): StageDefinition => ({
      t: 14 + index * 6,
      title: `${controller} unavailable · cell stopped`,
      where: [controller, equipment],
      technique: "T0827",
      effects: {
        assets: {
          [controller]: { status: "alarm" },
          [equipment]: { status: "alarm", running: false },
        },
        areas: { [area]: "alarm" },
      },
    }));
    return [...stages, ...cells];
  },
  consequence(_twin, stages) {
    const advanced = stages.filter((stage) => stage.outcome === "advanced");
    const areasStopped = advanced.filter((stage) => stage.technique === "T0827").length;
    const lostView = advanced.some((stage) => stage.technique === "T0829");
    return {
      summary: `${areasStopped} production ${areasStopped === 1 ? "area" : "areas"} stopped · site view ${lostView ? "lost" : "held"}`,
      metrics: { areasStopped, lostView },
    };
  },
  mitigations(twin) {
    const { context } = inspect(twin);
    const portables = twin.assets.filter((asset) => asset.physical.kind === "laptop" && asset.network.level <= 3 &&
      asset.cyber?.managed === false && context.isNetworked(asset));
    const admission = portables.length ? [proposal(
      "sim-ransomware-management", "Require managed devices", "software",
      "Credit managed maintenance admission for the explicitly unmanaged laptops in this twin.",
      portables.map((asset) => asset.id),
      portables.map((asset) => ({ type: "patch_cyber", assetId: asset.id, patch: { managed: true } })),
    )] : [];
    const addedPortables = portables.filter((asset) => asset.origin === "added");
    const removal = addedPortables.length ? [proposal(
      "sim-ransomware-disconnect", "Disconnect transient laptops", "physical",
      "Remove the newly placed unmanaged maintenance endpoints from the modeled OT plant.",
      addedPortables.map((asset) => asset.id), addedPortables.map((asset) => ({ type: "remove_asset", assetId: asset.id })),
    )] : [];
    return [
      ...admission,
      ...removal,
      ...["C-ENT-DMZ", "C-DMZ-OPS"].flatMap((id) => enforceBoundary(twin, `sim-ransomware-${id}`, id, "FW-DMZ")),
      ...CELLS.flatMap(({ conduit }) => enforceBoundary(twin, `sim-ransomware-${conduit}`, conduit, "SW-OT")),
      ...enforceBoundary(twin, "sim-ransomware-C-F3-PACK", "C-F3-PACK", "SW-F3"),
    ];
  },
};
