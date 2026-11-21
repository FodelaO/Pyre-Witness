// Launches Playwright Chromium using whichever browser build is already in the user's cache
// (the installed playwright version may expect a newer build than the one downloaded).
import { chromium } from "playwright";
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

export async function launch() {
  try {
    return await chromium.launch({ args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  } catch {
    const executablePath = findChromium();
    if (!executablePath) throw new Error("No Chromium found in ~/Library/Caches/ms-playwright");
    return chromium.launch({ executablePath, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  }
}
