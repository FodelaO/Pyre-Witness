// Shot: approving the controller-access isolation drops the live plant risk score.
import { approve, collapseCapture, openApp, rerun, riskScore, runScenario } from "../lib/app.mjs";

export default {
  id: "risk",
  caption: "Approve isolation: plant risk drops",
  duration: 5.5,
  async setup({ page, cursor }) {
    await openApp(page);
    await collapseCapture(page);
    await cursor.place(520, 330);
    await runScenario(page, cursor, "CIP Crossover");
    await approve(page, cursor, "Isolate CIP branch");
    await rerun(page, cursor);
    await cursor.place(1500, 420);
    await page.waitForTimeout(600);
  },
  async run({ page, cursor, log }) {
    await page.waitForTimeout(300);
    const before = await riskScore(page);
    await approve(page, cursor, "Isolate controller access");
    await page.waitForTimeout(600);
    await cursor.glide(1640, 120, 900); // toward the risk dial
    await page.waitForTimeout(2200);
    const after = await riskScore(page);
    log(`  risk ${before} -> ${after}`);
  },
};
