// Probe: screencast fps and WebGL2 support for several browser launch configurations.
//   node demo/fpsprobe.mjs --url=http://localhost:4119 [--only name ...]
import { createRequire } from "node:module";
import { findChromium } from "./lib/browser.mjs";
const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
const BASE = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:4119";
const configs = {
  chromeDefault: { channel: "chrome", headless: true, args: ["--hide-scrollbars"] },
  chromeGpu: { channel: "chrome", headless: true, args: ["--hide-scrollbars", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] },
  bundled: { executablePath: findChromium(), args: ["--hide-scrollbars"] },
  chromeSwift: { channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"] },
};
for (const [name, opts] of Object.entries(configs)) {
  if (process.argv.includes("--only") && !process.argv.includes(name)) continue;
  let browser;
  try {
    browser = await chromium.launch(opts);
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
    await page.locator(".lens-toggle").first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    const gl = await page.evaluate(() => { const c = document.createElement("canvas"); const g = c.getContext("webgl2"); if (!g) return "none"; const d = g.getExtension("WEBGL_debug_renderer_info"); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : "webgl2"; });
    const cdp = await page.context().newCDPSession(page);
    let n = 0;
    cdp.on("Page.screencastFrame", (f) => { n++; cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080 });
    const t0 = Date.now();
    for (let i = 0; i < 60; i++) { await page.mouse.move(400 + i * 15, 500); await page.waitForTimeout(40); }
    const s1 = (Date.now() - t0) / 1000, f1 = n;
    await page.locator(".pw3d-toggle button", { hasText: "3D" }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    n = 0;
    const t1 = Date.now();
    for (let i = 0; i < 30; i++) { await page.mouse.move(800 + i * 10, 560); await page.waitForTimeout(40); }
    const s2 = (Date.now() - t1) / 1000;
    console.log(`${name}: webgl2=${gl}; 2D ${(f1 / s1).toFixed(1)} fps over ${s1.toFixed(1)} s; 3D ${(n / s2).toFixed(1)} fps over ${s2.toFixed(1)} s`);
  } catch (e) {
    console.log(`${name}: failed ${e.message.split("\n")[0]}`);
  } finally {
    await browser?.close();
  }
}
