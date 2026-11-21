// Writes demo/out/contact-sheet.jpg: one frame every 3 s of the final cut in a 4-column grid,
// so a human can review pacing and framing at a glance.
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { probeDuration, run } from "./lib/proc.mjs";

const OUT = fileURLToPath(new URL("./out/", import.meta.url));

export async function contactSheet(video = join(OUT, "pyre-witness-demo.mp4"), every = 3, cols = 4) {
  const duration = await probeDuration(video);
  const count = Math.max(1, Math.ceil(duration / every));
  const rows = Math.ceil(count / cols);
  const out = join(OUT, "contact-sheet.jpg");
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", video,
    "-vf", `fps=1/${every},scale=640:360:flags=lanczos,pad=648:368:4:4:color=0x1b2230,tile=${cols}x${rows}:color=0x1b2230`,
    "-frames:v", "1", "-q:v", "3", out]);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await contactSheet());
