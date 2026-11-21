/** Validates and measures defensive effects against the current simulated twin. */
import { areaId, level, radio } from "@/gemini/schemas";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { areaCenter, areasAt } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import { z } from "zod";

const id = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(320);

export const watchNoteEffectSchema = z.object({ type: z.literal("note"), text });

export const watchEffectSchema = z.union([
  z.object({
    type: z.literal("move_asset"), assetId: id, area: areaId, level, networkArea: id, conduit: id.nullable(),
  }),
  z.object({ type: z.literal("disable_radio"), assetId: id, radio }),
  z.object({
    type: z.literal("patch_cyber"), assetId: id,
    patch: z.strictObject({ remoteAccess: z.boolean().optional(), cloudConnected: z.boolean().optional() })
      .refine(({ remoteAccess, cloudConnected }) => remoteAccess !== true && cloudConnected !== true),
  }),
  z.object({ type: z.literal("remove_connection"), assetId: id, to: id, medium: z.literal("network") }),
  z.object({ type: z.literal("enforce_conduit"), conduitId: id, enforcedBy: id, allows: z.array(text).max(12) }),
  z.object({ type: z.literal("add_protection"), assetId: id, protection: id }),
  watchNoteEffectSchema,
]);

type Effect = z.infer<typeof watchEffectSchema>;

function validateMove(effect: Extract<Effect, { type: "move_asset" }>, asset: Asset, twin: Twin): boolean {
  const area = twin.areas.find(({ id }) => id === effect.area);
  const zone = twin.assets.some(({ network }) => network.area === effect.networkArea && network.level === effect.level);
  if (!area || !zone) return false;
  const conduit = twin.conduits.find(({ id }) => id === effect.conduit);
  if (effect.conduit !== null && (!conduit || ![conduit.from, conduit.to].includes(effect.networkArea))) return false;
  if (area.id === asset.physical.area) return true;
  const center = areaCenter(area);
  if (area.kind === "context" || areasAt(twin, center.x, center.y)
    .some(({ attrs }) => attrs.hazard || attrs.washdown || attrs.publicAccess)) return false;
  const fixed = asset.safetyCritical || asset.physical.connections.some(({ medium }) => medium !== "network")
    || twin.assets.some(({ physical }) => physical.connections.some(({ to, medium }) => to === asset.id && medium !== "network"));
  return !fixed;
}

export function effectTargets(effect: Effect, twin: Twin, affected: string[]): string[] | null {
  if (effect.type === "note") return affected;
  if (effect.type === "enforce_conduit") {
    const conduit = twin.conduits.find(({ id }) => id === effect.conduitId);
    const enforcer = twin.assets.find(({ id }) => id === effect.enforcedBy);
    if (!conduit || !enforcer || !["firewall", "network_switch"].includes(enforcer.physical.kind)) return null;
    const endpoints = [conduit.from, conduit.to];
    const relevant = twin.assets.some(({ id, network }) => affected.includes(id)
      && (id === conduit.enforcedBy || network.conduit === conduit.id || endpoints.includes(network.area)));
    return relevant && (endpoints.includes(enforcer.network.area) || conduit.enforcedBy === enforcer.id)
      && effect.allows.every((allow) => conduit.allows.includes(allow)) ? [conduit.id, enforcer.id] : null;
  }

  const asset = twin.assets.find(({ id }) => id === effect.assetId);
  if (!asset) return null;
  if (effect.type === "remove_connection") {
    const connected = twin.assets.some(({ id }) => id === effect.to)
      && asset.physical.connections.some(({ to, medium }) => to === effect.to && medium === "network");
    return connected && (affected.includes(asset.id) || affected.includes(effect.to)) ? [asset.id, effect.to] : null;
  }
  if (!affected.includes(asset.id)) return null;
  if (effect.type === "move_asset") return validateMove(effect, asset, twin) ? [asset.id, effect.area] : null;
  if (effect.type === "disable_radio") return asset.cyber?.radios.includes(effect.radio) ? [asset.id] : null;
  if (effect.type === "add_protection") return asset.protections?.includes(effect.protection) ? null : [asset.id];
  const { remoteAccess, cloudConnected } = effect.patch;
  if (remoteAccess === true || cloudConnected === true) return null;
  return (remoteAccess === false && asset.cyber?.remoteAccess) || (cloudConnected === false && asset.cyber?.cloudConnected)
    ? [asset.id] : null;
}

export function measureWatchEffects(twin: Twin, effects: Effect[], baselineScore: number): number {
  return Math.round((evaluateTwin(applyEffects(twin, effects)).score - baselineScore) * 100) / 100;
}
