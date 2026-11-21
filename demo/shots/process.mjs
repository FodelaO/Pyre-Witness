// Shows the running 3D plant and the finished syrup tank's real simulated readings.
import { require, sel, setLens } from "../lib/app.mjs";

const TAG = "TK-203";
const labelFor = (page) => page.locator(".pw3d-label:visible").filter({ has: page.getByText(TAG, { exact: true }) });

async function pickTank(page, cursor) {
  const label = await require(labelFor(page), `3D label ${TAG}`);
  const box = await label.boundingBox();
  // The label sits immediately above the tank's 3D geometry.
  const x = box.x + box.width / 2;
  await cursor.glide(x, box.y + box.height + 16, 650);
  for (const dy of [16, 24, 9, 33]) {
    await page.mouse.click(x, box.y + box.height + dy);
    await page.waitForTimeout(220);
    if (await label.getAttribute("data-selected") === "true") return;
  }
  throw new Error(`Could not pick ${TAG} in 3D`);
}

export default {
  id: "process",
  async prepare({ page, cursor }) {
    const briefing = page.locator(".pw3d-work-briefing button");
    if (await briefing.isVisible()) await briefing.click();
    const alert = page.getByRole("button", { name: "Dismiss escalation card" });
    if (await alert.isVisible()) await alert.click();
    const inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
    if (await inspect.isVisible()) await inspect.click();
    await setLens(page, null, "material");
    await require(sel.plant3d(page), "3D plant process view");
    const reset = page.getByRole("button", { name: "reset view", exact: true });
    await reset.click();
    await require(labelFor(page), `framed 3D label ${TAG}`);
    await cursor.place(1000, 871);
  },
  async run({ page, cursor, mark, log }) {
    await page.waitForTimeout(2250);
    await pickTank(page, cursor);
    const panel = page.locator(".pw-panel-telemetry:visible").first();
    await require(panel.getByText("Finished syrup temperature"), `temperature reading for ${TAG}`);
    await require(panel.getByText("Level", { exact: true }), `level reading for ${TAG}`);
    await panel.scrollIntoViewIfNeeded();
    const first = (await panel.innerText()).replace(/\s+/g, " ").trim();
    mark("tank", { asset: TAG, text: first });
    await cursor.glide(1475, 612, 450);
    await page.waitForTimeout(5900);
    const last = (await panel.innerText()).replace(/\s+/g, " ").trim();
    mark("end", { text: last });
    log(`  ${TAG}: ${first}`);
  },
  edit(marks, seconds) {
    const tank = marks.find((mark) => mark.name === "tank").t;
    const caption = "Live process values (simulated plant)";
    const lead = 2.6;
    return [
      { from: 0, to: lead, duration: lead, caption },
      { from: Math.max(lead, tank - 1.7), to: seconds, duration: 9 - lead, caption },
    ];
  },
};
