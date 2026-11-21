// Assembles the cut from the recorded shots: title card -> shots in STORYBOARD order -> end card,
// 150 ms crossfades, captions burned in from Playwright-rendered PNGs (app typeface). Each shot's
// `edit(marks)` returns pieces of the raw clip; a piece with `fit` is sped up by an integer factor
// so it fits, and that factor is shown on screen ("x6 speed"). Writes demo/out/pyre-witness-demo.mp4
// (H.264, yuv420p, 30 fps, faststart, no audio) and FAILS if ffprobe reports more than 60.0 s.
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL } from "./lib/app.mjs";
import { captionHtml, endCardHtml, titleCardHtml, withRenderer } from "./lib/overlays.mjs";
import { probeDuration, run } from "./lib/proc.mjs";
import { loadShot, readManifest } from "./record.mjs";
import { END, STORYBOARD, TITLE } from "./shots/index.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(DEMO, "out");
// Only takes from the final build (port 4120) produce the deliverable; rehearsals get their own name.
const NAME = BASE_URL === "http://localhost:4120" ? "pyre-witness-demo" : "rehearsal-NOT-FINAL";
const FINAL = join(OUT, `${NAME}.mp4`);
const PARTIAL = join(OUT, `${NAME}.partial.mp4`);
const XFADE = 0.15;
const MAX_SECONDS = 60.0;
const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "30", "-an"];
const ff = (args) => run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
const r3 = (x) => Number(x.toFixed(3));

/** Turns a shot's pieces into concrete [from,to,speed] spans, capped at the shot's budget. */
function plan(shot, rec) {
  const raw = shot.edit ? shot.edit(rec.marks ?? [], rec.seconds) : [{ from: 0, to: rec.seconds, caption: shot.caption }];
  let total = 0;
  const pieces = [];
  for (const p of raw) {
    const from = Math.max(0, p.from), to = Math.min(rec.seconds, p.to);
    if (!(to - from > 0.15)) continue;
    const speed = p.fit ? Math.max(1, Math.ceil((to - from) / p.fit - 1e-6)) : 1;
    let out = (to - from) / speed + (p.hold ?? 0); // `hold` freezes the last frame (e.g. to read a number)
    if (shot.budget && total + out > shot.budget) out = Math.max(0, shot.budget - total);
    if (out < 0.2) break;
    pieces.push({ from: r3(from), to: r3(Math.min(to, from + out * speed)), speed, out: r3(out), caption: p.caption, badge: speed > 1 ? `x${speed} speed` : null });
    total += out;
  }
  return pieces;
}

async function pieceClip(src, piece, capPng, out) {
  const { from, to, speed, out: d } = piece;
  const fadeOut = Math.max(0.5, d - 0.4);
  const filter =
    `[0:v]trim=start=${from}:end=${to},setpts=(PTS-STARTPTS)/${speed},fps=30,tpad=stop_mode=clone:stop_duration=2,trim=duration=${d}[v];` +
    `[1:v]format=rgba,fade=t=in:st=0.12:d=0.25:alpha=1,fade=t=out:st=${fadeOut}:d=0.25:alpha=1,trim=duration=${d},setpts=PTS-STARTPTS[c];` +
    `[v][c]overlay=0:0:shortest=1,format=yuv420p[o]`;
  await ff(["-i", src, "-loop", "1", "-framerate", "30", "-t", String(d), "-i", capPng, "-filter_complex", filter, "-map", "[o]", "-t", String(d), ...enc, out]);
}

async function stillClip(png, seconds, out) {
  await ff(["-loop", "1", "-framerate", "30", "-t", String(seconds), "-i", png, "-vf", "scale=1920:1080,format=yuv420p", ...enc, out]);
}

export async function assemble() {
  const manifest = readManifest();
  const dirs = { caps: join(OUT, "captions"), segs: join(OUT, "segments"), cards: join(OUT, "cards") };
  Object.values(dirs).forEach((d) => mkdirSync(d, { recursive: true }));

  const shots = [];
  const skipped = [];
  for (const id of STORYBOARD) {
    const shot = await loadShot(id);
    const rec = manifest.shots[id];
    if (rec?.status === "recorded" && rec.url !== BASE_URL) skipped.push({ id, reason: `recorded from ${rec.url ?? "an older server"}, not ${BASE_URL}` });
    else if (rec?.status === "recorded" && existsSync(rec.file)) shots.push({ shot, rec, pieces: plan(shot, rec) });
    else skipped.push({ id, reason: rec?.reason ?? "not recorded" });
  }
  if (!shots.length) throw new Error("no recorded shots; run node demo/record.mjs first");

  // Overlays: cards and one caption PNG per piece.
  const titlePng = join(dirs.cards, "title.png"), endPng = join(dirs.cards, "end.png");
  await withRenderer(async (render) => {
    await render(titleCardHtml(join(DEMO, "assets", "title-card.png"), TITLE.tagline), titlePng, false);
    await render(endCardHtml(join(DEMO, "assets", "end-card.png"), END.jobs, END.note, END.url), endPng, false);
    for (const { shot, pieces } of shots) {
      for (const [i, p] of pieces.entries()) {
        p.png = join(dirs.caps, `${shot.id}-${i}.png`);
        await render(captionHtml(p.caption, p.badge), p.png);
      }
    }
  });

  // One clip per shot (its pieces concatenated with hard cuts inside the shot).
  const segments = [];
  const title = join(dirs.segs, "00-title.mp4");
  await stillClip(titlePng, TITLE.seconds, title);
  segments.push({ file: title, d: TITLE.seconds, label: "title card", pieces: [] });
  for (const [i, { shot, rec, pieces }] of shots.entries()) {
    const parts = [];
    for (const [j, p] of pieces.entries()) {
      const f = join(dirs.segs, `${i + 1}-${shot.id}-${j}.mp4`);
      await pieceClip(rec.file, p, p.png, f);
      parts.push(f);
    }
    const file = join(dirs.segs, `${String(i + 1).padStart(2, "0")}-${shot.id}.mp4`);
    if (parts.length === 1) await ff(["-i", parts[0], "-c", "copy", file]);
    else {
      const inputs = parts.flatMap((p) => ["-i", p]);
      const filter = parts.map((_, k) => `[${k}:v]`).join("") + `concat=n=${parts.length}:v=1:a=0[o]`;
      await ff([...inputs, "-filter_complex", filter, "-map", "[o]", ...enc, file]);
    }
    segments.push({ file, d: await probeDuration(file), label: shot.id, pieces });
  }
  const end = join(dirs.segs, "99-end.mp4");
  await stillClip(endPng, END.seconds, end);
  segments.push({ file: end, d: END.seconds, label: "end card", pieces: [] });

  // Crossfade chain.
  let filter = "", prev = "[0:v]", length = segments[0].d;
  const timeline = [{ label: segments[0].label, start: 0, pieces: [] }];
  for (let i = 1; i < segments.length; i++) {
    const offset = length - XFADE;
    const outLabel = i === segments.length - 1 ? "[vout]" : `[x${i}]`;
    filter += `${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${outLabel};`;
    timeline.push({ label: segments[i].label, start: r3(offset), pieces: segments[i].pieces });
    prev = outLabel;
    length = offset + segments[i].d;
  }
  filter += `[vout]scale=out_range=tv,format=yuv420p[final]`;
  await ff([...segments.flatMap((s) => ["-i", s.file]), "-filter_complex", filter, "-map", "[final]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
    "-color_range", "tv", "-movflags", "+faststart", "-an", PARTIAL]);

  // Probe the finished temp file first; only a complete, in-limit cut replaces the deliverable.
  const duration = await probeDuration(PARTIAL);
  if (!(duration > 0)) throw new Error("render produced an unreadable file");
  if (duration <= MAX_SECONDS) renameSync(PARTIAL, FINAL);
  timeline.forEach((t, i) => { t.end = r3(i + 1 < timeline.length ? timeline[i + 1].start + XFADE : duration); });
  // Absolute piece times for the report.
  for (const t of timeline) { let at = t.start; for (const p of t.pieces) { p.at = r3(at); at += p.out; delete p.png; } }
  writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ duration, timeline, skipped }, null, 2));
  if (!(duration <= MAX_SECONDS)) throw new Error(`cut is ${duration.toFixed(3)} s, over the ${MAX_SECONDS} s limit`);
  return { file: FINAL, duration, timeline, skipped };
}

export function printTimeline(cut) {
  for (const t of cut.timeline) {
    console.log(`  ${t.start.toFixed(2).padStart(6)}-${t.end.toFixed(2).padStart(6)}  ${t.label}`);
    for (const p of t.pieces) console.log(`           @${p.at.toFixed(2).padStart(6)} ${p.out.toFixed(2)}s ${p.speed > 1 ? `x${p.speed}` : "real-time"}  "${p.caption}"`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await assemble();
  console.log(`${r.file}  ${r.duration.toFixed(3)} s`);
  printTimeline(r);
}
