// Shot: the lens Material -> Both -> Data with the real keyboard (keys 1 2 3 on the lens slider),
// then one asset's loss figure expanded with "Show more" (itemized calculation, asset drawings).
import { require, lensValue, sel, setLens } from "../lib/app.mjs";

const at = (marks, name) => marks.find((m) => m.name === name)?.t;

export default {
  id: "lens",
  budget: 7.6,
  async prepare({ page, cursor }) {
    await page.keyboard.press("Escape");
    await setLens(page, null, "material");
    await sel.lens(page).focus(); // keyboard focus on the slider so 1 / 2 / 3 reach it
    await page.waitForTimeout(700);
    await cursor.place(1010, 160);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(500);
    await page.keyboard.press("2");
    mark("both", { lens: await lensValue(page) });
    await page.waitForTimeout(1300);
    await page.keyboard.press("3");
    mark("data", { lens: await lensValue(page) });
    log(`  lens now ${await lensValue(page)}`);
    await page.waitForTimeout(1300);
    const hmi = await require(sel.floorAsset(page, "HMI-F3"), "HMI-F3 on the Data drawing");
    await cursor.click(hmi, { ms: 600, label: "HMI-F3" });
    mark("selected");
    await page.waitForTimeout(600);
    const loss = sel.lossSummary(page, "HMI-F3");
    if (!(await loss.count())) throw new Error("no loss figure on HMI-F3");
    await loss.scrollIntoViewIfNeeded();
    await cursor.click(loss, { ms: 600, label: "Show more" });
    mark("loss", { text: (await loss.innerText().catch(() => "")).replace(/\s+/g, " ").trim() });
    await page.waitForTimeout(400);
    const details = page.locator('#pw-results details[data-loss-asset="HMI-F3"][open]').first();
    if (await details.count()) {
      const b = await details.boundingBox();
      if (b) await cursor.glide(b.x + b.width * 0.6, b.y + Math.min(b.height * 0.6, 260), 900);
    }
    await page.waitForTimeout(2000);
    mark("end");
  },
  edit(marks, seconds) {
    const sel2 = at(marks, "selected"), loss = at(marks, "loss"), end = Math.min(at(marks, "end") ?? seconds, seconds);
    const cut = Math.max(sel2 - 0.2, loss - 1.0);
    return [
      { from: 0, to: sel2 - 0.2, caption: "Keys 1 · 2 · 3: Material, Both, Data" },
      { from: cut, to: end, caption: "Show more: the loss, itemized" },
    ];
  },
};
