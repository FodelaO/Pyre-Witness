/** Runs the same watch headlessly for cron, optionally with an exported twin JSON. */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_TWIN } from "../src/twin/seed";
import { runWatch } from "../src/watch/run";
import { parseWatchTwin } from "../src/watch/snapshot";

async function main() {
  const file = process.argv[2];
  const twin = file ? parseWatchTwin(JSON.parse(await readFile(file, "utf8"))) : SEED_TWIN;
  const report = await runWatch(twin, (event) => {
    if (event.type === "stage") console.log(`${event.stage.name} · ${event.stage.state} · ${event.stage.detail} (${event.stage.ms} ms)`);
  });
  const directory = join(process.cwd(), "watch", "reports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${report.date}.json`);
  const temporary = join(directory, `.${report.date}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Watch report saved to ${path}`);
  if (report.stages.some(({ state }) => state === "failed")) process.exitCode = 1;
}

void main().catch(() => {
  console.error("Daily watch could not read the twin or write the report.");
  process.exitCode = 1;
});
