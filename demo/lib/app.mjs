// Selectors and multi-step interactions with the real Pyre Witness app, shared by the shots.
// Everything here is ordinary user input (mouse / keyboard / the app's own file chooser).

// The final cut is recorded ONLY from the final demo build on port 4120.
// `--url=http://localhost:4119` (or DEMO_URL) is for selector rehearsals only.
const urlArg = process.argv.find((a) => a.startsWith("--url="))?.slice(6);
export const BASE_URL = urlArg ?? process.env.DEMO_URL ?? "http://localhost:4120";
export const DRY_CAPTURE = process.argv.includes("--dry-capture") || !!process.env.DEMO_DRY_CAPTURE;

/** Thrown when the UI a shot needs is not there; record.mjs skips the shot and reports it. */
export class MissingFeature extends Error {}

const SIM = "section.pw-sim-controls:visible";

export const sel = {
  lens: (page) => page.locator(".lens-toggle").first(),
  lensStop: (page, stop) => page.locator(`.lens-toggle .lens-toggle-stop[data-stop="${stop}"]`).first(),
  floorAsset: (page, id) => page.locator(`[data-floor-asset="${id}"]:visible`).first(),
  dock: (page, label) => page.locator(`.pw-capture-toolbar button[aria-label="${label}"]:visible`).first(),
  pinButton: (page) => page.locator('button[aria-label^="Pin location"]:visible').first(),
  describe: (page) => page.locator("form.pw-capture-card textarea[name=description]:visible").first(),
  placementLoss: (page) => page.locator("#pw-results [data-placement-loss]:visible").first(),
  escalation: (page) => page.locator("section.pw-es-alert:visible").first(),
  toggle3d: (page, label) => page.locator(".pw3d-toggle button", { hasText: label }).first(),
  watchDesk: (page) => page.locator("section.pw-signal-desk:visible").first(),
  recallRow: (page) => page.locator("section.pw-signal-desk li:visible").filter({ has: page.locator(".pw-signal-recall-note") }).first(),
  advisoryRow: (page) => page.locator("section.pw-signal-desk li:visible").filter({ hasNot: page.locator(".pw-signal-recall-note") }).first(),
  analyze: (page) => page.locator("form.pw-capture-card button[type=submit]:visible").first(),
  moveThere: (page) => page.locator("button.pw-panel-move:visible").first(),
  hold: (page) => page.locator(".pw-panel-placement-hold:visible").first(),
  scenario: (page, label) => page.locator(`${SIM} button:is([title="Run ${label} simulation"], [aria-label="${label}"])`).first(),
  speedTo4: (page) => page.locator(`${SIM} button[aria-label*="Switch to 4"]`).first(),
  outcome: (page) => page.locator(`${SIM} .pw-sim-outcome`).first(),
  rerun: (page) => page.locator(`${SIM} button[aria-label="Rerun simulation"]`).first(),
  // Only proposals the simulation produced (they carry a simulated projection), not capture ones.
  simApprove: (page) => page.locator(".pw-panel-proposal:visible").filter({ hasText: /Simulated projection/ }).locator("button.pw-panel-approve").first(),
  simComparison: (page) => page.locator("#pw-results").getByText("Simulation comparison", { exact: true }).first(),
  watchToggle: (page) => page.locator("button.pw-top-watch").first(),
  watchApprove: (page) => page.locator('#pw-watch button[aria-label^="Approve "]:visible').first(),
  lossSummary: (page, assetId) => page.locator(`#pw-results details[data-loss-asset="${assetId}"]:visible > summary`).first(),
  proofLink: (page) => page.locator("a.pw-top-proof").first(),
  backToPlant: (page) => page.getByRole("link", { name: /Plant floor/ }).first(),
  servicesChip: (page) => page.getByRole("button", { name: /^Gemini services/ }).first(),
  transcriptButton: (page) => page.getByRole("button", { name: "Open transcript" }).first(),
};

export async function require(locator, what, timeout = 8000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
  } catch {
    throw new MissingFeature(`missing UI: ${what}`);
  }
  return locator;
}

export async function openApp(page) {
  await page.goto(BASE_URL + "/", { waitUntil: "load", timeout: 90000 });
  await require(sel.lens(page), "lens toggle (Material / Both / Data)", 60000);
  await page.waitForTimeout(4000); // lazy slots mount, crew starts its idle patrol
}

export async function lensValue(page) {
  return (await sel.lens(page).getAttribute("aria-valuetext").catch(() => null)) ?? "?";
}

/** Sets the lens with the cursor (click on the stop), falling back to the slider's 1/2/3 keys. */
export async function setLens(page, cursor, stop, { ms = 600 } = {}) {
  const want = { material: "Material", both: "Both", data: "Data" }[stop];
  if ((await lensValue(page)) === want) return;
  const target = await require(sel.lensStop(page, stop), `lens stop ${stop}`);
  const verify = async () => (await lensValue(page)) === want;
  if (cursor) {
    await cursor.click(target, { ms, label: `lens ${want}`, verify, keyFallback: async () => {
      await sel.lens(page).focus();
      await page.keyboard.press({ material: "1", both: "2", data: "3" }[stop]);
    } });
  } else {
    await sel.lens(page).focus();
    await page.keyboard.press({ material: "1", both: "2", data: "3" }[stop]);
  }
}

export async function waitForOutcome(page, timeout = 40000) {
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

export async function setFast(page, cursor) {
  const speed = sel.speedTo4(page);
  if (await speed.count()) await cursor.click(speed, { label: "4x speed", verify: async () => (await sel.speedTo4(page).count()) === 0 });
}

/** Starts a scenario, switches the replay to 4x and waits for the outcome line. */
export async function runScenario(page, cursor, label) {
  const btn = await require(sel.scenario(page, label), `${label} scenario launcher`);
  await cursor.click(btn, { label: `${label} launcher`, verify: async () => (await btn.getAttribute("aria-pressed")) === "true" });
  await page.waitForTimeout(250);
  await setFast(page, cursor);
  return waitForOutcome(page);
}

export async function rerun(page, cursor) {
  const btn = await require(sel.rerun(page), "Rerun simulation button");
  await cursor.click(btn, { label: "Rerun", verify: async () => (await sel.rerun(page).count()) === 0 });
  return waitForOutcome(page);
}

/** Reads the live plant risk number from the top bar. */
export async function riskScore(page) {
  const text = await page.locator("header").first().innerText().catch(() => "");
  return text.replace(/\s+/g, " ").match(/RISK\s*(\d+)/i)?.[1] ?? "?";
}

/** Waits until the threat watch has approvals ready (it runs on its own after page load). */
export async function waitForWatch(page, timeout = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.locator('#pw-watch button[aria-label^="Approve "]').count()) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}
