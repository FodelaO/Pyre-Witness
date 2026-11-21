// Shot: /proof, run 4 against the single Hydrogen call: the comparison card (with its confidence
// intervals) and then the full paired comparison table, opened and scrolled with the real mouse.
// Recorded last (it leaves the plant page).
import { require, sel } from "../lib/app.mjs";

const at = (marks, name) => marks.find((m) => m.name === name)?.t;

export default {
  id: "proof",
  budget: 4.6,
  async prepare({ page, cursor }) {
    await page.keyboard.press("Escape");
    await cursor.place(1600, 120);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(150);
    const link = await require(sel.proofLink(page), "Proof link in the top bar");
    await cursor.click(link, { ms: 450, label: "Proof" });
    const head = page.getByRole("heading", { name: /compare to the baseline/i }).first();
    await head.waitFor({ timeout: 30000 }).catch(() => { throw new Error("proof page has no baseline comparison heading"); });
    const card = head.locator("xpath=ancestor::section[1]");
    const text = (await card.innerText().catch(() => "")).replace(/\s+/g, " ");
    const pp = text.match(/([+-]\d+(?:\.\d+)?)\s*pp/)?.[1];
    const body = await page.locator("body").innerText();
    const run = body.match(/Run\s+(\d+)/)?.[1], n = body.match(/n=(\d+)/)?.[1];
    mark("loaded", { pp, run, n, card: text.slice(0, 600) });
    log(`  proof: run ${run}, n=${n}, ${pp} pp`);
    await page.waitForTimeout(300);
    const hb = await head.boundingBox();
    await cursor.glide(hb.x + 420, hb.y + 140, 700);
    await page.waitForTimeout(900);
    // The full paired table at the bottom of the page.
    const full = page.locator("summary", { hasText: /Full baseline comparison/ }).first();
    if (await full.count()) {
      await full.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await cursor.click(full, { ms: 450, label: "Full baseline comparison" });
      mark("table", { text: (await full.innerText()).replace(/\s+/g, " ") });
      await page.waitForTimeout(250);
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(1700);
    } else log("  ! no full baseline comparison table");
    mark("end");
  },
  edit(marks, seconds) {
    const d = marks.find((m) => m.name === "loaded")?.data ?? {};
    const tb = at(marks, "table"), end = Math.min(at(marks, "end") ?? seconds, seconds);
    const first = { from: Math.max(0, at(marks, "loaded") - 0.6), caption: `Run ${d.run ?? "4"} vs one Gemini call: ${d.pp ?? ""} pp`.replace(/:\s*pp$/, "") };
    if (!tb) return [{ ...first, to: end }];
    return [{ ...first, to: tb - 0.6 }, { from: tb - 0.6, to: end, caption: "Full table, losses included" }];
  },
};
