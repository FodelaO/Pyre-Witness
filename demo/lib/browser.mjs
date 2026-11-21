// Launches Playwright Chromium using whichever browser build is already in the user's cache
// (the installed playwright version may expect a newer build than the one downloaded).
import { createRequire } from "node:module";
const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function findChromium() {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const builds = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of builds) {
    const exe = join(cache, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

// Preferred: the installed Chrome, headless, on its default ANGLE Metal GPU path: WebGL2 for the 3D
// view at ~55 fps screencast. (demo/fpsprobe.mjs measured: SwiftShader flags drop it to 2-3 fps,
// the bundled Chromium build renders 2D but delivers 0 screencast frames for the 3D canvas.)
const CHROME_ARGS = ["--hide-scrollbars", "--force-color-profile=srgb"];

export async function launch() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true, args: CHROME_ARGS });
  } catch { /* fall through to the bundled builds */ }
  try {
    return await chromium.launch({ args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  } catch {
    const executablePath = findChromium();
    if (!executablePath) throw new Error("No Chromium found in ~/Library/Caches/ms-playwright");
    return chromium.launch({ executablePath, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  }
}
