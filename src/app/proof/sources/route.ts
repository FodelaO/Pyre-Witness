/** Exposes the benchmark's existing image credits and source notes. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DATASET_ROOT } from "../../../../eval/dataset";

export async function GET() {
  const sources = await readFile(path.join(DATASET_ROOT, "SOURCES.md"), "utf8");
  return new Response(sources, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
