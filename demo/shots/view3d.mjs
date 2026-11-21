// Shot: the 2D | 3D switch. Same live twin in 3D (hand-written WebGL), one slow orbit by dragging
// with the real mouse, then back to 2D.
import { require, sel } from "../lib/app.mjs";

const at = (marks, name) => marks.find((m) => m.name === name)?.t;

export default {
  id: "view3d",
  budget: 6.6,
  async prepare({ page, cursor }) {
    await page.keyboard.press("Escape");
    await page.mouse.click(1300, 905); // empty strip: clear the selection so 3D shows the whole plant
    await page.waitForTimeout(500);
    await cursor.place(900, 200);
  },
  async run({ page, cursor, mark }) {
    await page.waitForTimeout(200);
    const on = await require(sel.toggle3d(page, "3D"), "3D switch");
    await cursor.click(on, { ms: 550, label: "3D", verify: async () => (await on.getAttribute("aria-checked")) === "true" });
    mark("on");
    await page.locator("canvas:visible").first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    // Slow orbit: press on empty floor area of the canvas and drag sideways.
    await cursor.glide(1050, 560, 350);
    await page.mouse.down();
    const steps = 42;
    for (let i = 1; i <= steps; i++) { await page.mouse.move(1050 - i * 6, 560 + Math.sin(i / steps * Math.PI) * 18); await page.waitForTimeout(30); }
    await page.mouse.up();
    mark("orbited");
    await page.waitForTimeout(200);
    const off = await require(sel.toggle3d(page, "2D"), "2D switch");
    await cursor.click(off, { ms: 500, label: "2D" });
    mark("off");
    await page.waitForTimeout(700);
    mark("end");
  },
  edit(marks, seconds) {
    const end = Math.min(at(marks, "end") ?? seconds, seconds);
    return [{ from: Math.max(0, at(marks, "on") - 0.9), to: end, caption: "2D | 3D: the same live plant" }];
  },
};
