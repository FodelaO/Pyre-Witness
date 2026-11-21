/** Rechecks approved changes against the current twin before any browser mutation. */
import { assetById } from "@/twin/geometry";
import type { Asset, Connection, Twin } from "@/twin/types";
import { referenceKey } from "./observations";
import { hasZone, stillFits } from "./placement";
import type { ModelDrop, ModelProposal, ModelUpdate } from "./types";

interface ApprovedChange<T> {
  itemId: string;
  change: T;
}

export function planAccepted(twin: Twin, proposal: ModelProposal, accepted: ReadonlySet<string>) {
  const additions: ApprovedChange<Asset>[] = [];
  const updates: ApprovedChange<ModelUpdate>[] = [];
  const matches: string[] = [];
  const issues: ModelDrop[] = [];
  const reserved = new Set([...twin.assets, ...twin.entryPoints, ...twin.conduits].map(({ id }) => referenceKey(id)));
  const placementTwin = { ...twin, assets: [...twin.assets] };

  for (const item of proposal.items) {
    const { id: itemId, outcome } = item;
    if (!accepted.has(itemId) || outcome.action === "unplaced") continue;
    const { assetId } = outcome;
    if (outcome.action === "new_asset") {
      const asset = proposal.additions.find(({ id }) => id === assetId);
      if (!asset || reserved.has(referenceKey(asset.id)) || !stillFits(placementTwin, asset)
        || !hasZone(placementTwin, asset.physical.area, asset.network.level, asset.network.area)) {
        issues.push({ itemId, reason: `${item.label}: the preview no longer fits the current twin.` });
        continue;
      }
      additions.push({ itemId, change: asset });
      placementTwin.assets.push(asset);
      reserved.add(referenceKey(asset.id));
      continue;
    }

    const asset = assetById(twin, assetId);
    const update = proposal.updates.find((candidate) => candidate.assetId === assetId);
    if (!asset || asset.physical.kind !== item.kind || (outcome.action === "update_existing"
      && (!update || asset.name !== update.beforeName || asset.physical.kind !== update.beforeKind))) {
      issues.push({ itemId, reason: `${item.label}: the matched asset changed since the preview.` });
      continue;
    }
    if (outcome.action === "update_existing" && update) updates.push({ itemId, change: update });
    else matches.push(itemId);
  }

  const ids = new Set(placementTwin.assets.map(({ id }) => id));
  function availableLinks(itemId: string, links: Connection[]) {
    return links.filter((link) => {
      if (ids.has(link.to)) return true;
      issues.push({ itemId, reason: `Connection to ${link.to} skipped. The target is outside the current and approved assets.` });
      return false;
    });
  }
  return {
    additions: additions.map(({ itemId, change }) => ({
      itemId, change: { ...change, physical: { ...change.physical, connections: availableLinks(itemId, change.physical.connections) } },
    })),
    updates: updates.flatMap(({ itemId, change }) => {
      const connections = availableLinks(itemId, change.connections);
      return change.name || connections.length ? [{ itemId, change: { ...change, connections } }] : [];
    }),
    matches,
    issues,
  };
}

export function withAddedLinks(asset: Asset, links: Connection[]): Asset {
  const known = new Set(asset.physical.connections.map(({ to, medium }) => `${to}:${medium}`));
  const connections = [...asset.physical.connections, ...links.filter(({ to, medium }) => !known.has(`${to}:${medium}`))];
  return { ...asset, physical: { ...asset.physical, connections } };
}
