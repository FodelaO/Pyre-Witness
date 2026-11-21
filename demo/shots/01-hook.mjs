// Shot: the living plant floor with the AI crew on idle patrol; open the filler's live card (hook).
import { collapseCapture, openApp, sel, require } from "../lib/app.mjs";

export default {
  id: "hook",
  caption: "A living twin of bottling Line 3",
  duration: 6,
  async setup({ page, cursor }) {
    await openApp(page);
    await collapseCapture(page);
    await cursor.place(1180, 860);
  },
  async run({ page, cursor }) {
    await page.waitForTimeout(700);
    const filler = await require(sel.floorAsset(page, "FIL-3"), "floor asset FIL-3");
    await cursor.click(filler, { ms: 1900, label: "FIL-3 on floor" }); // opens the real selection card
    await page.waitForTimeout(3300);
  },
};
