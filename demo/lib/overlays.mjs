// Renders the post-production overlays as transparent PNGs with Playwright, in the app's own
// typeface (Geist, read from the Next.js package): caption plates (with an optional speed badge)
// and the title / end cards composed over the provided card artwork.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FONT_DIRS = ["node_modules/next/dist/next-devtools/server/font", "node_modules/next/dist/esm/next-devtools/server/font"];

function fontFace(file, family) {
  for (const d of FONT_DIRS) {
    const p = join(ROOT, d, file);
    if (existsSync(p)) return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${readFileSync(p).toString("base64")}) format("woff2");font-weight:100 900;}`;
  }
  return "";
}
const FONTS = fontFace("geist-latin.woff2", "Geist") + fontFace("geist-mono-latin.woff2", "Geist Mono");
const SANS = `'Geist','Helvetica Neue',Helvetica,Arial,sans-serif`;
const MONO = `'Geist Mono',ui-monospace,Menlo,monospace`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function withRenderer(fn) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    return await fn(async (html, out, transparent = true) => {
      await page.setContent(`<!doctype html><html><head><style>${FONTS}
        html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}</style></head><body>${html}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: out, omitBackground: transparent });
    });
  } finally {
    await browser.close();
  }
}

/** Lower-left caption plate. `badge` (e.g. "x6 speed") is drawn as an amber pill after the text. */
export function captionHtml(text, badge, credit, photo) {
  return `<div style="position:absolute;left:32px;bottom:83px;display:flex;align-items:center;gap:18px;
      padding:13px 22px 14px 18px;border-radius:10px;background:rgba(6,10,18,.9);
      border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 32px rgba(0,0,0,.4);
      font:600 38px/1.1 ${SANS};color:#eef2f7;letter-spacing:-.2px">
    <span style="width:4px;height:34px;border-radius:2px;background:#f26a21"></span>
    <span>${esc(text)}</span>
    ${badge ? `<span style="font:600 26px/1 ${MONO};color:#0b0f17;background:#f5b544;border-radius:8px;padding:8px 12px">${esc(badge)}</span>` : ""}
  </div>${credit ? `<div style="position:absolute;left:32px;bottom:54px;padding:3px 9px;
    border-radius:4px;background:#081019;color:#eef2f7;font:500 16px/1.3 ${SANS}">${esc(credit)}</div>` : ""}
    ${photo ? `<img alt="" style="position:absolute;left:32px;top:115px;width:316px;object-fit:contain;
    border:3px solid #fff;border-radius:8px;box-shadow:0 8px 24px #181a2a33"
    src="data:image/jpeg;base64,${readFileSync(photo).toString("base64")}">` : ""}`;
}

/** Title card: the provided artwork with its tagline replaced by the storyboard line. */
export function titleCardHtml(art, tagline) {
  return `<div style="position:absolute;inset:0;background:url('data:image/png;base64,${readFileSync(art).toString("base64")}') 0 0/1920px 1080px">
    <div style="position:absolute;left:330px;right:330px;top:582px;height:96px;background:rgb(4,8,16);
      box-shadow:0 0 40px 30px rgb(4,8,16)"></div>
    <div style="position:absolute;left:0;right:0;top:598px;text-align:center;font:400 38px/1.3 ${SANS};color:#c5d2df">${esc(tagline)}</div>
  </div>`;
}

/** End card: logo artwork, one line per model job, the rules-engine note and the repo URL. */
export function endCardHtml(art, jobs, note, url) {
  const rows = jobs.map(([who, job]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:250px">
      <span style="font:600 28px/1.1 ${SANS};color:#eef2f7">${esc(who)}</span>
      <span style="font:400 22px/1.2 ${MONO};color:#93a3b5">${esc(job)}</span></div>`).join("");
  return `<div style="position:absolute;inset:0;background:url('data:image/png;base64,${readFileSync(art).toString("base64")}') 0 0/1920px 1080px">
    <div style="position:absolute;left:300px;right:300px;top:556px;height:80px;background:rgb(1,6,14);box-shadow:0 0 40px 30px rgb(1,6,14)"></div>
    <div style="position:absolute;left:0;right:0;top:592px;display:flex;justify-content:center;gap:28px">${rows}</div>
    <div style="position:absolute;left:0;right:0;top:712px;text-align:center;font:400 24px/1.3 ${SANS};color:#93a3b5">${esc(note)}</div>
    <div style="position:absolute;left:0;right:0;top:800px;text-align:center;font:500 36px/1.2 ${MONO};color:#f26a21">${esc(url)}</div>
  </div>`;
}
