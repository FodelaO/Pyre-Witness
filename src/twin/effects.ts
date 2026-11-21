/**
 * Applies human-approved mitigation effects to the twin. Pure and immutable: returns a new Twin.
 */
import type { Asset, MitigationEffect, Twin } from "./types";

function mapAsset(twin: Twin, id: string, fn: (asset: Asset) => Asset): Twin {
  return { ...twin, assets: twin.assets.map((a) => (a.id === id ? fn(a) : a)) };
}

export function applyEffect(twin: Twin, effect: MitigationEffect): Twin {
  switch (effect.type) {
    case "move_asset":
      return mapAsset(twin, effect.assetId, (a) => ({
        ...a,
        physical: {
          ...a.physical,
          area: effect.area,
          x: effect.x ?? a.physical.x,
          y: effect.y ?? a.physical.y,
        },
        network: { ...a.network, level: effect.level, area: effect.networkArea, conduit: effect.conduit },
      }));
    case "disable_radio":
      return mapAsset(twin, effect.assetId, (a) =>
        a.cyber ? { ...a, cyber: { ...a.cyber, radios: a.cyber.radios.filter((r) => r !== effect.radio) } } : a,
      );
    case "patch_cyber":
      return mapAsset(twin, effect.assetId, (a) =>
        a.cyber ? { ...a, cyber: { ...a.cyber, ...effect.patch } } : a,
      );
    case "remove_connection":
      return mapAsset(twin, effect.assetId, (a) => ({
        ...a,
        physical: {
          ...a.physical,
          connections: a.physical.connections.filter((c) => !(c.to === effect.to && c.medium === effect.medium)),
        },
      }));
    case "remove_asset":
      return {
        ...twin,
        assets: twin.assets
          .filter((a) => a.id !== effect.assetId)
          .map((a) => ({
            ...a,
            physical: {
              ...a.physical,
              connections: a.physical.connections.filter((c) => c.to !== effect.assetId),
            },
          })),
      };
    case "enforce_conduit":
      return {
        ...twin,
        conduits: twin.conduits.map((c) =>
          c.id === effect.conduitId ? { ...c, enforcedBy: effect.enforcedBy, allows: effect.allows } : c,
        ),
      };
    case "set_area_attr":
      return {
        ...twin,
        areas: twin.areas.map((a) => (a.id === effect.areaId ? { ...a, attrs: { ...a.attrs, ...effect.patch } } : a)),
      };
    case "note":
      return twin;
  }
}

export function applyEffects(twin: Twin, effects: MitigationEffect[]): Twin {
  return effects.reduce(applyEffect, twin);
}
