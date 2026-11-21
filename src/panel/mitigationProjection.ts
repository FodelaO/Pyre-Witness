/** Scores proposed effects against the current twin and detects resolved proposals. */
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { assetById } from "@/twin/geometry";
import type { Mitigation, Twin } from "@/twin/types";

function sameRows<T>(before: readonly T[], after: readonly T[]): boolean {
  return before === after || (before.length === after.length && before.every((row, i) =>
    row === after[i] || JSON.stringify(row) === JSON.stringify(after[i])));
}

export function projectMitigation(twin: Twin, item: Mitigation, score: number) {
  const effects = item.effects.filter(({ type }) => type !== "note");
  if (!effects.length) return { delta: 0, resolved: null };

  const after = applyEffects(twin, effects);
  const same = sameRows(twin.assets, after.assets) && sameRows(twin.areas, after.areas) && sameRows(twin.conduits, after.conduits);
  const delta = same ? 0 : evaluateTwin(after).score - score;
  const atDestination = effects.every((effect) => {
    if (effect.type !== "move_asset") return false;
    const asset = assetById(twin, effect.assetId);
    return asset?.placement === "recommended" && asset.physical.area === effect.area
      && asset.network.level === effect.level && asset.network.area === effect.networkArea && asset.network.conduit === effect.conduit;
  });

  if (atDestination && delta === 0) return { delta, resolved: "Already resolved by the move." };
  return { delta, resolved: same ? "Already resolved in the current twin." : null };
}
