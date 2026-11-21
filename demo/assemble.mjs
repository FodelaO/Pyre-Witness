// Cuts and validates a complete 1080p candidate before replacing the published video.
import { copyFileSync, existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contactSheet } from "./contact-sheet.mjs";
import { BASE_URL } from "./lib/app.mjs";
import { captionHtml, endCardHtml, titleCardHtml, withRenderer } from "./lib/overlays.mjs";
import { run } from "./lib/proc.mjs";
import { buildMarker, loadShot, readManifest, usableTake } from "./record.mjs";
import { CAPTURE_GROUP, END, STORYBOARD, TITLE } from "./shots/index.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(DEMO, "out");
const LIVE = BASE_URL === "http://localhost:4120";
const NAME = LIVE ? "pyre-witness-demo" : "rehearsal-NOT-FINAL";
const FPS = 30;
const CAP = 60;
const encode = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-profile:v", "high",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-color_range", "tv", "-an"];
const ff = (args) => run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
const seconds = (frameCount) => frameCount / FPS;

async function verify(file, expectedFrames) {
  const raw = await run("ffprobe", ["-v", "error", "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height,nb_frames", "-of", "json", file], { capture: true });
  const { streams, format } = JSON.parse(raw);
  const video = streams.find((stream) => stream.codec_type === "video");
  const duration = Number(format.duration);
  if (video?.codec_name !== "h264" || video.width !== 1920 || video.height !== 1080
    || Number(video.nb_frames) !== expectedFrames || !(duration > 0 && duration < CAP)) {
    throw new Error(`Candidate failed ffprobe verification: ${JSON.stringify({ video, duration, expectedFrames })}`);
  }
  return duration;
}

async function renderPiece(piece, output) {
  const frames = String(piece.frames);
  if (!piece.source) {
    await ff(["-loop", "1", "-framerate", String(FPS), "-i", piece.image, "-vf", "scale=1920:1080,format=yuv420p",
      "-frames:v", frames, ...encode, output]);
    return;
  }
  const span = Math.min(piece.to - piece.from, seconds(piece.frames) * piece.speed);
  const base = `[0:v]setpts=(PTS-STARTPTS)/${piece.speed},fps=${FPS},tpad=stop_mode=clone:stop_duration=12[v]`;
  await ff(["-ss", String(piece.from), "-t", String(span), "-i", piece.source,
    "-loop", "1", "-framerate", String(FPS), "-i", piece.image,
    "-filter_complex_threads", "2", "-filter_complex", `${base};[v][1:v]overlay=0:0:shortest=1,format=yuv420p[out]`,
    "-map", "[out]", "-frames:v", frames, ...encode, output]);
}

export async function assemble() {
  const manifest = readManifest();
  const build = LIVE ? buildMarker() : null;
  const stage = mkdtempSync(join(OUT, ".render-"));
  try {
    const shots = [];
    for (const id of STORYBOARD) {
      const take = manifest.shots[id];
      if (!usableTake(take)) throw new Error(`Missing today's verified take for ${id}`);
      if (CAPTURE_GROUP.includes(id)) {
        if (take.batch !== manifest.shots.capture.batch) throw new Error(`${id} is from a different capture`);
      } else if (LIVE && take.build !== build) throw new Error(`${id} was recorded against a different build marker`);
      const shot = await loadShot(id);
      shots.push({ id, take, edits: shot.edit(take.marks, take.seconds) });
    }

    const pieces = [];
    let cursor = 0;
    let planned = 0;
    function add(label, edit, source) {
      const start = cursor;
      planned += edit.duration;
      cursor = Math.round(planned * FPS);
      const frames = cursor - start;
      if (!(frames > 0) || (source && !(edit.to - edit.from > 0.1))) throw new Error(`Invalid footage range for ${label}`);
      pieces.push({ label, source, ...edit, speed: edit.speed ?? 1, frames, start: seconds(start), end: seconds(cursor) });
    }
    add("title", { duration: TITLE.seconds });
    for (const { id, take, edits } of shots) {
      for (const edit of edits) {
        if (edit.caption.trim().split(/\s+/).length > 8) throw new Error(`Caption exceeds eight words: ${edit.caption}`);
        add(id, { ...edit, to: Math.min(edit.to, take.seconds) }, take.file);
      }
    }
    add("end", { duration: END.seconds });
    if (!(seconds(cursor) < CAP)) throw new Error("Planned cut reaches the 60-second cap");

    await withRenderer(async (render) => {
      const plates = new Map();
      for (const [index, piece] of pieces.entries()) {
        const png = join(stage, `${index}.png`);
        if (piece.label === "title") {
          await render(titleCardHtml(join(DEMO, "assets", "title-card.png"), TITLE.tagline), png, false);
          piece.image = png;
        } else if (piece.label === "end") {
          await render(endCardHtml(join(DEMO, "assets", "end-card.png"), END.jobs, END.note, END.url), png, false);
          piece.image = png;
        } else {
          const badge = piece.speed > 1 ? `x${piece.speed}` : null;
          const key = JSON.stringify([piece.caption, badge, piece.credit, piece.photo]);
          if (!plates.has(key)) {
            await render(captionHtml(piece.caption, badge, piece.credit, piece.photo), png);
            plates.set(key, png);
          }
          piece.image = plates.get(key);
        }
      }
    });

    const segments = [];
    for (const [index, piece] of pieces.entries()) {
      const output = join(stage, `${index}.mp4`);
      await renderPiece(piece, output);
      segments.push(`file '${basename(output)}'`);
    }
    const list = join(stage, "shots.ffconcat");
    writeFileSync(list, ["ffconcat version 1.0", ...segments, ""].join("\n"));
    const candidate = join(stage, "candidate.mp4");
    await ff(["-f", "concat", "-safe", "0", "-i", list, "-map", "0:v", "-c", "copy", "-movflags", "+faststart", candidate]);
    const duration = await verify(candidate, cursor);
    const sheet = await contactSheet(candidate, 3, 4, join(stage, "contact-sheet.jpg"));
    const timeline = pieces.map(({ image: _image, ...piece }) => piece);
    const outTimeline = join(stage, "timeline.json");
    writeFileSync(outTimeline, JSON.stringify({ duration, fps: FPS, build, captureBuild: manifest.shots.capture.build, timeline }, null, 2) + "\n");

    if (LIVE && buildMarker() !== build) throw new Error("Port 4120 build marker changed before publication");
    const file = join(OUT, `${NAME}.mp4`);
    if (LIVE && existsSync(file)) {
      const previous = join(stage, "previous.mp4");
      copyFileSync(file, previous);
      renameSync(previous, join(OUT, `${NAME}.prev.mp4`));
    }
    const finalSheet = join(OUT, LIVE ? "contact-sheet.jpg" : "contact-sheet-rehearsal.jpg");
    renameSync(sheet, finalSheet);
    renameSync(outTimeline, join(OUT, LIVE ? "timeline.json" : "timeline-rehearsal.json"));
    renameSync(candidate, file);
    return { file, duration, timeline, sheet: finalSheet };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

export function printTimeline(cut) {
  for (const { label, start, end, caption, speed } of cut.timeline) {
    console.log(`  ${start.toFixed(2)}–${end.toFixed(2)}  ${caption ?? label}${speed > 1 ? ` (x${speed})` : ""}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cut = await assemble();
  console.log(cut.file, cut.duration.toFixed(6), "s");
  printTimeline(cut);
}
