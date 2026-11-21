/** Retrieves immutable baseline receipts from a named evaluation run. */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { readJson, RUNS_ROOT, type Cached, type Manifest } from "./cache";
import type { RunArtifact } from "./types";

export async function openBaselineSource(label: string, itemIds: readonly string[], model: string) {
  const directories = (await readdir(RUNS_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map(({ name }) => name).sort();
  const donors: { id: string; manifest: Manifest }[] = [];
  for (const id of directories) {
    const manifest = await readJson<Manifest>(path.join(RUNS_ROOT, id, "manifest.json"));
    if (manifest?.version === 1 && manifest.label === label && manifest.sides.includes("baseline")) donors.push({ id, manifest });
  }
  const first = donors[0];
  if (!first || first.manifest.models?.baseline !== model) throw new Error(`No compatible baseline model receipt for ${label}.`);
  const compatible = donors.filter(({ manifest }) => manifest.fingerprint === first.manifest.fingerprint);
  const receipts = new Map<string, Cached<RunArtifact>>();
  for (const itemId of itemIds) {
    for (const { id } of compatible) {
      const saved = await readJson<Cached<RunArtifact>>(path.join(RUNS_ROOT, id, `${itemId}.baseline.json`));
      if (!saved?.artifact) continue;
      receipts.set(itemId, { ...saved, reusedFrom: saved.reusedFrom ?? id });
      break;
    }
    if (!receipts.has(itemId)) throw new Error(`No saved ${label} baseline receipt for ${itemId}.`);
  }
  return { receipts, contract: first.manifest.baselineContract ?? "original-output-v1" };
}
