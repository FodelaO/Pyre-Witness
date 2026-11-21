/**
 * Applies human-approved mitigation effects to the twin. Pure and immutable: returns a new Twin.
 */
import type { Asset, CyberProfile, MitigationEffect, Twin } from "./types";

const BLANK_CYBER: CyberProfile = {
  radios: [],
  ports: [],
  removableStorage: false,
  cloudConnected: false,
  defaultCredentials: false,
  remoteAccess: false,
  managed: false,
};

function mapAsset(twin: Twin, id: string, fn: (asset: Asset) => Asset): Twin {
  return { ...twin, assets: twin.assets.map((a) => (a.id === id ? fn(a) : a)) };
}

export function applyEffect(twin: Twin, effect: MitigationEffect): Twin {
  switch (effect.type) {
    case "move_asset": {
      const target = twin.areas.find((area) => area.id === effect.area);
      return mapAsset(twin, effect.assetId, (a) => {
        // Without explicit coordinates a move into another area lands at that area's centre, so
        // the drawn position, RF distances and areasAt() never disagree with physical.area.
        const changedArea = a.physical.area !== effect.area;
        const fallback =
          changedArea && target
            ? { x: target.bounds.x + target.bounds.w / 2, y: target.bounds.y + target.bounds.h / 2 }
            : { x: a.physical.x, y: a.physical.y };
        return {
          ...a,
          physical: { ...a.physical, area: effect.area, x: effect.x ?? fallback.x, y: effect.y ?? fallback.y },
          network: { ...a.network, level: effect.level, area: effect.networkArea, conduit: effect.conduit },
        };
      });
    }
    case "disable_radio":
      return mapAsset(twin, effect.assetId, (a) =>
        a.cyber ? { ...a, cyber: { ...a.cyber, radios: a.cyber.radios.filter((r) => r !== effect.radio) } } : a,
      );
    case "patch_cyber":
      return mapAsset(twin, effect.assetId, (a) => ({ ...a, cyber: { ...(a.cyber ?? BLANK_CYBER), ...effect.patch } }));
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
        // A conduit can no longer be enforced by a device that is gone.
        conduits: twin.conduits.map((c) => (c.enforcedBy === effect.assetId ? { ...c, enforcedBy: null } : c)),
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
    case "add_protection":
      return mapAsset(twin, effect.assetId, (a) =>
        a.protections?.includes(effect.protection)
          ? a
          : { ...a, protections: [...(a.protections ?? []), effect.protection] },
      );
    case "note":
      return twin;
  }
}

export function applyEffects(twin: Twin, effects: MitigationEffect[]): Twin {
  return effects.reduce(applyEffect, twin);
}
