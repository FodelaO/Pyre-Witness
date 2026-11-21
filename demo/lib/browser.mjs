// Launches the installed Chrome or the newest compatible cached headless shell.
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const CHROME_ARGS = ["--hide-scrollbars", "--force-color-profile=srgb"];
const SOFTWARE_ARGS = [
  "--single-process", "--in-process-gpu", "--disable-crashpad-for-testing",
  "--enable-gpu", "--use-gl=angle", "--use-angle=swiftshader-webgl",
  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
];

function findCached(prefix, binary) {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const builds = readdirSync(cache)
    .filter((dir) => dir.startsWith(prefix) && /^\d+$/.test(dir.slice(prefix.length)))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const dir of builds) {
    const exe = join(cache, dir, binary);
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

export function findChromium() {
  return findCached("chromium-", `chrome-mac-${process.arch}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`);
}

export async function launch() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true, args: CHROME_ARGS, timeout: 10000 });
  } catch (error) {
    const executablePath = findCached("chromium_headless_shell-", `chrome-headless-shell-mac-${process.arch}/chrome-headless-shell`);
    if (!executablePath) throw new Error("Installed Chrome failed to launch and no cached headless shell was found", { cause: error });
    console.log("  Installed Chrome could not launch. Using the cached headless shell with WebGL2.");
    return chromium.launch({ executablePath, args: [...CHROME_ARGS, ...SOFTWARE_ARGS], timeout: 10000 });
  }
}
