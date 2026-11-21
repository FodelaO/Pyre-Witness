// Shows the app's actual ringing handset in a second page. The dial action is never activated.
import { openRingingHandset } from "../lib/phone.mjs";

export default {
  id: "phone",
  expensive: true,
  optional: true,
  async prepare({ page, mark }) {
    const { handset, evidence, number } = await openRingingHandset(page);
    mark("ringing", { evidence, number });
    await handset.bringToFront();
    return handset;
  },
  async run({ page }) {
    await page.waitForTimeout(3100);
  },
  edit(_marks, seconds) {
    return [{ from: 0, to: seconds, duration: 2.9, caption: "Paired browser rings · No call placed" }];
  },
};
