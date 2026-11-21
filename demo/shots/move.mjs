// Shows the checked destination and records the Move there action and displayed risk.
import { require, riskScore, sel } from "../lib/app.mjs";

export default {
  id: "move",
  expensive: true,
  async prepare({ page, cursor, mark }) {
    const move = await require(sel.moveThere(page), "Move there for the checked PLC placement");
    await move.scrollIntoViewIfNeeded();
    const area = (await page.locator("#pw-results .pw-panel-placement .pw-panel-location button").first().innerText()).trim();
    mark("before", { risk: await riskScore(page), area });
    await cursor.place(1500, 510);
  },
  async run({ page, cursor, mark, log }) {
    const move = sel.moveThere(page);
    await cursor.to(move, 500);
    await move.click({ timeout: 20000 });
    mark("click");
    const receipt = await require(sel.placementLoss(page).filter({ hasText: /Moved.*loss now/i }), "moved placement loss receipt", 10000);
    await receipt.scrollIntoViewIfNeeded();
    const risk = await riskScore(page);
    const text = (await receipt.innerText()).replace(/\s+/g, " ").trim();
    mark("receipt", { text, risk });
    log(`  ${text} · risk ${risk}`);
    await page.waitForTimeout(3900);
  },
  edit(marks, seconds) {
    const area = marks.find((mark) => mark.name === "before").data.area;
    const click = marks.find((mark) => mark.name === "click").t;
    const label = area === "Corporate office" ? "Move it to the office" :
      area === "Packaging" ? "Move it to the packaging line" : `Move it to ${area.toLowerCase()}`;
    return [{ from: Math.max(0, click - 0.65), to: seconds, duration: 3.34,
      caption: label.split(/\s+/).length <= 8 ? label : "Move it to the safer spot" }];
  },
};
