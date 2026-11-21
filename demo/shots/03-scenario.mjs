// Shot: run the CIP crossover tabletop scenario at 4x; it stops at a safeguard and proposes fixes.
import { collapseCapture, openApp, runScenario, setFast } from "../lib/app.mjs";

export default {
  id: "scenario",
  caption: "Simulate a CIP caustic crossover",
  duration: 7.5,
  async setup({ page, cursor }) {
    await openApp(page);
    await collapseCapture(page);
    await setFast(page, cursor); // 4x replay speed, set before the take
    await cursor.place(330, 300);
  },
  async run({ page, cursor, log }) {
    await page.waitForTimeout(300);
    const outcome = await runScenario(page, cursor, "CIP Crossover");
    log(`  outcome: ${outcome}`);
    await page.waitForTimeout(700);
    await cursor.glide(1700, 330, 1000); // toward the mitigation queue that just appeared
    await page.waitForTimeout(1400);
  },
};
