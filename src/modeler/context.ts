/** Projects just the current layout, labels and network coordinates needed for reconciliation. */
import type { Asset, Twin } from "@/twin/types";

export function modelTwinContext(twin: Twin) {
  return {
    areas: twin.areas.map(({ id, name, kind, bounds, attrs, typicalLevels, status }) =>
      ({ id, name, kind, bounds, attrs, typicalLevels, status })),
    assets: twin.assets.map(({ id, name, physical, network }) => ({
      id,
      name,
      physical: {
        ...physical,
        connections: physical.connections.map(({ to, medium }) => ({ to, medium })),
      },
      network: { level: network.level, area: network.area, conduit: network.conduit },
    })),
    conduitIds: twin.conduits.map(({ id }) => id),
    entryIds: twin.entryPoints.map(({ id }) => id),
  };
}

export interface PreparedContext {
  twin: Twin;
  reservedIds: ReadonlySet<string>;
}

export function reconciliationContext(twin: Twin) {
  return {
    area_columns: ["id", "name", "Purdue levels"],
    areas: twin.areas.filter(({ kind }) => kind !== "context").map(({ id, name, typicalLevels }) => [id, name, typicalLevels]),
    asset_columns: ["id", "name", "kind", "area", "x", "y", "level", "zone"],
    assets: twin.assets.map(({ id, name, physical, network }: Asset) =>
      [id, name, physical.kind, physical.area, physical.x, physical.y, network.level, network.area]),
  };
}
