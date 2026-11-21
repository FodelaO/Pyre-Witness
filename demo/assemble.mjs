// Assembles the cut: title card -> recorded shots (trimmed to storyboard timings, captions burned
// in from Playwright-rendered PNGs) -> end card, joined with 150 ms crossfades. Writes
// demo/out/pyre-witness-demo.mp4 (H.264, yuv420p, 30 fps, faststart, no audio) and FAILS if the
// ffprobe duration is over 60.0 s.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./lib/browser.mjs";
import { probeDuration, run } from "./lib/proc.mjs";
import { loadShots } from "./record.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(DEMO, "out");
const FINAL = join(OUT, "pyre-witness-demo.mp4");
const XFADE = 0.15;
const TITLE_SECONDS = 2;
const END_SECONDS = 3;
const MAX_SECONDS = 60.0;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

async function renderCaptions(items) {
  const dir = join(OUT, "captions");
  mkdirSync(dir, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const { id, caption } of items) {
    await page.setContent(`<!doctype html><html><head><style>
      html,body{margin:0;width:1920px;height:1080px;background:transparent}
      .plate{position:absolute;left:84px;bottom:58px;padding:16px 26px 17px 22px;border-radius:10px;
        background:rgba(6,10,18,.78);border:1px solid rgba(255,255,255,.10);
        box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;align-items:center;gap:16px;
        font:600 36px/1.1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#eef2f7;letter-spacing:.2px}
      .bar{width:4px;height:36px;border-radius:2px;background:#f26a21}
    </style></head><body><div class="plate"><span class="bar"></span><span>${esc(caption)}</span></div></body></html>`);
    await page.screenshot({ path: join(dir, `${id}.png`), omitBackground: true });
  }
  await browser.close();
  return dir;
}

const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "30", "-an"];

async function stillSegment(png, seconds, out) {
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-t", String(seconds), "-i", png,
    "-vf", "scale=1920:1080,format=yuv420p", ...enc, out]);
}

async function shotSegment(shot, src, captionPng, out) {
  const d = shot.duration;
  const start = shot.trimStart ?? 0;
  const fadeOutAt = Math.max(0.6, d - 0.55);
  const filter =
    `[0:v]tpad=stop_mode=clone:stop_duration=10,trim=duration=${d},setpts=PTS-STARTPTS[v];` +
    `[1:v]format=rgba,fade=t=in:st=0.25:d=0.35:alpha=1,fade=t=out:st=${fadeOutAt}:d=0.35:alpha=1,trim=duration=${d},setpts=PTS-STARTPTS[c];` +
    `[v][c]overlay=0:0:shortest=1,format=yuv420p[o]`;
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(start), "-i", src,
    "-loop", "1", "-framerate", "30", "-t", String(d), "-i", captionPng,
    "-filter_complex", filter, "-map", "[o]", "-t", String(d), ...enc, out]);
}

export async function assemble() {
  const manifest = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8"));
  const shots = (await loadShots()).filter((s) => manifest.shots[s.id]?.status === "recorded" && existsSync(manifest.shots[s.id].file));
  const skipped = (await loadShots()).filter((s) => !shots.includes(s)).map((s) => ({ id: s.id, reason: manifest.shots[s.id]?.reason ?? "not recorded" }));
  if (!shots.length) throw new Error("no recorded shots; run node demo/record.mjs first");

  const capDir = await renderCaptions(shots);
  const segDir = join(OUT, "segments");
  mkdirSync(segDir, { recursive: true });
  const segments = [];
  const title = join(segDir, "00-title.mp4");
  await stillSegment(join(DEMO, "assets", "title-card.png"), TITLE_SECONDS, title);
  segments.push({ file: title, d: TITLE_SECONDS, label: "title card", caption: "" });
  for (const [i, shot] of shots.entries()) {
    const raw = manifest.shots[shot.id];
    const avail = raw.seconds - (shot.trimStart ?? 0);
    if (avail + 0.05 < shot.duration) console.log(`  note: ${shot.id} raw ${avail.toFixed(2)}s < ${shot.duration}s, last frame held`);
    const file = join(segDir, `${String(i + 1).padStart(2, "0")}-${shot.id}.mp4`);
    await shotSegment(shot, raw.file, join(capDir, `${shot.id}.png`), file);
    segments.push({ file, d: shot.duration, label: shot.id, caption: shot.caption });
  }
  const end = join(segDir, "99-end.mp4");
  await stillSegment(join(DEMO, "assets", "end-card.png"), END_SECONDS, end);
  segments.push({ file: end, d: END_SECONDS, label: "end card", caption: "" });

  // Crossfade chain.
  const inputs = segments.flatMap((s) => ["-i", s.file]);
  let filter = "";
  let prev = "[0:v]";
  let length = segments[0].d;
  const timeline = [{ label: segments[0].label, start: 0, caption: segments[0].caption }];
  for (let i = 1; i < segments.length; i++) {
    const offset = length - XFADE;
    const outLabel = i === segments.length - 1 ? "[vout]" : `[x${i}]`;
    filter += `${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${outLabel};`;
    timeline.push({ label: segments[i].label, start: Number(offset.toFixed(2)), caption: segments[i].caption });
    prev = outLabel;
    length = offset + segments[i].d;
  }
  filter += `[vout]scale=out_range=tv,format=yuv420p[final]`;
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[final]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
    "-color_range", "tv", "-movflags", "+faststart", "-an", FINAL]);

  const duration = await probeDuration(FINAL);
  timeline.forEach((t, i) => { t.end = Number((i + 1 < timeline.length ? timeline[i + 1].start + XFADE : duration).toFixed(2)); });
  writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ duration, timeline, skipped }, null, 2));
  if (!(duration <= MAX_SECONDS)) throw new Error(`cut is ${duration.toFixed(2)} s, over the ${MAX_SECONDS} s limit`);
  return { file: FINAL, duration, timeline, skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await assemble();
  console.log(`${r.file}  ${r.duration.toFixed(2)} s`);
  for (const t of r.timeline) console.log(`  ${t.start.toFixed(2).padStart(6)}-${t.end.toFixed(2).padStart(6)}  ${t.label.padEnd(10)} ${t.caption}`);
}
