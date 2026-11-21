/** Converts model suggestions into a checked proposal and reports unsupported references. */
import type { Asset, Connection } from "@/twin/types";
import type { PreparedContext } from "./context";
import { referenceKey } from "./observations";
import { modelPlacement } from "./placement";
import type { ModelDecision } from "./schemas";
import type { ModelDrop, ModelItem, ModelUpdate, ObservedItem } from "./types";

function identityMatches(item: ObservedItem, asset: Asset, candidates: Asset[]): boolean {
  if (item.kind !== asset.physical.kind) return false;
  if (item.tag) return referenceKey(item.tag) === referenceKey(asset.id);
  const label = referenceKey(item.label);
  return label === referenceKey(asset.name)
    && candidates.filter(({ name, physical }) => referenceKey(name) === label && physical.kind === item.kind).length === 1;
}

function referenceIndex(assets: Asset[], items: ModelItem[]) {
  const exact = new Map(assets.map(({ id }) => [referenceKey(id), id]));
  const labels = new Map<string, Set<string>>();
  function add(label: string, id: string) {
    const key = referenceKey(label);
    const matches = labels.get(key) ?? new Set<string>();
    matches.add(id);
    labels.set(key, matches);
  }
  for (const asset of assets) add(asset.name, asset.id);
  for (const item of items) {
    if (item.outcome.action === "unplaced") continue;
    const { assetId } = item.outcome;
    add(item.id, assetId);
    add(item.label, assetId);
    if (item.tag) add(item.tag, assetId);
  }
  return (ref: string): string | undefined => {
    const key = referenceKey(ref);
    const matches = labels.get(key);
    return exact.get(key) ?? (matches?.size === 1 ? [...matches][0] : undefined);
  };
}

function linkKey({ to, medium }: Connection) {
  return `${to}:${medium}`;
}

function checkedLinks(
  item: ModelItem,
  assetId: string,
  proposed: Connection[],
  resolve: (ref: string) => string | undefined,
  report: (reason: string) => void,
): Connection[] {
  const ground = new Set<string>();
  for (const link of item.connects_to) {
    const to = resolve(link.to);
    if (to && to !== assetId) ground.add(linkKey({ ...link, to }));
    else report(`Ignored unknown, ambiguous or self connection ${link.to}.`);
  }
  const checked = new Map<string, Connection>();
  for (const link of proposed) {
    const to = resolve(link.to);
    const key = to && linkKey({ ...link, to });
    if (to && key && ground.has(key)) checked.set(key, { to, medium: link.medium });
    else if (!item.connects_to.some((observed) => referenceKey(observed.to) === referenceKey(link.to) && observed.medium === link.medium)) {
      report(`Ignored connection without source evidence to ${link.to}.`);
    }
  }
  return [...checked.values()];
}

export function checkProposal(context: PreparedContext, observations: ObservedItem[], decisions: ModelDecision[], runId: string) {
  const { twin, reservedIds } = context;
  const existing = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const usedIds = new Set([...reservedIds].map(referenceKey));
  for (const { id } of twin.assets) usedIds.add(referenceKey(id));
  const selected = new Set<string>();
  const additions: Asset[] = [];
  const updates: ModelUpdate[] = [];
  const dropped: ModelDrop[] = [];
  const byItem = new Map<string, ModelDecision>();
  const observationIds = new Set(observations.map(({ id }) => id));

  for (const decision of decisions) {
    if (!observationIds.has(decision.item_id) || byItem.has(decision.item_id)) {
      dropped.push({ itemId: decision.item_id, reason: "Ignored unknown or repeated observation reference." });
    } else {
      byItem.set(decision.item_id, decision);
    }
  }

  const items: ModelItem[] = observations.map((item, index) => {
    const unplaced: ModelItem = { ...item, outcome: { action: "unplaced" } };
    const report = (reason: string) => dropped.push({ itemId: item.id, reason });
    const decision = byItem.get(item.id);
    if (!decision) {
      report("Gemini did not return a placement or match.");
      return unplaced;
    }
    if (decision.action !== "new_asset") {
      const asset = decision.asset_id ? existing.get(decision.asset_id) : undefined;
      if (!asset || !identityMatches(item, asset, twin.assets) || selected.has(asset.id)) {
        report(`Match lacks unique source evidence for ${decision.asset_id ?? "(missing asset ID)"}.`);
        return unplaced;
      }
      selected.add(asset.id);
      return { ...item, outcome: { action: decision.action, assetId: asset.id } };
    }

    let id = item.tag ? referenceKey(item.tag) : "";
    if (/^[A-Z0-9][A-Z0-9._-]{0,59}$/.test(id)) {
      if (usedIds.has(id)) {
        report(`Asset ID ${id} already exists or is reserved.`);
        return unplaced;
      }
    } else {
      const base = `MDL-${runId}-${index + 1}`;
      id = base;
      for (let suffix = 2; usedIds.has(referenceKey(id)); suffix += 1) id = `${base}-${suffix}`;
    }
    const asset = modelPlacement({ ...twin, assets: [...twin.assets, ...additions] }, item, decision, id, report);
    if (!asset) return unplaced;
    usedIds.add(referenceKey(id));
    additions.push(asset);
    return { ...item, outcome: { action: "new_asset", assetId: id } };
  });

  const resolve = referenceIndex([...twin.assets, ...additions], items);
  for (const item of items) {
    if (item.outcome.action === "unplaced") continue;
    const { action, assetId } = item.outcome;
    const report = (reason: string) => dropped.push({ itemId: item.id, reason });
    const decision = byItem.get(item.id);
    const connections = checkedLinks(item, assetId, decision?.connections ?? [], resolve, report);
    if (action === "new_asset") {
      const asset = additions.find(({ id }) => id === assetId);
      if (asset) asset.physical.connections = connections;
    }
    if (action !== "update_existing") continue;
    const asset = existing.get(assetId)!;
    const fields = decision?.fields ?? [];
    const existingLinks = new Set(asset.physical.connections.map(linkKey));
    const links = fields.includes("connections") ? connections.filter((link) => !existingLinks.has(linkKey(link))) : [];
    const name = fields.includes("name") && item.label !== asset.name ? item.label : undefined;
    if (name || links.length) {
      updates.push({ assetId, beforeName: asset.name, beforeKind: asset.physical.kind, name, connections: links });
    } else {
      item.outcome = { action: "match_existing", assetId };
    }
  }
  return { items, additions, updates, dropped };
}
