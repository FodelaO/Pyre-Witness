/** Reads immutable attempts from one run label and admits only completed pairs to headline scoring. */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { PipelineEvent } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { digest, readJson, RUNS_ROOT, type ArtifactMap, type ArtifactName, type Cached, type Manifest } from "./cache";
import { observeObject } from "./objectEvidence";
import { modalityInput } from "./modality";
import type { EvaluatedItem, EvaluationItem, Side } from "./types";

async function listManifests(root: string) {
  const entries = await readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const manifests = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async ({ name }) => ({
    id: name, manifest: await readJson<Manifest>(path.join(root, name, "manifest.json")),
  })));
  return manifests.flatMap(({ id, manifest }) => manifest?.version === 1 ? [{ id, manifest }] : [])
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function readRunSnapshot(reference: string, items: readonly EvaluationItem[], root = RUNS_ROOT) {
  const manifests = await listManifests(root);
  const selected = manifests.find(({ id }) => id === reference)
    ?? manifests.findLast(({ manifest }) => manifest.label === reference);
  if (!selected) return null;
  const { id: attemptId, manifest } = selected;
  if (manifest.datasetFingerprint && digest(items) !== manifest.datasetFingerprint) {
    throw new Error(`Dataset labels or metadata changed since ${manifest.label ?? attemptId} was launched.`);
  }
  const ids = manifest.label ? manifests.filter((attempt) => attempt.manifest.label === manifest.label
    && attempt.manifest.fingerprint === manifest.fingerprint
    && digest(attempt.manifest.itemIds) === digest(manifest.itemIds)
    && digest(attempt.manifest.sides) === digest(manifest.sides)).map(({ id }) => id) : [selected.id];
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const attempts = { baseline: 0, system: 0 } satisfies Record<Side, number>;
  const completed: EvaluatedItem[] = [];
  const judgeCalls = [];
  let receipts = 0;
  let reused = 0;
  let lastArtifactMs = Date.parse(manifest.startedAt);

  async function artifact<K extends ArtifactName>(itemId: string, kind: K) {
    for (const id of ids) {
      const file = path.join(root, id, `${itemId}.${kind}.json`);
      const saved = await readJson<Cached<ArtifactMap[K]>>(file);
      if (saved?.artifact) {
        const info = await stat(file);
        lastArtifactMs = Math.max(lastArtifactMs, info.mtimeMs);
        receipts += 1;
        if (saved.reusedFrom || id !== attemptId) reused += 1;
        return saved;
      }
    }
  }

  const rows = await Promise.all(manifest.itemIds.map(async (id) => {
    const item = itemsById.get(id);
    if (!item) throw new Error(`Capture ${id} from the run manifest is missing from this dataset.`);
    const row: EvaluatedItem = { item, observations: {} };
    await Promise.all(manifest.sides.map(async (side) => {
      const saved = await artifact(id, side);
      if (saved) {
        attempts[side] += 1;
        const { artifact: observation } = saved;
        const gateEvidence = side === "system" && Array.isArray(observation.raw)
          ? (observation.raw as PipelineEvent[]).find((event) => event.type === "gate.done")?.gate.answers : undefined;
        row.observations[side] = { ...observation, gateEvidence,
          ...(manifest.objectAssessment ? { objectAssessment: observeObject(side, observation, item.expected.isDevice, SEED_TWIN) } : {}),
        };
        (row.captureFingerprints ??= {})[side] = saved.fingerprint;
      }
    }));
    row.judge = (await artifact(id, "judge"))?.artifact;
    if (manifest.modalityAblation && modalityInput(item)) row.ablation = (await artifact(id, "ablation"))?.artifact;
    return row;
  }));
  for (const row of rows) {
    if (row.judge) judgeCalls.push(row.judge.providerCalls);
    if (manifest.sides.every((side) => row.observations[side])) completed.push(row);
  }
  return { id: attemptId, manifest, completed, attempts, receipts, reused, judgeCalls, lastArtifactMs };
}
