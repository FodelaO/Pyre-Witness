// Small process helpers: run a command and fail loudly, or capture its stdout.
import { spawn } from "node:child_process";

export function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
    let out = "";
    if (capture) child.stdout.on("data", (d) => (out += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

export async function probeDuration(file) {
  const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { capture: true });
  return Number(out.trim());
}
