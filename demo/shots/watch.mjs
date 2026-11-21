// Opens live monitoring from its green dot and shows a priced CISA advisory and FDA recall.
import { require, sel } from "../lib/app.mjs";

const priced = (page, source) => page.locator(`.pw-signal-row[data-watch-source="${source}"]:visible`)
  .filter({ has: page.locator(".pw-signal-loss") }).first();
const compact = (text) => text.replace(/\s+/g, " ").trim();
const caption = "Today's cyber news, matched to this plant";

async function showRow(page, cursor, row, mark, name) {
  await row.evaluate((node) => node.scrollIntoView({ block: "center" }));
  await cursor.to(row, 340);
  const data = await row.evaluate((node) => ({
    title: node.querySelector(".pw-signal-title").textContent.trim(),
    link: node.querySelector(".pw-signal-title").href,
    text: node.innerText,
  }));
  mark(name, { ...data, text: compact(data.text) });
}

export default {
  id: "watch",
  async prepare({ page, cursor }) {
    const button = sel.watchToggle(page);
    await require(button, "green threat watch status dot");
    if (await button.getAttribute("aria-expanded") !== "true") await button.click();
    await require(priced(page, "cisa-ics"), "priced CISA industrial advisory", 45000);
    await require(priced(page, "openfda"), "priced FDA beverage recall", 30000);
    if (await button.getAttribute("aria-expanded") === "true") await button.click();
    await page.locator(".pw-panel-readouts").evaluate((node) => { node.scrollTop = 0; });
    await cursor.place(1515, 141);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(350);
    const button = sel.watchToggle(page);
    mark("dot", { label: await button.getAttribute("aria-label"), tone: await button.locator(".pw-live-pulse").getAttribute("data-tone") });
    await cursor.to(button, 470);
    await button.click();
    await require(priced(page, "cisa-ics"), "CISA advisory after opening watch");
    await showRow(page, cursor, priced(page, "cisa-ics"), mark, "cisa");
    await page.waitForTimeout(3660);
    await showRow(page, cursor, priced(page, "openfda"), mark, "fda");
    await page.waitForTimeout(4620);
    mark("end");
    log(`  FDA: ${compact(await priced(page, "openfda").innerText()).slice(0, 245)}`);
  },
  edit(marks, seconds) {
    const at = (name) => marks.find((mark) => mark.name === name).t;
    return [
      { from: Math.max(0, at("cisa") - 5), to: at("fda") - 0.45, duration: 4.5, caption },
      { from: at("fda") - 0.2, to: Math.min(at("end"), seconds), duration: 4.5, caption },
    ];
  },
};
