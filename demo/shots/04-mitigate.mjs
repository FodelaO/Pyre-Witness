// Shot: a human approves the proposed CIP branch isolation and reruns: contained sooner.
import { approve, collapseCapture, openApp, rerun, runScenario } from "../lib/app.mjs";

export default {
  id: "mitigate",
  caption: "Approve the fix, rerun: contained sooner",
  duration: 7,
  async setup({ page, cursor }) {
    await openApp(page);
    await collapseCapture(page);
    await cursor.place(520, 330);
    await runScenario(page, cursor, "CIP Crossover");
    await cursor.place(1650, 260);
    await page.waitForTimeout(600);
  },
  async run({ page, cursor, log }) {
    await page.waitForTimeout(300);
    await approve(page, cursor, "Isolate CIP branch");
    await page.waitForTimeout(700);
    const outcome = await rerun(page, cursor);
    log(`  outcome: ${outcome}`);
    await page.waitForTimeout(1600);
  },
};
