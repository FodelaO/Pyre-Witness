// Pairs a disposable browser handset to show the alert without requesting a dial.
import { BASE_URL, require, sel } from "./app.mjs";

const FAKE_NUMBER = "+1 555 0100";

export async function openRingingHandset(page) {
  const card = sel.escalation(page);
  const contact = await require(card.getByRole("button", { name: "Add your phone" }), "Add your phone on the alert");
  await contact.click();
  const dialog = page.getByRole("dialog", { name: "Add your phone" });
  await dialog.getByLabel("Phone number").fill(FAKE_NUMBER);
  const automatic = dialog.getByRole("checkbox", { name: /call this number/i });
  if (await automatic.isChecked()) await automatic.uncheck();
  await dialog.getByRole("button", { name: "Save phone" }).click();

  await card.getByRole("button", { name: "Pair a phone to call you" }).click();
  const link = await require(page.getByRole("link", { name: "Open paired phone link" }), "phone pairing link", 12000);
  const path = new URL(await link.getAttribute("href"), BASE_URL).pathname;
  if (!/^\/call\/[a-f\d]{24}$/.test(path)) throw new Error("Unexpected phone pairing route");
  const handset = await page.context().newPage();
  try {
    await handset.goto(new URL(path, BASE_URL).href, { timeout: 18000 });
    const headline = handset.locator("#headline").filter({ hasText: /incoming|ringing/i });
    await require(headline, "paired handset ringing", 20000);
    const dial = await require(handset.locator("#dial").filter({ hasText: /call on-call.*0100/i }), "fake-number Call on-call control");
    return { handset, evidence: (await dial.innerText()).trim(), number: FAKE_NUMBER };
  } catch (error) {
    await handset.close();
    throw error;
  } finally {
    const close = page.getByRole("button", { name: "Close pairing", exact: true });
    if (await close.isVisible()) await close.click().catch(() => {});
  }
}
