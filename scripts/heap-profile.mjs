#!/usr/bin/env node
/**
 * Repeatable browser heap profile of the main Pyre Witness screen.
 *
 * Drives a fixed, model-free scenario (no capture, no Threat Watch run, no voice) in the installed
 * Chrome and, after a forced garbage collection at each step, records JS heap used, live DOM nodes
 * and JS event listeners. Run it before and after a change and compare the two JSON files.
 *
 *   node scripts/heap-profile.mjs --label baseline --out docs/log/memory-baseline.json
 *   node scripts/heap-profile.mjs --label after    --out docs/log/memory-after.json
 *
 * Needs the dev server on http://localhost:4119 (never started here). Takes under 3 minutes.
 * A step whose control is missing is recorded as skipped, with the reason, and still sampled.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");

function argument(name, fallback) {
  const index = process.argv.indexOf("--" + name);
  const value = index > -1 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : fallback;
}

const label = argument("label", "run");
const out = resolve(argument("out", "docs/log/memory-" + label + ".json"));
const url = argument("url", "http://localhost:4119/");
const trackAllocations = process.argv.includes("--allocations");
// Leak check (--cycles N): repeat the interactive steps N times. Retained state levels off after the
// first pass; a leak adds the same amount on every pass.
const cycles = Math.max(1, Math.min(6, Number(argument("cycles", "1")) || 1));
// The scenario is defined on the 2D floor (it selects [data-floor-asset] symbols), so the page is
// opened in 2D. Pass --start-view app to keep whatever view the app opens with (3D since 15:00 on
// 2026-11-21); the steps that need the floor then switch to 2D themselves.
const startView = argument("start-view", "2d");

// With --cycles 3 or more, --snapshots compares the heap after pass 2 with the heap after the last
// pass, by object kind: it names what a slow rise is made of (application objects or compiled code).
const compareSnapshots = process.argv.includes("--snapshots") && cycles >= 3;

const VIEWPORT = { width: 1440, height: 900 };
// Hard ceiling for the standard scenario (brief: under 3 minutes); each extra pass gets a minute.
const BUDGET_MS = 172_000 + (cycles - 1) * 60_000 + (compareSnapshots ? 60_000 : 0);
const MB = 1024 * 1024;
const startedAt = Date.now();
const left = () => BUDGET_MS - (Date.now() - startedAt);
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const skip = (reason) => ({ status: "skipped", reason });
const partial = (reason, detail = {}) => ({ status: "partial", reason, ...detail });
const signed = (value) => (value >= 0 ? "+" : "") + value;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-precise-memory-info", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
if (startView === "2d") {
  // The app remembers the viewer's 2D / 3D choice under this key (src/view3d/view3dStore.ts).
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("pw-view", "2d");
    } catch {
      // Storage blocked: ensure2D() below switches through the control instead.
    }
  });
}
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
await cdp.send("HeapProfiler.enable");

// Other agents edit this working tree while the dev server hot-reloads it. A hot update or a full
// reload in mid-run changes the heap, so once the page has rendered, dev-server messages to this
// page are held back: it keeps the code it loaded with for the whole run. The socket stays connected
// and nothing is changed on the server. Pass --live-reload to measure with hot updates applied.
let hotReloadHeld = false;
let holdUpdates = false;
let heldMessages = 0;
if (!process.argv.includes("--live-reload")) {
  try {
    await page.routeWebSocket(/\/_next\//, (socket) => {
      const server = socket.connectToServer();
      server.onMessage((message) => {
        if (holdUpdates) heldMessages += 1;
        else socket.send(message);
      });
    });
    hotReloadHeld = true;
  } catch {
    // Older Playwright: the run still works, with the noise recorded below.
  }
}
const problems = [];
const devServerMessages = {};
const loads = [];
let buildErrors = 0;
const reloaded = () => loads.length > 1;
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/^\.\/src\//.test(text)) buildErrors += 1; // a source file did not compile while we were measuring
  problems.push("console.error: " + text.slice(0, 200));
});
page.on("pageerror", (error) => problems.push("pageerror: " + String(error).slice(0, 200)));
page.on("load", () => loads.push(round((Date.now() - startedAt) / 1000, 1)));
page.on("websocket", (socket) => {
  if (!socket.url().includes("/_next/")) return;
  socket.on("framereceived", ({ payload }) => {
    let kind = "binary";
    try {
      const message = JSON.parse(String(payload));
      kind = String(message.type ?? message.action ?? "other");
    } catch {
      // Not a JSON frame.
    }
    devServerMessages[kind] = (devServerMessages[kind] ?? 0) + 1;
  });
});

const samples = [];

/** Forces a full collection twice (the second pass frees what weak callbacks released), then reads. */
async function sample(step, outcome, durationMs) {
  const dom = await page.evaluate(() => {
    let storageChars = 0;
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index) ?? "";
        storageChars += key.length + (store.getItem(key)?.length ?? 0);
      }
    }
    // Nodes still in the document, by region. The CDP node counter also includes detached nodes, so
    // growth there without growth here is a detached subtree that something still holds.
    const count = (root) => {
      if (!root) return 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
      let nodes = 1;
      while (walker.nextNode()) nodes += 1;
      return nodes;
    };
    return {
      canvases: document.querySelectorAll("canvas").length,
      storageChars,
      // React's development build records render timings here; they grow with every render.
      performanceEntries: performance.getEntries().length,
      attached: {
        document: count(document),
        stage: count(document.querySelector("main.pw-stage")),
        rail: count(document.querySelector("aside.pw-rail")),
        activityFeed: count(document.querySelector(".pw-crew-feed")),
        activityRows: document.querySelectorAll(".pw-crew-feed-entry").length,
      },
    };
  }).catch(() => ({ canvases: null, storageChars: null, performanceEntries: null, attached: null }));
  // Console arguments kept alive for DevTools would otherwise count as application heap.
  await cdp.send("Runtime.discardConsoleEntries").catch(() => {});
  await cdp.send("HeapProfiler.collectGarbage");
  await page.waitForTimeout(150);
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  const metric = Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
  const usage = await cdp.send("Runtime.getHeapUsage").catch(() => null);
  const { status = "ok", reason, ...detail } = outcome;
  const row = {
    step,
    status,
    ...(reason ? { reason } : {}),
    heapUsedMB: round(metric.JSHeapUsedSize / MB),
    heapTotalMB: round(metric.JSHeapTotalSize / MB),
    domNodes: metric.Nodes,
    jsEventListeners: metric.JSEventListeners,
    documents: metric.Documents,
    // Array buffers plus external strings (in a dev build mostly script source), outside the JS heap figure.
    backingStoreMB: usage?.backingStorageSize === undefined ? null : round(usage.backingStorageSize / MB),
    canvases: dom.canvases,
    storageChars: dom.storageChars,
    performanceEntries: dom.performanceEntries,
    attached: dom.attached,
    atSeconds: round((Date.now() - startedAt) / 1000, 1),
    stepSeconds: round(durationMs / 1000, 1),
    ...(Object.keys(detail).length ? { detail } : {}),
  };
  samples.push(row);
  console.log("  " + step.padEnd(30) + String(row.heapUsedMB.toFixed(2)).padStart(8) + " MB" + String(row.domNodes).padStart(8) + " nodes"
    + String(row.jsEventListeners).padStart(7) + " listeners" + (status === "ok" ? "" : "   [" + status + ": " + reason + "]"));
  return row;
}

/** Takes a heap snapshot and sums it by object kind; DOM nodes the page has dropped are counted apart. */
async function heapByKind() {
  const chunks = [];
  const collect = ({ chunk }) => chunks.push(chunk);
  cdp.on("HeapProfiler.addHeapSnapshotChunk", collect);
  await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  cdp.off("HeapProfiler.addHeapSnapshotChunk", collect);
  const { snapshot, nodes, strings } = JSON.parse(chunks.join(""));
  const fields = snapshot.meta.node_fields;
  const at = (field) => fields.indexOf(field);
  const types = snapshot.meta.node_types[at("type")];
  const kinds = new Map();
  let detachedNodes = 0;
  for (let index = 0; index < nodes.length; index += fields.length) {
    const type = types[nodes[index + at("type")]];
    // Objects, DOM wrappers and closures by constructor or function name; everything else by type.
    const named = type === "object" || type === "native" || type === "closure";
    const kind = named ? type + " " + strings[nodes[index + at("name")]].slice(0, 70) : type;
    const total = kinds.get(kind) ?? { count: 0, bytes: 0 };
    total.count += 1;
    total.bytes += nodes[index + at("self_size")];
    kinds.set(kind, total);
    if (at("detachedness") >= 0 && nodes[index + at("detachedness")] === 2) detachedNodes += 1;
  }
  return { kinds, detachedNodes };
}

function snapshotGrowth(before, after, passes) {
  const rows = [];
  let bytes = 0;
  for (const [kind, total] of after.kinds) {
    const earlier = before.kinds.get(kind) ?? { count: 0, bytes: 0 };
    bytes += total.bytes - earlier.bytes;
    if (total.bytes !== earlier.bytes) rows.push({ kb: round((total.bytes - earlier.bytes) / 1024, 1), count: total.count - earlier.count, kind });
  }
  rows.sort((a, b) => b.kb - a.kb);
  return {
    between: "end of pass 2 and end of pass " + passes,
    selfSizeKB: Math.round(bytes / 1024),
    perPassKB: Math.round(bytes / 1024 / (passes - 2)),
    detachedNodes: { before: before.detachedNodes, after: after.detachedNodes },
    grew: rows.slice(0, 30),
    shrank: rows.slice(-8).reverse(),
  };
}

const interactive = []; // the steps between the two idle samples, kept for --cycles
let recording = false;
let heapGrowth = null;

async function step(name, action) {
  if (recording) interactive.push([name, action]);
  const began = Date.now();
  let outcome;
  if (reloaded()) outcome = skip("the dev server reloaded the page in mid-run");
  else if (left() < 8_000) outcome = skip("time budget exhausted");
  else {
    try {
      outcome = (await action()) ?? {};
    } catch (error) {
      outcome = partial("step stopped early: " + String(error?.message ?? error).split("\n")[0].slice(0, 160));
    }
  }
  if (outcome.status === "partial") {
    // Evidence for a step that did not go as scripted.
    const shot = resolve(dirname(out), label + "-" + name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".png");
    if (process.argv.includes("--shots")) await page.screenshot({ path: shot, timeout: 5_000 }).catch(() => {});
  }
  return sample(name, outcome, Date.now() - began);
}

const wait = (ms) => page.waitForTimeout(Math.max(0, Math.min(ms, left())));

/**
 * Waits for a selector without keeping an element handle. A handle (what page.waitForSelector
 * returns) pins its node, and with it any subtree the app later removes: the profile would then
 * report its own detached nodes as an application leak.
 */
const appears = (selector, timeout, state = "visible") =>
  page.locator(selector).first().waitFor({ state, timeout }).then(() => true, () => false);

/**
 * Operates the `2D | 3D` switch through its arrow keys: software WebGL keeps the main thread busy,
 * and a pointer click would wait for a steady frame that may not come in time.
 */
const dimensionSwitch = () => page.locator("[role=radiogroup][aria-label='Plant view dimension']");

/** Leaves the 3D view if it is mounted. Returns true when it had to switch. */
async function ensure2D() {
  if (!(await page.locator(".pw3d-stage").count()) || !(await dimensionSwitch().count())) return false;
  await dimensionSwitch().locator("[role=radio][aria-checked=true]").focus({ timeout: 3_000 });
  await page.keyboard.press("ArrowLeft");
  await appears(".pw3d-stage", 8_000, "detached");
  await wait(300);
  return true;
}

async function switchDimension(times, firstLoadMs = 6_000, reserveMs = 0) {
  const group = dimensionSwitch();
  let rendered = 0;
  let maxCanvases = 0;
  let switches = 0;
  await ensure2D();
  await group.locator("[role=radio][aria-checked=true]").focus({ timeout: 3_000 });
  try {
    for (let cycle = 0; cycle < times; cycle += 1) {
      if (left() < reserveMs) break; // keep the time the later steps need
      switches += 1;
      await page.keyboard.press("ArrowRight");
      if (await appears(".pw3d-stage canvas", Math.max(1_000, Math.min(cycle ? 6_000 : firstLoadMs, left())), "attached")) rendered += 1;
      await wait(400);
      maxCanvases = Math.max(maxCanvases, await page.locator("canvas").count());
      await page.keyboard.press("ArrowLeft");
      await appears(".pw3d-stage", 5_000, "detached");
      await wait(200);
    }
  } finally {
    // Never leave the 3D view mounted for the steps that follow.
    if (await page.locator(".pw3d-stage").count()) {
      await page.keyboard.press("ArrowLeft").catch(() => {});
      await wait(300);
    }
  }
  return { rendered, maxCanvases, switches };
}

let fatal = null;
let openedIn3D = false;
let warmUp = "none (2D | 3D switch not rendered)";
console.log("heap profile \"" + label + "\" · " + url + " · " + VIEWPORT.width + "x" + VIEWPORT.height);
try {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  // Ready when either drawing is on screen: the 2D floor symbols or the 3D canvas.
  await page.waitForFunction(() => document.querySelector(".pw3d-stage canvas") !== null
    || [...document.querySelectorAll("[data-floor-asset]")].some((node) => node.getClientRects().length > 0), null, { timeout: 45_000 });
  await wait(2_000);
  openedIn3D = (await page.locator(".pw3d-stage").count()) > 0;
  if (openedIn3D && startView === "2d") await ensure2D();
  // Warm-up, before the first sample: open and close 3D once so its lazily loaded code is part of
  // every sample (code is not a leak) and cannot change under the run when the dev server rebuilds.
  if (openedIn3D) {
    warmUp = "none needed: the app opened in 3D";
  } else if (await dimensionSwitch().count()) {
    warmUp = await switchDimension(1, 25_000).then(({ rendered }) => (rendered ? "3D opened and closed once" : "3D did not render"),
      (error) => "3D warm-up failed: " + String(error?.message ?? error).split("\n")[0].slice(0, 120));
    await wait(500);
  }
  holdUpdates = hotReloadHeld;
  await sample("load", {}, Date.now() - startedAt);

  await step("idle 10 s", async () => {
    await wait(10_000);
  });
  // Diagnostic (--allocations): sample allocations from here on. At the end only objects that are
  // still alive remain in the profile, so it names the code that retained the growth.
  if (trackAllocations) await cdp.send("HeapProfiler.startSampling", { samplingInterval: 8_192 }).catch(() => {});
  recording = true;

  await step("lens keys 1/2/3 x10", async () => {
    const floor = page.locator(".pw-plant-floor").first();
    if (!(await page.locator("[role=slider][aria-label='Pipeline lens']").count())) return skip("lens slider not rendered");
    let previous = await floor.getAttribute("data-lens");
    let changes = 0;
    for (let cycle = 0; cycle < 10; cycle += 1) {
      for (const key of ["1", "2", "3"]) {
        await page.keyboard.press(key);
        await wait(110);
        const current = await floor.getAttribute("data-lens");
        if (current !== previous) changes += 1;
        previous = current;
      }
    }
    await page.keyboard.press("1"); // back to the default Material lens so later samples compare like with like
    await wait(500);
    const endLens = await floor.getAttribute("data-lens");
    return changes ? { presses: 30, lensChanges: changes, endLens } : partial("lens keys changed nothing", { presses: 30, endLens });
  });

  await step("select 30 floor assets", async () => {
    const switchedTo2D = await ensure2D(); // the floor symbols exist only in the 2D drawing
    const ids = [...new Set(await page.$$eval("[data-floor-asset]", (nodes) => nodes.map((node) => node.getAttribute("data-floor-asset"))))];
    if (!ids.length) return skip("no [data-floor-asset] elements");
    const stride = Math.max(1, Math.floor(ids.length / 30));
    const picks = ids.filter((_, index) => index % stride === 0).slice(0, 30);
    let clicked = 0;
    let keyboard = 0;
    let failed = 0;
    let selected = 0;
    let withLossFigure = null;
    const symbol = (id) => page.locator("[data-floor-asset='" + id.replace(/['\\]/g, "\\$&") + "']").first();
    const showMoreVisible = () => page.evaluate(() => [...document.querySelectorAll("summary, button")]
      .some((node) => /Show more/i.test(node.textContent ?? "") && node.getClientRects().length > 0));
    for (const id of picks) {
      const asset = symbol(id);
      try {
        // A forced click lands on whatever is at that point: only use it when that is this symbol.
        const clear = await asset.evaluate((node) => {
          const target = node.querySelector(".pw-floor-asset-hit") ?? node;
          const box = target.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return hit !== null && node.contains(hit);
        });
        if (clear) {
          const hit = asset.locator(".pw-floor-asset-hit").first();
          await ((await hit.count()) ? hit : asset).click({ force: true, timeout: 2_000 });
          clicked += 1;
        } else {
          await asset.focus({ timeout: 2_000 }); // covered or off screen: same selection through the keyboard path
          await page.keyboard.press("Enter");
          keyboard += 1;
        }
        await wait(90);
        if ((await asset.getAttribute("aria-pressed")) === "true") {
          selected += 1;
          if (await showMoreVisible()) withLossFigure = id;
        }
      } catch {
        failed += 1;
      }
    }
    // Leave selected an asset whose inspector shows a loss figure, so the Show more step has a control to use.
    let lastSelected = picks.at(-1);
    if (withLossFigure && withLossFigure !== lastSelected) {
      const asset = symbol(withLossFigure);
      await asset.focus({ timeout: 2_000 }).then(() => page.keyboard.press("Enter")).then(() => { lastSelected = withLossFigure; }, () => {});
      await wait(150);
    }
    const detail = { available: ids.length, attempted: picks.length, forceClicked: clicked, viaKeyboard: keyboard, failed, selected, lastSelected, ...(switchedTo2D ? { switchedTo2D } : {}) };
    if (picks.length < 30) return partial("only " + ids.length + " floor assets exist", detail);
    return selected < picks.length ? partial(selected + " of " + picks.length + " selections confirmed", detail) : detail;
  });

  await step("transcript T / Escape x10", async () => {
    if (!(await page.locator("dialog.pw-transcript-drawer").count())) return skip("transcript drawer not mounted");
    let opened = 0;
    for (let cycle = 0; cycle < 10; cycle += 1) {
      await page.keyboard.press("t");
      if (!(await appears("dialog.pw-transcript-drawer[open]", 1_500))) continue;
      opened += 1;
      await wait(120);
      await page.keyboard.press("Escape");
      await appears("dialog.pw-transcript-drawer:not([open])", 1_500, "attached");
      await wait(80);
    }
    if (opened === 10) return { opened };
    return opened ? partial("drawer opened " + opened + " of 10 times", { opened }) : skip("T did not open the transcript drawer");
  });

  await step("Show more x2", async () => {
    // A locator, not element handles: see appears().
    const toggles = page.locator("summary, button").filter({ hasText: /Show more/i, visible: true });
    let selectedForLossFigure = null;
    if (!(await toggles.count())) {
      await ensure2D();
      // No loss figure on screen: walk the floor assets (keyboard path) until an inspector shows one,
      // starting with the seed plant's filler HMI and PLC, which carry rules-engine findings.
      const all = [...new Set(await page.$$eval("[data-floor-asset]", (nodes) => nodes.map((node) => node.getAttribute("data-floor-asset"))))];
      const likely = ["HMI-F3", "PLC-F3"].filter((id) => all.includes(id));
      const ids = [...likely, ...all.filter((id) => !likely.includes(id))];
      for (const id of ids) {
        if (left() < 70_000) break;
        const asset = page.locator("[data-floor-asset='" + id.replace(/['\\]/g, "\\$&") + "']").first();
        if ((await asset.getAttribute("aria-pressed").catch(() => "true")) === "true") continue;
        const focused = await asset.focus({ timeout: 1_000 }).then(() => true, () => false);
        if (!focused) continue;
        await page.keyboard.press("Enter");
        await wait(70);
        if (await toggles.count()) {
          selectedForLossFigure = id;
          break;
        }
      }
    }
    const controls = await toggles.count();
    if (!controls) return skip("no Show more control: no floor asset shows a loss figure in the Material lens");
    let expanded = 0;
    let collapsed = 0;
    let failed = 0;
    // A pointer click first; when a sticky panel edge covers the control, the same click through the DOM.
    const press = async (index) => {
      const toggle = toggles.nth(index);
      const clicked = await toggle.click({ timeout: 1_000 }).then(() => true, () => false);
      if (!clicked) await toggle.evaluate((node) => node.click());
      await wait(160);
    };
    for (let cycle = 0; cycle < 2; cycle += 1) {
      for (let index = 0; index < controls; index += 1) await press(index).then(() => { expanded += 1; }, () => { failed += 1; });
      for (let index = controls - 1; index >= 0; index -= 1) await press(index).then(() => { collapsed += 1; }, () => { failed += 1; });
    }
    // Later samples must not carry an open breakdown: close any that is still open.
    const leftOpen = await page.evaluate(() => {
      const open = [...document.querySelectorAll("details[data-loss-asset][open]")];
      for (const figure of open) figure.querySelector("summary")?.click();
      return open.length;
    });
    await wait(200);
    const detail = { controls, expanded, collapsed, failed, leftOpen, ...(selectedForLossFigure ? { selectedForLossFigure } : {}) };
    return failed ? partial(failed + " toggle clicks failed", detail) : detail;
  });

  await step("2D | 3D switch x5", async () => {
    const group = page.locator("[role=radiogroup][aria-label='Plant view dimension']");
    if (!(await group.count())) return skip("2D | 3D switch not rendered (WebGL2 unavailable or view not mounted)");
    // Software WebGL makes each switch slow: stop early rather than eat the time of the last two steps.
    const { rendered, maxCanvases, switches } = await switchDimension(5, 6_000, 48_000);
    const notice = await page.locator(".pw3d-notice").first().innerText({ timeout: 300 }).catch(() => null);
    const detail = { switches, rendered3d: rendered, maxCanvases, ...(notice ? { notice } : {}) };
    if (switches < 5) return partial("time budget allowed " + switches + " of 5 switches", detail);
    return rendered === 5 ? detail : partial("3D canvas appeared " + rendered + " of 5 times" + (notice ? ": " + notice : ""), detail);
  });

  await step("simulate 2 scenarios + reset", async () => {
    const rail = page.locator("section.pw-sim-controls");
    if (!(await rail.count())) return skip("Simulate rail not mounted");
    const launchers = rail.locator(".pw-sim-rail button");
    const available = await launchers.count();
    if (!available) return skip("no scenario launchers in this lens");
    const resetButton = rail.getByRole("button", { name: "Reset simulation" });
    // Start from a plant with no replay on it, also when an earlier pass stopped half way.
    if (await rail.locator(".pw-sim-replay").count()) {
      await resetButton.click({ timeout: 6_000 });
      await appears(".pw-sim-replay", 3_000, "detached");
    }
    const runs = [];
    for (let index = 0; index < Math.min(2, available); index += 1) {
      const launcher = launchers.nth(index);
      const scenario = await launcher.getAttribute("aria-label");
      await launcher.click({ timeout: 6_000 });
      if (!(await appears(".pw-sim-replay", 3_000))) throw new Error("the replay controls did not appear for " + scenario);
      const speed = rail.locator(".pw-sim-speed");
      if ((await speed.innerText()).trim().startsWith("1")) await speed.click(); // 4x replay keeps the run inside the budget
      const finished = await appears(".pw-sim-outcome", Math.max(1_000, Math.min(35_000, left() - 30_000)));
      await wait(600);
      runs.push({ scenario, finished });
    }
    await resetButton.click({ timeout: 6_000 });
    await appears(".pw-sim-replay", 3_000, "detached");
    await wait(500);
    const detail = { speed: "4x", runs };
    if (available < 2) return partial("only one scenario launcher in this lens", detail);
    return runs.every((run) => run.finished) ? detail : partial("a scenario did not reach its outcome in time", detail);
  });

  recording = false;
  let afterSecondPass = null;
  for (let pass = 2; pass <= cycles; pass += 1) {
    for (const [name, action] of interactive) await step(name + " (pass " + pass + ")", action);
    if (compareSnapshots && pass === 2) afterSecondPass = await heapByKind().catch(() => null);
  }
  if (afterSecondPass) {
    heapGrowth = await heapByKind().then((last) => snapshotGrowth(afterSecondPass, last, cycles), (error) => ({ error: String(error) }));
  }

  await step("idle 20 s", async () => {
    await wait(20_000);
  });
} catch (error) {
  fatal = String(error?.message ?? error).split("\n")[0];
  console.error("profile aborted: " + fatal);
  if (process.argv.includes("--shots")) {
    await page.screenshot({ path: resolve(dirname(out), label + "-aborted.png"), timeout: 5_000 }).catch(() => {});
  }
}

/** Live sampled bytes by allocating function, with up to three callers for context. */
async function retainedAllocations() {
  const { profile } = await cdp.send("HeapProfiler.stopSampling");
  const sites = new Map();
  (function walk(node, callers) {
    const { functionName, url: source, lineNumber } = node.callFrame;
    const name = functionName || "(anonymous)";
    const file = source.split("/").pop()?.split("?")[0].slice(-48) ?? "";
    if (node.selfSize > 0) {
      const key = name + " @ " + file + ":" + (lineNumber + 1) + (callers.length ? "  <-  " + callers.slice(0, 3).join(" <- ") : "");
      sites.set(key, (sites.get(key) ?? 0) + node.selfSize);
    }
    for (const child of node.children ?? []) walk(child, functionName ? [name, ...callers] : callers);
  })(profile.head, []);
  const ranked = [...sites].sort((a, b) => b[1] - a[1]);
  return {
    sampledLiveKB: Math.round(ranked.reduce((total, [, bytes]) => total + bytes, 0) / 1024),
    top: ranked.slice(0, 40).map(([site, bytes]) => ({ kb: Math.round(bytes / 1024), site })),
  };
}
const allocations = trackAllocations && !fatal ? await retainedAllocations().catch((error) => ({ error: String(error) })) : null;

const version = browser.version();
await browser.close();

const reference = samples.find((row) => row.step === "idle 10 s");
const last = samples.at(-1);
const growth = reference && last && last !== reference ? {
  from: reference.step,
  to: last.step,
  heapUsedMB: round(last.heapUsedMB - reference.heapUsedMB),
  domNodes: last.domNodes - reference.domNodes,
  jsEventListeners: last.jsEventListeners - reference.jsEventListeners,
} : null;
const report = {
  label,
  url,
  viewport: VIEWPORT,
  browser: "Chrome " + version + " (headless, SwiftShader)",
  startedAt: new Date(startedAt).toISOString(),
  totalSeconds: round((Date.now() - startedAt) / 1000, 1),
  method: "HeapProfiler.collectGarbage x2, then Performance.getMetrics (JSHeapUsedSize, Nodes, JSEventListeners)",
  startView,
  openedIn3D,
  warmUp,
  samples,
  growth,
  // With --cycles: the state after each pass of the interactive steps (a leak grows on every pass).
  ...(cycles > 1 ? {
    passes: samples.filter((row) => row.step.startsWith("simulate 2 scenarios")).map((row, index) => ({
      pass: index + 1, heapUsedMB: row.heapUsedMB, domNodes: row.domNodes, jsEventListeners: row.jsEventListeners,
    })),
  } : {}),
  skipped: samples.filter((row) => row.status !== "ok").map((row) => ({ step: row.step, status: row.status, reason: row.reason })),
  // false = the dev server reloaded the page or failed to compile a source file in mid-run: do not compare this run.
  valid: !fatal && !reloaded() && buildErrors === 0,
  noise: { hotReloadHeld, heldDevServerMessages: heldMessages, pageLoadsAtSeconds: loads, buildErrors, devServerMessages, problemCount: problems.length, problems: problems.slice(0, 12) },
  ...(heapGrowth ? { heapGrowthByKind: heapGrowth } : {}),
  ...(allocations ? { retainedAllocationsSinceIdle: allocations } : {}),
  ...(fatal ? { fatal } : {}),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

console.log("\n" + label.toUpperCase() + " · " + report.totalSeconds + " s · " + report.browser);
console.log("| Step | JS heap used (MB) | DOM nodes | JS event listeners | Note |");
console.log("| --- | ---: | ---: | ---: | --- |");
for (const row of samples) {
  console.log("| " + [row.step, row.heapUsedMB.toFixed(2), row.domNodes, row.jsEventListeners, row.status === "ok" ? "" : row.status + ": " + row.reason].join(" | ") + " |");
}
if (growth) {
  console.log("\ngrowth, " + growth.from + " -> " + growth.to + ": " + signed(growth.heapUsedMB) + " MB, " + signed(growth.domNodes) + " nodes, " + signed(growth.jsEventListeners) + " listeners");
}
if (reloaded()) console.log("INVALID RUN: the page reloaded at " + loads.slice(1).join(", ") + " s; run it again");
else if (buildErrors) console.log("INVALID RUN: " + buildErrors + " source build errors reached the page in mid-run; run it again");
console.log(hotReloadHeld ? "hot updates held after load (" + heldMessages + " dev-server messages kept from the page)"
  : "hot updates live, dev-server messages: " + JSON.stringify(devServerMessages));
console.log("wrote " + out);
process.exit(fatal ? 1 : report.valid ? 0 : 2);
