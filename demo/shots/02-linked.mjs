// Shot: split view; selecting on the floor highlights the Purdue map and vice versa.
import { collapseCapture, openApp, require, sel } from "../lib/app.mjs";

export default {
  id: "linked",
  caption: "Floor and Purdue map stay linked",
  duration: 7.5,
  async setup({ page, cursor }) {
    await openApp(page);
    await collapseCapture(page);
    await cursor.place(1500, 300);
  },
  async run({ page, cursor }) {
    await page.waitForTimeout(300);
    const split = await require(sel.viewTab(page, "Side by side"), "Side by side view tab");
    await cursor.click(split, { ms: 600, label: "Side by side tab" });
    await page.waitForTimeout(1100);
    const plc = await require(sel.floorAsset(page, "PLC-F3"), "floor asset PLC-F3");
    await cursor.click(plc, { ms: 900, label: "PLC-F3 on floor" });
    await page.waitForTimeout(1500);
    const hmi = await require(sel.purdueAsset(page, "HMI-F3"), "Purdue node HMI-F3");
    await cursor.click(hmi, { ms: 900, label: "HMI-F3 on Purdue map" });
    await page.waitForTimeout(1700);
  },
};
