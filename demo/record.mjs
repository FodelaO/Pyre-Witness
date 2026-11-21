// Records each storyboard shot from the REAL running app (http://localhost:4119) with a CDP
// screencast. Each shot gets a fresh browser context, an unrecorded `setup` (real interactions
// that bring the app to the shot's starting state) and a recorded `run`.
//   node demo/record.mjs              record every shot
//   node demo/record.mjs --only risk  re-record one shot (repeatable: --only a --only b)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "./lib/browser.mjs";
import { installCursor, makeCursor } from "./lib/cursor.mjs";
import { encodeFrames, startScreencast } from "./lib/recorder.mjs";
import { MissingFeature } from "./lib/app.mjs";
import { SHOT_FILES } from "./shots/index.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(DEMO, "out");
const SHOTS_OUT = join(OUT, "shots");
const MANIFEST = join(OUT, "manifest.json");

export async function loadShots() {
  const shots = [];
  for (const f of SHOT_FILES) shots.push((await import(pathToFileURL(join(DEMO, "shots", f)).href)).default);
  return shots;
}

export async function record({ only = [] } = {}) {
  mkdirSync(SHOTS_OUT, { recursive: true });
  const shots = await loadShots();
  const unknown = only.filter((id) => !shots.some((s) => s.id === id));
  if (unknown.length) throw new Error(`unknown shot(s): ${unknown.join(", ")}; known: ${shots.map((s) => s.id).join(", ")}`);
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { shots: {} };
  const browser = await launch();
  try {
    for (const shot of shots) {
      if (only.length && !only.includes(shot.id)) continue;
      const log = (m) => console.log(m);
      console.log(`● ${shot.id}: ${shot.caption}`);
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" });
      await installCursor(context);
      const page = await context.newPage();
      page.on("pageerror", (e) => log(`  [page error] ${e.message.slice(0, 200)}`));
      const cursor = makeCursor(page, log);
      const ctx = { page, cursor, log };
      const dir = join(SHOTS_OUT, shot.id);
      try {
        await shot.setup(ctx);
        const cast = await startScreencast(page, join(dir, "frames"));
        await shot.run(ctx);
        const result = await cast.stop();
        const file = join(SHOTS_OUT, `${shot.id}.mp4`);
        const stats = await encodeFrames(result, join(dir, "frames"), file);
        await page.screenshot({ path: join(SHOTS_OUT, `${shot.id}-last.png`) });
        manifest.shots[shot.id] = { status: "recorded", file, ...stats, recordedAt: new Date().toISOString() };
        console.log(`  ok: ${stats.seconds}s raw, ${stats.frameCount} frames (${stats.avgFps} fps captured)`);
      } catch (err) {
        const reason = err instanceof MissingFeature ? err.message : `error: ${err.message.split("\n")[0]}`;
        manifest.shots[shot.id] = { status: "skipped", reason, recordedAt: new Date().toISOString() };
        console.log(`  SKIPPED ${shot.id}: ${reason}`);
        await page.screenshot({ path: join(SHOTS_OUT, `${shot.id}-failed.png`) }).catch(() => {});
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = [];
  process.argv.forEach((a, i) => { if (a === "--only" && process.argv[i + 1]) only.push(...process.argv[i + 1].split(",")); });
  const m = await record({ only });
  const skipped = Object.entries(m.shots).filter(([, s]) => s.status === "skipped");
  if (skipped.length) console.log(`skipped: ${skipped.map(([id, s]) => `${id} (${s.reason})`).join("; ")}`);
}
