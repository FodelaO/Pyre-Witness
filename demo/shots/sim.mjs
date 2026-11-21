// Shot: Ammonia Release tabletop (the app labels it SIMULATION), approve the proposed mitigation,
// rerun and open the simulation comparison.
import { require, rerun, runScenario, sel, setLens } from "../lib/app.mjs";

const at = (marks, name) => marks.find((m) => m.name === name)?.t;
const secs = (o) => { const m = /in (\d+):(\d+)/.exec(o ?? ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
function resultCaption(marks) {
  const a = secs(marks.find((m) => m.name === "outcome1")?.data?.outcome), b = secs(marks.find((m) => m.name === "outcome2")?.data?.outcome);
  if (a != null && b != null && b < a) return `Contained ${a - b} s sooner, side by side`;
  return "Rerun compared side by side";
}

export default {
  id: "sim",
  budget: 10,
  async prepare({ page, cursor }) {
    await page.keyboard.press("Escape");
    await setLens(page, null, "material");
    await page.waitForTimeout(800);
    await cursor.place(700, 900);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(200);
    const first = await runScenario(page, cursor, "Ammonia Release");
    mark("outcome1", { outcome: first });
    log(`  outcome: ${first}`);
    await page.waitForTimeout(900);
    const approve = await require(sel.simApprove(page), "simulation mitigation Approve button");
    const title = (await approve.getAttribute("aria-label"))?.replace(/^Approve /, "");
    await cursor.click(approve, { ms: 700, label: "Approve mitigation" });
    mark("approved", { title });
    await page.waitForTimeout(500);
    const second = await rerun(page, cursor);
    mark("outcome2", { outcome: second });
    log(`  approved "${title}", rerun: ${second}`);
    await page.waitForTimeout(500);
    const comp = sel.simComparison(page);
    if (await comp.count()) { await cursor.click(comp, { ms: 700, label: "Simulation comparison" }); }
    await page.waitForTimeout(2300);
    mark("end");
  },
  edit(marks, seconds) {
    const o1 = at(marks, "outcome1"), o2 = at(marks, "outcome2"), end = Math.min(at(marks, "end") ?? seconds, seconds);
    return [
      { from: 0, to: o1 + 0.8, fit: 4.2, caption: "Simulated ammonia release" },
      { from: o1 + 0.8, to: o2 + 0.4, fit: 3, caption: "Approve a fix, rerun" },
      { from: o2 + 0.4, to: end, caption: resultCaption(marks) },
    ];
  },
};
