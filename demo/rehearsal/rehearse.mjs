// Rehearses the 3-minute live demo against the running app: performs every click of
// docs/DEMO_SCRIPT.md in order, measures how long the app takes to answer each one and saves a
// screenshot per step. Everything is ordinary user input; the capture is one real pipeline run.
//
//   node demo/rehearsal/rehearse.mjs --run=r1 --size=1920x1080 --photo=eval/dataset/images/photo-009.jpg
//   node demo/rehearsal/rehearse.mjs --run=dry --size=1280x720            (no capture, no model spend)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const RUN = arg("run", "dry");
const [W, H] = arg("size", "1920x1080").split("x").map(Number);
const PHOTO = arg("photo", null);
const BASE = arg("base", "http://localhost:4119");
const HERE = fileURLToPath(new URL("./", import.meta.url));
const SHOTS = HERE + "shots/";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 240)));
page.on("response", (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`); });

const steps = [];
let n = 0;
const risk = async () => {
  const text = await page.locator("header").first().innerText().catch(() => "");
  return text.replace(/\s+/g, " ").match(/RISK\s*(\d+)/i)?.[1] ?? "?";
};
const shot = async (name) => {
  const file = `${RUN}-${name}.png`;
  await page.screenshot({ path: SHOTS + file }).catch(() => {});
  return "demo/rehearsal/shots/" + file;
};
/** Runs one runbook step, timing only the app's reaction to the click. */
async function step(name, fn) {
  const id = String(++n).padStart(2, "0");
  const t0 = Date.now();
  let ok = true, note = "";
  try { note = (await fn()) ?? ""; } catch (e) { ok = false; note = String(e.message ?? e).split("\n")[0].slice(0, 260); }
  const ms = Date.now() - t0;
  await page.waitForTimeout(350);
  const file = await shot(`${id}-${name}`);
  steps.push({ id, name, ok, ms, risk: await risk(), note, shot: file });
  console.log(`${id} ${ok ? "ok  " : "FAIL"} ${String(ms).padStart(6)} ms  risk ${await risk()}  ${name}  ${note}`);
  return ok;
}
const visible = (loc, timeout = 8000) => loc.first().waitFor({ state: "visible", timeout });
const byName = (name) => page.getByRole("button", { name }).first();
const rail = () => page.locator("#pw-results");

await step("open-app", async () => {
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await visible(page.locator(".lens-toggle"), 60000);
  await page.waitForTimeout(3500);
  return `chip: ${await byName(/^Gemini services/).getAttribute("aria-label")}`;
});

let captured = false;
if (PHOTO) {
  await step("pin-location", async () => {
    await byName("Pin location").click();
    const hmi = await page.locator('[data-floor-asset="HMI-F3"]').first().boundingBox();
    if (!hmi) throw new Error("HMI-F3 not on the floor");
    await page.mouse.click(hmi.x - 60, hmi.y + hmi.height / 2);
    await page.waitForTimeout(400);
    return (await page.locator('button[aria-label^="Pin location"]').first().getAttribute("aria-label")) ?? "";
  });

  let phoneUrl = null;
  await step("phone-qr", async () => {
    await byName("Phone QR").click();
    const link = page.locator('a[aria-label="Open phone capture link"]');
    await visible(link, 10000);
    phoneUrl = await link.getAttribute("href");
    return phoneUrl.replace(/s=.*/, "s=<code>");
  });

  await step("phone-sends-photo", async () => {
    if (!phoneUrl) throw new Error("no phone link");
    const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await phoneCtx.newPage();
    await phone.goto(phoneUrl, { waitUntil: "load", timeout: 20000 });
    await phone.waitForFunction(() => !document.querySelector("#choose-photos")?.disabled, null, { timeout: 15000 });
    await phone.setInputFiles("#phone-library", resolve(PHOTO));
    await phone.waitForFunction(() => !document.querySelector("#send-photos")?.disabled, null, { timeout: 15000 });
    await phone.screenshot({ path: SHOTS + `${RUN}-phone-before-send.png` });
    await phone.click("#send-photos");
    await phone.locator(".pw-phone-sent").waitFor({ state: "visible", timeout: 20000 });
    await phone.screenshot({ path: SHOTS + `${RUN}-phone-sent.png` });
    await phoneCtx.close();
    await visible(page.locator("form.pw-capture-card img"), 10000);
    return "photo arrived on the laptop";
  });

  // One real capture. Logs every change of the crew status so the script can cue the presenter.
  const crewLog = [];
  await step("analyze-and-wait", async () => {
    const submit = page.locator("form.pw-capture-card button[type=submit]:visible").first();
    await submit.click({ timeout: 8000 });
    const t0 = Date.now();
    let last = "", shots = 0, firstRisk = await risk(), riskAt = null;
    while (Date.now() - t0 < 120000) {
      const crew = (await page.locator('button[aria-label^="Open "][aria-label*=" transcript · "]').evaluateAll((els) =>
        els.map((e) => e.getAttribute("aria-label").replace(/^Open | transcript/g, "")))).join(" | ");
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      if (crew !== last) { crewLog.push(`${sec}s ${crew}`); last = crew; }
      if (!riskAt && (await risk()) !== firstRisk) riskAt = sec;
      if ((Date.now() - t0) / 8000 > shots + 1) { shots++; await shot(`04-during-${shots}`); }
      const done = (await page.locator("button.pw-panel-move:visible, .pw-panel-placement-hold:visible").count()) > 0
        && (await page.locator('[aria-label="New capture"]:visible').count()) > 0;
      const failed = (await page.locator("form.pw-capture-card [role=alert]:visible").count()) > 0;
      if (failed) throw new Error("capture error: " + (await page.locator("form.pw-capture-card [role=alert]").first().innerText()).slice(0, 200));
      if (done) { captured = true; return `done in ${sec}s; plant risk first moved at ${riskAt ?? "n/a"}s`; }
      await page.waitForTimeout(400);
    }
    throw new Error("capture did not finish in 120 s");
  });
  writeFileSync(HERE + `crew-${RUN}.txt`, crewLog.join("\n") + "\n");

  await step("answer-rail", async () => {
    const text = await rail().innerText();
    writeFileSync(HERE + `answer-${RUN}.txt`, text + "\n");
    const has = (re) => (re.test(text) ? "yes" : "NO");
    return `where:${has(/recommend|belongs|place/i)} never:${has(/never/i)} paths:${has(/attack path|path/i)} hold:${has(/HOLD/)} move-button:${await page.locator("button.pw-panel-move:visible").count()}`;
  });

  await step("loss-show-more", async () => {
    const more = rail().locator("details[data-loss-asset]:visible > summary").first();
    await more.scrollIntoViewIfNeeded({ timeout: 5000 });
    await more.click();
    await page.waitForTimeout(500);
    return (await more.locator("xpath=..").innerText()).replace(/\s+/g, " ").slice(0, 240);
  });

  await step("move-there", async () => {
    const move = page.locator("button.pw-panel-move:visible").first();
    await move.scrollIntoViewIfNeeded({ timeout: 5000 });
    const before = await risk();
    await move.click();
    const t0 = Date.now();
    while (Date.now() - t0 < 15000 && (await risk()) === before) await page.waitForTimeout(150);
    return `risk ${before} -> ${await risk()}`;
  });
}

await step("lens-data", async () => {
  await page.locator(".lens-toggle").first().focus();
  await page.keyboard.press("3");
  await page.waitForTimeout(1400);
  return await page.locator(".lens-toggle").first().getAttribute("aria-valuetext");
});
await step("lens-both", async () => {
  await page.keyboard.press("2");
  await page.waitForTimeout(1400);
  return await page.locator(".lens-toggle").first().getAttribute("aria-valuetext");
});
await step("select-plc-f3", async () => {
  await page.locator('[data-floor-asset="PLC-F3"]:visible').first().click({ timeout: 5000 });
  await page.waitForTimeout(600);
  return (await rail().innerText()).match(/PLC-F3[^\n]*/)?.[0]?.slice(0, 120) ?? "selected";
});

const SIM = "section.pw-sim-controls:visible";
const outcome = async (timeout = 45000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const text = (await page.locator(`${SIM} .pw-sim-outcome`).first().innerText().catch(() => "")).trim();
    if (text) return text.replace(/\s+/g, " ").slice(0, 200);
    await page.waitForTimeout(150);
  }
  throw new Error("no simulation outcome in time");
};
await step("simulate-cip-crossover", async () => {
  await page.locator(`${SIM} button[aria-label="CIP Crossover"]`).first().click();
  await page.waitForTimeout(250);
  const fast = page.locator(`${SIM} button[aria-label*="Switch to 4"]`).first();
  if (await fast.count()) await fast.click();
  return outcome();
});
await step("approve-mitigation", async () => {
  const approve = page.locator(".pw-panel-proposal button.pw-panel-approve:visible").first();
  await approve.scrollIntoViewIfNeeded({ timeout: 5000 });
  const label = await approve.getAttribute("aria-label");
  await approve.click();
  await page.waitForTimeout(500);
  return label ?? "";
});
await step("rerun-simulation", async () => {
  await page.locator(`${SIM} button[aria-label="Rerun simulation"]`).first().click({ timeout: 5000 });
  await page.waitForTimeout(800);
  return outcome();
});

await step("threat-watch", async () => {
  await byName(/^Threat watch/).click();
  await visible(page.locator("#pw-watch"), 8000);
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && !(await page.locator('#pw-watch button[aria-label^="Approve "]').count())) await page.waitForTimeout(500);
  const more = page.locator("#pw-watch details > summary", { hasText: "Show more" }).first();
  if (await more.count()) { await more.scrollIntoViewIfNeeded(); await more.click(); }
  await page.waitForTimeout(500);
  return `${await byName(/^Threat watch/).getAttribute("aria-label")}; approvals waiting: ${await page.locator('#pw-watch button[aria-label^="Approve "]').count()}`;
});

await step("transcript", async () => {
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 300 } }).catch(() => {});
  await page.keyboard.press("t");
  const drawer = page.locator("dialog.pw-transcript-drawer");
  await visible(drawer, 6000);
  await page.waitForTimeout(500);
  const text = (await drawer.innerText()).replace(/\s+/g, " ");
  return `steps listed; prompt:${/prompt/i.test(text) ? "yes" : "NO"} raw:${/raw/i.test(text) ? "yes" : "NO"} tokens:${/token/i.test(text) ? "yes" : "NO"} :: ${text.slice(0, 160)}`;
});
await step("transcript-close", async () => {
  await page.locator('button[aria-label="Close transcript"]').first().click({ timeout: 4000 });
  await page.waitForTimeout(300);
});

await step("health-chip", async () => {
  await byName(/^Gemini services/).click();
  await page.waitForTimeout(900);
  return (await byName(/^Gemini services/).getAttribute("aria-label")) ?? "";
});
await step("health-chip-close", async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(300); });

await step("proof-page", async () => {
  await page.locator("a.pw-top-proof").first().click();
  await page.waitForURL(/\/proof/, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  return `91.9%:${text.includes("91.9") ? "yes" : "NO"} 19.4%:${text.includes("19.4") ? "yes" : "NO"} :: ${text.slice(0, 140)}`;
});
await step("proof-scroll", async () => {
  await page.mouse.wheel(0, H * 0.9);
  await page.waitForTimeout(900);
});
await step("back-to-plant", async () => {
  await page.getByRole("link", { name: /Plant floor/ }).first().click({ timeout: 5000 });
  await visible(page.locator(".lens-toggle"), 20000);
  await page.waitForTimeout(1200);
  return `captured device still in results: ${(await page.locator("button.pw-panel-move, .pw-panel-placement-hold, [aria-label='New capture']").count()) > 0}`;
});

const total = steps.reduce((sum, s) => sum + s.ms, 0);
const out = { run: RUN, size: `${W}x${H}`, base: BASE, photo: PHOTO, captured, at: new Date().toISOString(), appMs: total, steps, problems };
writeFileSync(HERE + `timings-${RUN}.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`app reaction time, all steps: ${(total / 1000).toFixed(1)} s; failures: ${steps.filter((s) => !s.ok).map((s) => s.name).join(", ") || "none"}`);
if (problems.length) console.log("problems:\n" + problems.slice(0, 12).join("\n"));
await browser.close();
