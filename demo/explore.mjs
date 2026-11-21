// Exploration helper: screenshots the running app and dumps an accessibility/interactive summary.
import { launch } from "./lib/browser.mjs";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("./out/explore/", import.meta.url));
const b = await launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 200)); });
await p.goto("http://localhost:4119/", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
await p.screenshot({ path: OUT + "01-home.png" });
const buttons = await p.$$eval("button, [role=tab], a, input", (els) => els.map((e) => `${e.tagName} role=${e.getAttribute("role")} aria=${e.getAttribute("aria-label")} title=${e.getAttribute("title")} type=${e.getAttribute("type")} text=${(e.textContent||"").trim().slice(0,50)}`));
console.log(buttons.join("\n"));
for (const [name, label] of [["02-purdue", "Purdue network map"], ["03-split", "Side by side"]]) {
  await p.getByRole("tab", { name: label }).click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + name + ".png" });
}
await p.getByRole("tab", { name: "Plant floor" }).click();
for (const r of ["gallery", "proof"]) { await p.goto("http://localhost:4119/" + r, { waitUntil: "networkidle" }); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + "04-" + r + ".png" }); }
await b.close();
