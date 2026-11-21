// Review helper: grabs frames from a clip into one strip image for quick visual checks.
//   node demo/frames.mjs out/shots/view3d.mp4 1,3,5 out/review/view3d.jpg
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./lib/proc.mjs";

const DEMO = fileURLToPath(new URL(".", import.meta.url));
const abs = (p) => (isAbsolute(p) ? p : join(DEMO, p));
const [clip, times, out] = process.argv.slice(2);
const ts = times.split(",").map(Number);
mkdirSync(dirname(abs(out)), { recursive: true });
const inputs = ts.flatMap((t) => ["-ss", String(t), "-i", abs(clip)]);
const filter = ts.map((_, i) => `[${i}:v]trim=end_frame=1,scale=960:-1[v${i}]`).join(";") + ";" + ts.map((_, i) => `[v${i}]`).join("") + `vstack=inputs=${ts.length}[o]`;
await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", ts.length > 1 ? filter : "[0:v]trim=end_frame=1,scale=960:-1[o]", "-map", "[o]", "-frames:v", "1", abs(out)]);
console.log(abs(out));
