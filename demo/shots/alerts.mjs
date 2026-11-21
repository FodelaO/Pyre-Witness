// Runs the dock's built-in alert test and holds the decision beside the flagged 3D twin.
import { require, sel } from "../lib/app.mjs";

const dial = (page) => page.getByRole("button", { name: /^Plant risk, \d+ out of 100/ });
const dock = (page) => page.getByRole("region", { name: "Agents", exact: true });
const chip = (page) => dock(page).getByRole("button", { name: "Escalation thresholds", exact: true });
const settings = (page) => dock(page).getByRole("region", { name: "Escalation settings", exact: true });
const testButton = (page, name = "Run test alert") => settings(page).getByRole("button", { name, exact: true });

export default {
  id: "alerts",
  async prepare({ page, cursor }) {
    await require(sel.plant3d(page), "3D plant for the alert test");
    const briefing = page.locator(".pw3d-work-briefing button");
    if (await briefing.isVisible()) await briefing.click();
    if (await dial(page).getAttribute("aria-expanded") === "true") await dial(page).click();
    await page.getByRole("button", { name: "reset view", exact: true }).click();
    const escalation = await require(chip(page), "Agents dock escalation chip");
    if (await escalation.getAttribute("aria-expanded") !== "true") await escalation.click();
    await require(settings(page), "Escalation settings");
    const clear = testButton(page, "Clear test");
    if (await clear.isVisible()) await clear.click();
    else await escalation.click();
    await settings(page).waitFor({ state: "hidden" });
    await cursor.to(escalation, 350);
  },
  async run({ page, cursor, mark, log }) {
    const started = performance.now();
    await page.waitForTimeout(350);
    mark("test");
    await chip(page).click();
    const run = await require(testButton(page), "Run test alert in the Agents dock");
    await cursor.to(run, 300);
    await page.waitForTimeout(250);
    await run.click();

    const ladder = dock(page).getByRole("region", { name: "Alert ladder", exact: true })
      .filter({ has: page.getByText("TEST SCENARIO", { exact: true }) });
    const flagged = await require(ladder.getByRole("button", { name: /^Flag · PT-401 · Flagged$/ }), "active Flag icon");
    await cursor.to(flagged, 280);
    const flag = await require(page.locator('.pw3d-overlay .pw3d-escalation-flag[title^="TEST SCENARIO"]:visible')
      .filter({ hasText: /^!$/ }).first(), "test flag on the 3D plant");
    await cursor.to(flag, 400);
    mark("flag");
    await page.waitForTimeout(Math.max(500, 3900 - (performance.now() - started)));

    const message = await require(ladder.getByRole("button", { name: /^Message · HMI-F3 · / }), "active Message icon");
    await cursor.to(message, 350);
    const status = (await message.getAttribute("aria-label")).replace(/^Message · HMI-F3 · /, "");
    mark("message", { status });
    await page.waitForTimeout(Math.max(850, 6650 - (performance.now() - started)));

    const call = await require(ladder.getByRole("button", { name: /^Call · TEST-901 · / }), "active Call icon");
    await cursor.to(call, 300);
    await call.click();
    const details = ladder.getByRole("region", { name: "Call details", exact: true });
    const decisionLine = await require(details.getByText(/^(Decision · gemini-decision-1:|Decision unavailable$)/), "test call decision", 12000);
    const decision = await decisionLine.innerText();
    if (decision === "Decision unavailable") throw new Error("Gemini decision unavailable for the test call");
    await require(details.getByRole("button", { name: "Approve", exact: true }), "Approve decision control");
    await require(details.getByRole("button", { name: "Override", exact: true }), "Override decision control");
    mark("call", { decision });
    await cursor.to(flag, 550);
    await page.waitForTimeout(4000);
    mark("end");
    log(`  Alert test: PT-401 flagged · HMI-F3 ${status} · ${decision}`);
  },
  edit(marks, seconds) {
    const at = (name) => marks.find((item) => item.name === name).t;
    const start = Math.max(0, at("test") - 0.15);
    const message = at("message");
    const call = at("call");
    // Fit both interactions into the cut even when rendering or the decision runs slowly.
    return [
      { from: start, to: message, speed: Math.max(1, (message - start) / 3.8),
        duration: 3.8, caption: "Low risk: a flag on the asset" },
      { from: message, to: call, speed: Math.max(1, (call - message) / 2.85),
        duration: 2.85, caption: "Medium: a message to the phone" },
      { from: call, to: Math.min(at("end"), seconds), duration: 3.75, caption: "High: a call, the human decides" },
    ];
  },
};
