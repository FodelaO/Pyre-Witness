/** Stores atomic per-item artifacts and reuses compatible attempts on resume. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { JudgeArtifact, RunArtifact, Side } from "./types";

const RUNS_ROOT = path.join(process.cwd(), "eval", "runs");
export const REPORT_ROOT = path.join(process.cwd(), "eval", "report");

const SOURCE_DIRS = ["src/gemini", "src/pipeline/server", "src/rules", "src/link"];
const SOURCE_FILES = [
  "eval/baseline.ts", "eval/judge.ts", "eval/system.ts", "eval/prediction.ts", "eval/types.ts",
  "src/pipeline/assetFromProfile.ts", "src/pipeline/types.ts", "src/twin/dropPoint.ts", "src/twin/geometry.ts", "src/twin/types.ts",
  "src/twin/effects.ts", "src/equipment/types.ts", "src/data/attack-ics.ts", "package-lock.json",
];

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function sourceFingerprint(): Promise<string> {
  const files = [...SOURCE_FILES];
  for (const folder of SOURCE_DIRS) {
    const entries = await readdir(folder, { recursive: true, withFileTypes: true });
    files.push(...entries.filter((entry) => entry.isFile() && /(?<!\.test)\.ts$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name)));
  }
  return digest(await Promise.all(files.sort().map(async (file) => [file, await readFile(file, "utf8")])));
}

export async function writeAtomic(file: string, content: string) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, content, { encoding: "utf8", flag: "wx" });
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

interface Manifest {
  version: 1;
  fingerprint: string;
  itemIds: string[];
  sides: readonly Side[];
  startedAt: string;
}

type ArtifactMap = Record<Side, RunArtifact> & { judge: JudgeArtifact };
type ArtifactName = keyof ArtifactMap;

interface Cached<T> {
  fingerprint: string;
  artifact: T;
  reusedFrom?: string;
}

export async function openRun(fingerprint: string, itemIds: string[], sides: readonly Side[], resume: boolean) {
  await mkdir(RUNS_ROOT, { recursive: true });
  const previous: string[] = [];
  if (resume) {
    const entries = await readdir(RUNS_ROOT, { withFileTypes: true });
    const dirs = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name).sort().reverse();
    for (const dir of dirs) {
      const manifest = await readJson<Manifest>(path.join(RUNS_ROOT, dir, "manifest.json"));
      if (manifest?.version === 1 && manifest.fingerprint === fingerprint) previous.push(dir);
    }
  }

  const startedAt = new Date().toISOString();
  const directory = await mkdtemp(path.join(RUNS_ROOT, `${startedAt.replace(/[:.]/g, "-")}-`));
  const id = path.basename(directory);
  await writeAtomic(path.join(directory, "manifest.json"), json({ version: 1, fingerprint, itemIds, sides, startedAt } satisfies Manifest));

  function relativeFile(itemId: string, kind: ArtifactName) {
    return `${itemId}.${kind}.json`;
  }

  async function reuse<K extends ArtifactName>(itemId: string, kind: K, inputFingerprint: string): Promise<Cached<ArtifactMap[K]> | null> {
    const file = relativeFile(itemId, kind);
    for (const dir of previous) {
      const saved = await readJson<Cached<ArtifactMap[K]>>(path.join(RUNS_ROOT, dir, file));
      if (saved?.fingerprint === inputFingerprint && saved.artifact && !saved.artifact.error
        && !("status" in saved.artifact && saved.artifact.status === "error")) {
        return { ...saved, reusedFrom: saved.reusedFrom ?? dir };
      }
    }
    return null;
  }

  async function save<K extends ArtifactName>(itemId: string, kind: K, value: Cached<ArtifactMap[K]>) {
    await writeAtomic(path.join(directory, relativeFile(itemId, kind)), json(value));
  }

  return { id, directory, startedAt, reuse, save };
}
