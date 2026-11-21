// Records real browser interactions and retains successful source takes for later cuts.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, DRY_CAPTURE, openApp } from "./lib/app.mjs";
import { launch } from "./lib/browser.mjs";
import { installCursor, makeCursor } from "./lib/cursor.mjs";
import { encodeFrames, startScreencast } from "./lib/recorder.mjs";
import { CAPTURE_GROUP, RECORD_ORDER, TAKE_REVISION } from "./shots/index.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const SHOTS = join(DEMO, "out", "shots");
const MANIFEST = join(DEMO, "out", BASE_URL === "http://localhost:4120" ? "manifest.json" : "manifest-rehearsal.json");
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", dateStyle: "short" });
export const buildMarker = () => readFileSync(join(DEMO, "..", ".agents", "demo-build-live"), "utf8").trim();

export async function loadShot(id) {
  return (await import(new URL(`./shots/${id}.mjs`, import.meta.url))).default;
}

export function readManifest() {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { shots: {} };
}

export function usableTake(take) {
  return take?.status === "recorded" && take.revision === TAKE_REVISION
    && take.url === BASE_URL && existsSync(take.file) && day.format(new Date(take.recordedAt)) === day.format(new Date());
}

function saveManifest(manifest) {
  const staging = MANIFEST + "." + process.pid + ".tmp";
  writeFileSync(staging, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(staging, MANIFEST);
}

export async function record({ only = [], withCapture = false } = {}) {
  const unknown = only.filter((id) => !RECORD_ORDER.includes(id));
  if (unknown.length) throw new Error(`Unknown shots: ${unknown.join(", ")}`);
  if (only.some((id) => CAPTURE_GROUP.includes(id)) && !withCapture && !DRY_CAPTURE) {
    throw new Error("A new capture sequence requires --with-capture");
  }
  if (withCapture && only.length && !only.some((id) => CAPTURE_GROUP.includes(id))) {
    throw new Error("--with-capture requires the capture sequence");
  }

  const manifest = readManifest();
  const ids = RECORD_ORDER.filter((id) => {
    if (DRY_CAPTURE) return id === "capture";
    if (CAPTURE_GROUP.includes(id)) return withCapture;
    return !only.length || only.includes(id);
  });
  if (!DRY_CAPTURE && !withCapture && !usableTake(manifest.shots.capture)) {
    throw new Error("No verified light-theme 3D capture from today. Use --with-capture for one real run.");
  }

  mkdirSync(SHOTS, { recursive: true });
  const dir = mkdtempSync(join(SHOTS, "take-"));
  const batch = basename(dir);
  const build = BASE_URL === "http://localhost:4120" ? buildMarker() : null;
  const browser = await launch();
  const log = (message) => console.log(message);
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "light" });
    await installCursor(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => log(`  Browser error: ${error.message.slice(0, 200)}`));
    await openApp(page);
    const cursor = makeCursor(page, log);
    for (const id of ids) {
      const shot = await loadShot(id);
      const marks = [];
      const mark = (name, data) => marks.push({ name, wall: Date.now() / 1000, data });
      const ctx = { page, cursor, log, mark, dir };
      const framesDir = join(dir, `${id}-frames`);
      let target = page;
      let cast;
      log(`● ${id}`);
      try {
        if (build && buildMarker() !== build) throw new Error("Port 4120 build changed during recording");
        target = (await shot.prepare?.(ctx)) ?? page;
        if (DRY_CAPTURE) {
          await shot.run(ctx);
          await page.screenshot({ path: join(dir, "capture-rehearsal.png") });
          log(`  Stopped before Analyze. Screenshot: ${join(dir, "capture-rehearsal.png")}`);
          continue;
        }

        cast = await startScreencast(target, framesDir);
        await shot.run({ ...ctx, page: target });
        const result = await cast.stop();
        cast = undefined;
        const file = join(dir, `${id}.mp4`);
        const stats = await encodeFrames(result, framesDir, file);
        const rawStart = result.frames[0].t;
        const start = Math.abs(rawStart - result.startedAt) < 120 ? rawStart : result.startedAt;
        const rel = marks.map(({ wall, ...rest }) => ({ ...rest, t: Number((wall - start).toFixed(3)) }));
        manifest.shots[id] = { status: "recorded", url: BASE_URL, file, batch, build,
          revision: TAKE_REVISION, recordedAt: new Date().toISOString(), ...stats, marks: rel };
        saveManifest(manifest);
        log(`  ${stats.seconds} s raw at ${stats.avgFps} fps. ${rel.map(({ name, t }) => `${name}@${t}`).join(" ")}`);
      } catch (error) {
        if (!shot.optional) throw new Error(`${id}: ${error.message.split("\n")[0]}`, { cause: error });
        manifest.shots[id] = { status: "skipped", batch, reason: error.message.split("\n")[0] };
        saveManifest(manifest);
        log(`  Optional handset shot skipped: ${manifest.shots[id].reason}`);
      } finally {
        await cast?.stop().catch(() => {});
        if (target !== page) {
          await target.close().catch(() => {});
          await page.bringToFront();
        }
        rmSync(framesDir, { recursive: true, force: true });
      }
    }
    if (build && buildMarker() !== build) throw new Error("Port 4120 build changed during recording");
  } finally {
    await browser.close();
  }
  return manifest;
}

export function parseArgs(argv) {
  const only = [];
  argv.forEach((arg, i) => { if (arg === "--only" && argv[i + 1]) only.push(...argv[i + 1].split(",")); });
  return { only, withCapture: argv.includes("--with-capture"), noRecord: argv.includes("--no-record") };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await record(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`demo recording failed: ${error.message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}
