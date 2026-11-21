// Shot: the run transcript drawer (opened with the T key) right after the real capture, so it
// shows that run's prompts and responses. Recorded in the capture session.
import { require } from "../lib/app.mjs";

const at = (marks, name) => marks.find((m) => m.name === name)?.t;

export default {
  id: "transcript",
  expensive: true,
  budget: 2.8,
  async prepare({ page, cursor }) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.mouse.click(1300, 905); // focus the page on an empty strip so T reaches the app
    await cursor.place(1300, 905);
    await page.waitForTimeout(300);
  },
  async run({ page, cursor, mark }) {
    await page.waitForTimeout(250);
    await page.keyboard.press("t");
    await require(page.getByText("Run transcript").first(), "transcript drawer");
    mark("open");
    await page.waitForTimeout(500);
    await cursor.glide(1500, 420, 700);
    await page.waitForTimeout(1500);
    mark("end");
    await page.keyboard.press("Escape");
  },
  edit(marks, seconds) {
    const end = Math.min(at(marks, "end") ?? seconds, seconds);
    return [{ from: 0, to: end, caption: "T: every prompt and response" }];
  },
};
