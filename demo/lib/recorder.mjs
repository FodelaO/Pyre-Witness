// CDP screencast recorder: captures JPEG frames with their real timestamps and turns them
// into a constant-30-fps H.264 clip with ffmpeg (each frame held until the next one arrived).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "./proc.mjs";

export async function startScreencast(page, dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let pending = Promise.resolve();
  cdp.on("Page.screencastFrame", (frame) => {
    const file = join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ file, t: frame.metadata.timestamp });
    writeFileSync(file, Buffer.from(frame.data, "base64"));
    pending = cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const startedAt = Date.now() / 1000;
  return {
    async stop() {
      const stoppedAt = Date.now() / 1000;
      await pending;
      await cdp.send("Page.stopScreencast").catch(() => {});
      await cdp.detach().catch(() => {});
      return { frames, startedAt, stoppedAt };
    },
  };
}

/** Writes an ffconcat list from real frame timestamps and encodes a 30 fps clip. */
export async function encodeFrames({ frames, stoppedAt }, dir, outFile) {
  if (frames.length === 0) throw new Error("screencast produced no frames");
  const lines = ["ffconcat version 1.0"];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : Math.max(f.t + 1 / 30, stoppedAt);
    lines.push(`file '${f.file}'`, `duration ${Math.max(next - f.t, 0.001).toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1).file}'`); // concat demuxer needs the last file repeated
  const list = join(dir, "frames.ffconcat");
  writeFileSync(list, lines.join("\n") + "\n");
  await run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-safe", "0", "-f", "concat", "-i", list,
    "-vf", "scale=1920:1080:flags=lanczos:out_range=tv,fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-an", outFile,
  ]);
  const span = (stoppedAt - frames[0].t).toFixed(2);
  return { frameCount: frames.length, seconds: Number(span), avgFps: Number((frames.length / span).toFixed(1)) };
}
