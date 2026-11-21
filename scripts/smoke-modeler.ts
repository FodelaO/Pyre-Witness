/** Runs the real modeler against local files and writes the proposal as JSON. */
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { inspectFiles, ModelerError } from "@/modeler/limits";
import { ingestModel } from "@/modeler/ingest";
import { readModelContext } from "@/modeler/request";
import type { ModelEvent } from "@/modeler/types";

async function main(paths: string[]) {
  const files = await Promise.all(paths.map(async (path) => ({ name: basename(path), type: "", size: (await stat(path)).size })));
  inspectFiles(files);
  const blobs = await Promise.all(paths.map(async (path, index) => new File([await readFile(path)], files[index].name)));
  const start = performance.now();
  function progress(event: ModelEvent) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const status = event.type === "extraction.done" ? ` · ${event.items.length} items`
      : event.type === "gate.done" ? ` · ${event.source.kind}${event.reason ? ` · ${event.reason}` : ""}` : "";
    process.stderr.write(`[${elapsed}s] ${event.type}${status}\n`);
  }
  const proposal = await ingestModel(blobs, readModelContext(), progress, AbortSignal.timeout(180_000));
  console.log(JSON.stringify(proposal, null, 2));
}

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error("Usage: npx tsx --env-file=.env scripts/smoke-modeler.ts <file> [<photo> ...]");
  process.exitCode = 1;
} else {
  void main(paths).catch((error: unknown) => {
    console.error(error instanceof ModelerError ? error.message : "Smoke test could not read the files or exceeded its deadline.");
    process.exitCode = 1;
  });
}
