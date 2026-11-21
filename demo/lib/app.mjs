// Selectors and multi-step interactions with the real Pyre Witness app, shared by the shots.
// Everything here is ordinary user input (mouse / keyboard) on the running app.

export const BASE_URL = process.env.DEMO_URL ?? "http://localhost:4119";

/** Thrown when the UI a shot needs is not there; record.mjs skips the shot and reports it. */
export class MissingFeature extends Error {}

export const sel = {
  viewTab: (page, name) => page.getByRole("tab", { name }),
  floorAsset: (page, id) => page.locator(`[data-floor-asset="${id}"]`).first(),
  purdueAsset: (page, id) => page.locator(`.pw-purdue-node[data-asset="${id}"]`).first(),
  simSection: (page) => page.locator("section.pw-sim-controls:visible").first(),
  // Two UI generations are supported: labelled launcher cards (title="Run X simulation") and the
  // icon dock (aria-label="X").
  scenario: (page, label) =>
    page.locator(`section.pw-sim-controls:visible button:is([title="Run ${label} simulation"], [aria-label="${label}"])`).first(),
  speedTo4: (page) => page.locator('section.pw-sim-controls:visible button[aria-label*="Switch to 4"]').first(),
  outcome: (page) => page.locator("section.pw-sim-controls:visible .pw-sim-outcome").first(),
  rerun: (page) => page.locator("button[aria-label='Rerun simulation']"),
  approve: (page, title) => page.locator(`button[aria-label="Approve ${title}"]`),
  collapseCapture: (page) => page.getByRole("button", { name: "Collapse capture" }),
};

/** Reads the live plant risk number from the top bar (works across top-bar versions). */
export async function riskScore(page) {
  const text = await page.locator("header").first().innerText().catch(() => "");
  return text.replace(/\s+/g, " ").match(/RISK\s*(\d+)/i)?.[1] ?? "?";
}

export async function require(locator, what) {
  try {
    await locator.first().waitFor({ state: "attached", timeout: 6000 });
  } catch {
    throw new MissingFeature(`missing UI: ${what}`);
  }
  return locator;
}

export async function openApp(page) {
  await page.goto(BASE_URL + "/", { waitUntil: "load", timeout: 90000 });
  await sel.viewTab(page, "Plant floor").first().waitFor({ timeout: 60000 }).catch(() => { throw new MissingFeature("missing UI: view switch (Plant floor tab)"); });
  await page.waitForTimeout(2500); // let lazy slots mount and the crew start its patrol
}

/** Collapses the capture card so the floor (and the crew office) is fully visible. */
export async function collapseCapture(page, cursor) {
  const btn = sel.collapseCapture(page);
  if (await btn.count()) {
    if (cursor) await cursor.click(btn, { label: "Collapse capture" });
    else await btn.click();
    await page.waitForTimeout(400);
  }
}

export async function simText(page) {
  return (await sel.simSection(page).innerText().catch(() => "")) ?? "";
}

export async function waitForOutcome(page, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const outcome = sel.outcome(page);
    if (await outcome.count()) {
      const text = (await outcome.innerText().catch(() => "")).trim();
      if (text) return text;
    }
    await page.waitForTimeout(150);
  }
  throw new Error("simulation did not reach an outcome in time");
}

/** Switches the replay to 4x speed (no-op if already there). */
export async function setFast(page, cursor) {
  const speed = sel.speedTo4(page);
  if (await speed.count()) {
    await cursor.click(speed, { label: "4x speed", verify: async () => (await sel.speedTo4(page).count()) === 0 });
  }
}

/** Sets 4x speed and runs a scenario to its end (used directly or as setup for later shots). */
export async function runScenario(page, cursor, label) {
  await setFast(page, cursor); // older UI: speed toggle is always visible
  const btn = await require(sel.scenario(page, label), `${label} scenario launcher`);
  await cursor.click(btn, {
    label: `${label} launcher`,
    verify: async () => (await btn.getAttribute("aria-pressed")) === "true",
  });
  await page.waitForTimeout(250);
  await setFast(page, cursor); // newer UI: speed toggle appears once a run exists
  return waitForOutcome(page);
}

export async function approve(page, cursor, title) {
  const btn = await require(sel.approve(page, title), `Approve "${title}" mitigation`);
  await cursor.click(btn, { label: `Approve ${title}`, verify: async () => (await sel.approve(page, title).count()) === 0 });
}

export async function rerun(page, cursor) {
  const btn = await require(sel.rerun(page), "Rerun simulation button");
  await cursor.click(btn, { label: "Rerun", verify: async () => (await sel.rerun(page).count()) === 0 });
  return waitForOutcome(page);
}
