// Read-only exploration for the demo director: loads the app at both rehearsal sizes, lists every
// control by accessible name and saves a screenshot. Makes no model calls.
import { createRequire } from "node:module";
const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
const BASE = process.env.BASE ?? "http://localhost:4119";
const OUT = (await import("node:url")).fileURLToPath(new URL("./shots/", import.meta.url));
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [w, h] of [[1920, 1080], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 200)));
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}explore-home-${w}.png` });
  const names = await page.$$eval("button, a, [role=tab], [role=slider], input, textarea, summary", (els) =>
    els
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => {
        const r = e.getBoundingClientRect();
        const text = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
        return `${e.tagName.toLowerCase()}|${e.getAttribute("aria-label") ?? ""}|${text}|${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
  );
  console.log(`--- ${w}x${h}\n` + names.join("\n"));
  if (w === 1920) {
    const rail = await page.locator("#pw-results").innerText().catch(() => "(no #pw-results)");
    console.log("--- RAIL\n" + rail.slice(0, 1500));
  }
  await page.close();
}
await browser.close();
