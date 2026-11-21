// Records the storyboard shots from the REAL running app (http://localhost:4119) in ONE browser
// session (state carries over between shots, like a person using the app), each shot captured
// with a CDP screencast. Per shot: `prepare` (unrecorded, idempotent), recorded `run` (which may
// drop timing marks), optional unrecorded `after`.
//   node demo/record.mjs                     cheap shots only; expensive (Gemini capture) shots reused
//   node demo/record.mjs --with-capture      everything, including ONE real capture
//   node demo/record.mjs --only lens,sim     just these shots (fresh session)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BASE_URL, MissingFeature, openApp } from "./lib/app.mjs";
import { launch } from "./lib/browser.mjs";
import { installCursor, makeCursor } from "./lib/cursor.mjs";
import { encodeFrames, startScreencast } from "./lib/recorder.mjs";
import { RECORD_ORDER } from "./shots/index.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(DEMO, "out");
const SHOTS_OUT = join(OUT, "shots");
const MANIFEST = join(OUT, "manifest.json");

export async function loadShot(id) {
  return (await import(pathToFileURL(join(DEMO, "shots", `${id}.mjs`)).href)).default;
}

export function readManifest() {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { shots: {} };
}

export async function record({ only = [], withCapture = false } = {}) {
  mkdirSync(SHOTS_OUT, { recursive: true });
  const unknown = only.filter((id) => !RECORD_ORDER.includes(id));
  if (unknown.length) throw new Error(`unknown shot(s): ${unknown.join(", ")}; known: ${RECORD_ORDER.join(", ")}`);
  const manifest = readManifest();
  const shots = [];
  for (const id of RECORD_ORDER) {
    const shot = await loadShot(id);
    if (only.length) { if (only.includes(id)) shots.push(shot); continue; }
    if (shot.expensive && !withCapture && manifest.shots[id]?.status === "recorded" && manifest.shots[id]?.url === BASE_URL) {
      console.log(`○ ${id}: reusing the recording from ${manifest.shots[id].recordedAt} (real Gemini run; pass --with-capture to redo)`);
      continue;
    }
    if (shot.expensive && !withCapture) {
      console.log(`○ ${id}: not recorded yet; it calls Gemini, so it needs --with-capture`);
      continue;
    }
    shots.push(shot);
  }
  if (!shots.length) return manifest;

  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" });
  await installCursor(context);
  const page = await context.newPage();
  const log = (m) => console.log(m);
  page.on("pageerror", (e) => log(`  [page error] ${e.message.slice(0, 200)}`));
  const cursor = makeCursor(page, log);
  try {
    await openApp(page);
    for (const shot of shots) {
      console.log(`● ${shot.id}`);
      const marks = [];
      const ctx = { page, cursor, log, mark: (name, data) => marks.push({ name, wall: Date.now() / 1000, data }) };
      const dir = join(SHOTS_OUT, shot.id);
      try {
        await shot.prepare?.(ctx);
        const cast = await startScreencast(page, join(dir, "frames"));
        await shot.run(ctx);
        const result = await cast.stop();
        const file = join(SHOTS_OUT, `${shot.id}.mp4`);
        const stats = await encodeFrames(result, join(dir, "frames"), file);
        rmSync(join(dir, "frames"), { recursive: true, force: true }); // this run's temp JPEGs (GBs) once encoded
        // Screencast timestamps are wall-clock seconds; marks become offsets into the clip.
        const t0 = result.frames[0].t;
        const base = Math.abs(t0 - result.startedAt) < 120 ? t0 : result.startedAt;
        const rel = marks.map((m) => ({ name: m.name, t: Number((m.wall - base).toFixed(3)), data: m.data }));
        await page.screenshot({ path: join(SHOTS_OUT, `${shot.id}-last.png`) });
        manifest.shots[shot.id] = { status: "recorded", url: BASE_URL, file, ...stats, marks: rel, recordedAt: new Date().toISOString() };
        if (stats.avgFps < 20) console.log(`  ! only ${stats.avgFps} fps captured (machine busy?); motion will look choppy, consider re-recording: --only ${shot.id}`);
        console.log(`  ok: ${stats.seconds}s raw (${stats.avgFps} fps captured); marks ${rel.map((m) => `${m.name}@${m.t}`).join(" ")}`);
        await shot.after?.(ctx);
      } catch (err) {
        const reason = err instanceof MissingFeature ? err.message : `error: ${err.message.split("\n")[0]}`;
        const keep = manifest.shots[shot.id]?.status === "recorded" ? " (kept the previous recording)" : "";
        if (!keep) manifest.shots[shot.id] = { status: "skipped", reason, recordedAt: new Date().toISOString() };
        else manifest.shots[shot.id].lastFailure = reason;
        console.log(`  SKIPPED ${shot.id}: ${reason}${keep}`);
        await page.screenshot({ path: join(SHOTS_OUT, `${shot.id}-failed.png`) }).catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
        if (new URL(page.url()).pathname !== "/") await openApp(page).catch(() => {}); // e.g. stuck on /proof
      }
      writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    }
  } finally {
    await browser.close();
  }
  return manifest;
}

export function parseArgs(argv) {
  const only = [];
  argv.forEach((a, i) => { if (a === "--only" && argv[i + 1]) only.push(...argv[i + 1].split(",")); });
  return { only, withCapture: argv.includes("--with-capture"), noRecord: argv.includes("--no-record") };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const m = await record(parseArgs(process.argv.slice(2)));
  const skipped = Object.entries(m.shots).filter(([, s]) => s.status === "skipped");
  if (skipped.length) console.log(`skipped: ${skipped.map(([id, s]) => `${id} (${s.reason})`).join("; ")}`);
}
