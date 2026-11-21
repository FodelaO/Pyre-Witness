// Stores held-out launch metadata and atomic receipts in the ignored evaluation ledger.
import { randomUUID } from "node:crypto";
import { link, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { json, readJson, RUNS_ROOT, writeAtomic, type ArtifactMap, type Cached } from "../cache";
import type { EvaluationReport } from "../report";
import type { EvaluationItem } from "../types";
import type { BaselineAudit } from "./contract";

export const HELDOUT_RUNS_ROOT = path.join(RUNS_ROOT, "heldout");

export interface HeldoutManifest {
  version: 1;
  label: string;
  startedAt: string;
  datasetRoot: string;
  datasetFingerprint: string;
  pipelineFingerprint: string;
  configFingerprint: string;
  available: number;
  limit?: number;
  warnings: string[];
  concurrency: number;
  models: EvaluationReport["models"];
  thinking: EvaluationReport["thinking"];
  baseline: BaselineAudit;
  items: { item: EvaluationItem; fingerprint: string }[];
}

type Kind = "baseline" | "system" | "judge";
type Receipt<K extends Kind> = Cached<ArtifactMap[K]> & { finishedAt: string };

function manifestFile(label: string) {
  return path.join(HELDOUT_RUNS_ROOT, label, "manifest.json");
}

export async function findRun(label?: string) {
  if (label !== undefined) {
    const manifest = await readJson<HeldoutManifest>(manifestFile(label));
    if (manifest?.version === 1 && manifest.label === label) return manifest;
    throw new Error(`Held-out run "${label}" was not found.`);
  }

  const entries = await readdir(HELDOUT_RUNS_ROOT, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const manifests = await Promise.all(entries.filter((entry) => entry.isDirectory())
    .map(({ name }) => readJson<HeldoutManifest>(manifestFile(name))));
  const latest = manifests.filter((manifest): manifest is HeldoutManifest => manifest !== null && manifest.version === 1)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!latest) throw new Error("No saved held-out run was found.");
  return latest;
}

export async function createRun(manifest: HeldoutManifest) {
  await mkdir(HELDOUT_RUNS_ROOT, { recursive: true });
  try {
    await mkdir(path.join(HELDOUT_RUNS_ROOT, manifest.label));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Held-out run "${manifest.label}" already exists. Use --resume or choose a new label.`);
    }
    throw error;
  }
  await writeAtomic(manifestFile(manifest.label), json(manifest));
}

export function ledger(manifest: HeldoutManifest) {
  const file = (id: string, kind: Kind) => path.join(HELDOUT_RUNS_ROOT, manifest.label, `${id}.${kind}.json`);

  async function read<K extends Kind>(id: string, kind: K, fingerprint: string) {
    const saved = await readJson<Receipt<K>>(file(id, kind));
    if (saved && saved.fingerprint !== fingerprint) throw new Error(`Saved ${kind} receipt fingerprint differs for ${id}.`);
    return saved;
  }

  async function save<K extends Kind>(id: string, kind: K, fingerprint: string, artifact: ArtifactMap[K]) {
    const destination = file(id, kind);
    const temp = `${destination}.${randomUUID()}.pending`;
    const receipt: Receipt<K> = { fingerprint, artifact, finishedAt: new Date().toISOString() };
    try {
      await writeAtomic(temp, json(receipt));
      await link(temp, destination);
      return receipt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const saved = await read(id, kind, fingerprint);
      if (!saved) throw new Error(`Could not read the concurrent ${kind} receipt for ${id}.`);
      return saved;
    } finally {
      await rm(temp, { force: true });
    }
  }

  return { read, save };
}
