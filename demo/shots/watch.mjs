// Shows distinct advisories, the crew's live review, and a pending fix.
import { require } from "../lib/app.mjs";

const types = ["ransomware", "plcFirmware", "foodRecall"];
const caption = "New information: today's threats, matched to assets";
const dial = (page) => page.getByRole("button", { name: /^Plant risk, \d+ out of 100/ });
const tab = (page, name) => page.getByRole("tab", { name });
const watch = (page) => page.locator("#pw-risk-panel-watch");
const todo = (page) => page.locator("#pw-risk-panel-todo");
const reportTitles = (page) => watch(page).locator(".pw-watch-run .pw-panel-proposal-title > strong");
const cards = (page, type) => watch(page).locator(`.pw-signal-list .pw-watch-alert[data-watch-type="${type}"]`);
const activity = (page) => page.locator('.pw-crew-feed-entry[data-kind="watch"]');

async function resetRail(page) {
  await page.locator(".pw-panel-readouts").evaluate((rail) => { rail.scrollTop = 0; });
}

async function showRow(page, cursor, type, mark) {
  const matches = cards(page, type);
  const linked = matches.filter({ has: page.locator(".pw-watch-asset") });
  const card = await linked.count() ? linked.first() : matches.first();
  await card.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
  await cursor.to(card.locator(".pw-watch-card-toggle"), 300);
  mark("row", {
    type,
    drill: await card.getAttribute("data-watch-drill") === "true",
    headline: await card.locator(".pw-watch-card-toggle").getAttribute("title"),
    asset: await card.locator(".pw-watch-asset").allTextContents(),
  });
  await page.waitForTimeout(2450);
}

async function chooseProposal(page, titles) {
  const panel = await require(todo(page), "To-dos tab panel");
  const more = panel.getByText(/^\d+ more actions?$/);
  if (await more.isVisible()) await more.click();

  const proposed = panel.locator(".pw-todo-card").filter({
    has: page.locator('.pw-todo-metric[data-benefit="true"][title="Predicted risk score change"]'),
  });
  const shortTitles = new Set(titles.map((title) => title.trim().split(/\s+/).slice(0, 4).join(" ")));
  for (const card of await proposed.all()) {
    const metric = await card.locator('[title="Predicted risk score change"]').innerText();
    if (!/^−[\d,.]*[1-9][\d,.]* risk$/.test(metric.trim())) continue;
    const title = await card.locator(".pw-todo-title").innerText();
    if (shortTitles.has(title)) return card;
    const details = card.getByText("See more", { exact: true });
    if (!await details.count()) continue;
    await details.click();
    const text = await card.innerText();
    await details.click();
    if (/Inventory match ·|Simulated drill ·|Sector comparison ·/.test(text)) return card;
  }
}

export default {
  id: "watch",
  async prepare({ page, cursor }) {
    const briefing = page.locator(".pw3d-work-briefing button");
    if (await briefing.isVisible()) await briefing.click();
    const button = await require(dial(page), "plant risk dial");
    if (await button.getAttribute("aria-expanded") === "true") await button.click();
    await resetRail(page);
    await cursor.place(1440, 140);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(450);
    mark("open");
    await cursor.to(dial(page), 350);
    await dial(page).click();
    const threatTab = await require(tab(page, /^Threat watch\b/i), "Threat watch tab");
    await cursor.to(threatTab, 310);
    await threatTab.click();

    const desk = await require(watch(page).getByRole("region", { name: "Plant intelligence" }), "watch desk");
    const run = desk.getByRole("button", { name: "Run now", exact: true });
    await require(watch(page).locator(".pw-signal-list"), "advisory and drill rows", 45000);
    const shown = [];
    for (const type of types) {
      if (await cards(page, type).count()) shown.push(type);
    }
    if (shown.length < 2) throw new Error("Threat watch displayed fewer than two requested advisory types");
    for (const type of shown) await showRow(page, cursor, type, mark);

    await resetRail(page);
    const feed = page.locator(".pw-panel-feed details");
    if (await feed.getAttribute("open") === null) {
      await cursor.to(feed.locator("summary").first(), 280);
      await feed.locator("summary").first().click();
    }
    await cursor.to(run, 340);
    const startedAt = Date.now();
    await run.click();
    const result = await page.waitForFunction((since) => {
      const entries = [...document.querySelectorAll('.pw-crew-feed-entry[data-kind="watch"]')]
        .filter((row) => Date.parse(row.querySelector("time")?.dateTime) >= since);
      const messages = entries.map((row) => row.querySelector(".pw-crew-feed-message")?.textContent ?? "");
      const scout = messages.find((line) => /Reads (advisory|drill scenario)/.test(line));
      const inspector = messages.find((line) => /Rules engine: .*path/.test(line));
      const chief = messages.find((line) => /resolution ready for approval/.test(line));
      const titles = messages.flatMap((line) => line.includes("Proposes: ") ? [line.split("Proposes: ")[1]] : []);
      return scout && inspector && chief && titles.length ? { scout, inspector, chief, titles } : null;
    }, startedAt, { timeout: 65000 });
    const cues = await result.jsonValue();
    const cueRow = activity(page).filter({ hasText: cues.chief }).first();
    await cueRow.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
    mark("crew", cues);
    await page.waitForTimeout(3500);

    const todoTab = tab(page, /^To-dos\b/i);
    await cursor.to(todoTab, 350);
    await todoTab.click();
    let proposal = await chooseProposal(page, [...cues.titles, ...await reportTitles(page).allTextContents()]);
    if (!proposal && !await reportTitles(page).count()) {
      await reportTitles(page).first().waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
      proposal = await chooseProposal(page, [...cues.titles, ...await reportTitles(page).allTextContents()]);
    }
    if (!proposal) throw new Error("No watch proposal with a predicted risk drop appeared in To-dos");
    await proposal.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
    const risk = proposal.locator('.pw-todo-metric[title="Predicted risk score change"]');
    await cursor.to(risk, 280);
    const title = await proposal.locator(".pw-todo-title").innerText();
    const delta = await risk.innerText();
    mark("proposal", { title, delta });
    log(`  Threat watch: ${title} · predicted ${delta}`);
    await page.waitForTimeout(3700);
    mark("end");
  },
  edit(marks, seconds) {
    const at = (name) => marks.find((item) => item.name === name).t;
    const rows = marks.filter(({ name }) => name === "row");
    const rowDuration = 4.5 / rows.length;
    return [
      { from: Math.max(0, at("open") - 0.4), to: rows[0].t, duration: 2.5, caption },
      ...rows.map(({ t }) => ({ from: t, to: t + rowDuration, duration: rowDuration, caption })),
      { from: at("crew"), to: at("crew") + 3.25, duration: 3.25, caption: "The crew checks the threat" },
      { from: at("proposal"), to: Math.min(at("end"), seconds), duration: 3.25, caption: "AI crew proposes a fix" },
    ];
  },
};
