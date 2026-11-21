// Records one live PLC photo upload, the 3D crew, and the checked placement and risks.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DRY_CAPTURE, require, riskScore, sel } from "../lib/app.mjs";

const PHOTO = fileURLToPath(new URL("../../eval/dataset/images/photo-032.jpg", import.meta.url));
const CREDIT = "Siemens SIMATIC S7-300 photo · GiovanniLibonati / Wikimedia Commons · CC BY-SA 4.0";
const PIN = { x: 830, y: 675 }; // Filler 3, next to the visitor side of the packaging approach.
const compact = (text) => text.replace(/\s+/g, " ").trim();
const cues = {
  reading: ".pw3d-work-image",
  scout: ".pw3d-work-evidence",
  inspector: '.pw3d-work-plate[data-work="check"], .pw3d-work-plate[data-work="pass"]',
  architect: '.pw3d-work-plate[data-work="proposal"]',
  chief: ".pw3d-work-briefing",
};

async function openUpload(page, cursor) {
  await cursor.click(sel.addDevice(page), { ms: 280, label: "Add a device" });
  await cursor.click(sel.dock(page, "Upload"), { ms: 280, label: "Upload" });
}

async function pinByPackaging(page, cursor) {
  await openUpload(page, cursor);
  await cursor.click(sel.pinButton(page), { ms: 280, label: "Pick on plant" });
  const world = await require(page.locator('.pw-floor-svg[data-armed="true"] .pw-floor-world'), "armed floor pin");
  const { x, y } = await world.evaluate((group, pin) => {
    const screen = new DOMPoint(pin.x, pin.y).matrixTransform(group.getScreenCTM());
    return { x: screen.x, y: screen.y };
  }, PIN);
  await page.mouse.click(x, y);
  await require(page.locator('.pw-capture-pin[data-pinned="true"]'), "retained floor pin");
  await require(sel.plant3d(page), "automatic return to 3D after pinning", 15000);
  await page.getByRole("button", { name: "Collapse capture", exact: true }).click();
}

function riskCaption(checked, risks, path) {
  if (/parking.lot/i.test(path) && /wi.fi/i.test(path)) return "The path starts at parking-lot Wi-Fi";
  if (/exposed ports near visitor/i.test(checked)) return "Visitors could reach the controller’s ports";
  if (/washdown|food.contact/i.test(checked)) return "Wash water could damage this controller";
  if (/unmanaged asset/i.test(checked)) return "An unmanaged device joins the plant network";
  if (/physical access|physical port/i.test(risks)) return "Someone could reach the controller’s ports";
  return path ? "See how the risk could spread" : "See what makes this spot risky";
}

export default {
  id: "capture",
  expensive: true,
  async prepare({ page, cursor }) {
    await pinByPackaging(page, cursor);
    await cursor.place(550, 925);
  },
  async run({ page, cursor, mark, log, dir }) {
    await page.waitForTimeout(1600);
    await openUpload(page, cursor);
    const upload = page.getByRole("button", { name: "Add files", exact: true });
    await cursor.to(upload, 550);
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 30000 }),
      upload.click({ timeout: 30000 }),
    ]);
    await chooser.setFiles(PHOTO);
    const analyze = await require(sel.analyze(page), "Analyze button after photo upload");
    await page.waitForFunction(() => document.querySelector("form.pw-capture-card button[type=submit]:enabled"), null, { timeout: 12000 });
    const pinned = page.locator('.pw-capture-pin[data-pinned="true"] .pw-capture-pin-value');
    const area = compact(await pinned.innerText({ timeout: 5000 }));
    if (area !== "Filler 3") throw new Error(`Pin landed in ${area}`);
    mark("photo", { name: "photo-032.jpg", area, credit: CREDIT });

    await page.waitForTimeout(4750);
    if (DRY_CAPTURE) return;
    await analyze.scrollIntoViewIfNeeded();
    await cursor.to(analyze, 460);
    let submittedAt;
    const request = page.waitForRequest((req) => {
      if (new URL(req.url()).pathname !== "/api/analyze" || req.method() !== "POST") return false;
      submittedAt = Date.now();
      const body = req.postDataJSON();
      mark("analyze", { kind: body.input.kind, dropPoint: body.dropPoint });
      return true;
    }, { timeout: 9000 });
    const response = page.waitForResponse((res) => new URL(res.url()).pathname === "/api/analyze" && res.request().method() === "POST",
      { timeout: 120000 });
    response.catch(() => {});
    // Single submit. No retries at the browser or recorder layer.
    await Promise.all([request, analyze.click()]);
    log("  One photo Analyze submitted.");

    const seen = new Set();
    let finished = false;
    while (Date.now() - submittedAt < 180000 && !finished) {
      const state = await page.evaluate((selectors) => {
        const visible = (selector) => {
          const el = document.querySelector(selector);
          return el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility === "visible";
        };
        return {
          threeD: !!document.querySelector(".pw3d-stage canvas"),
          cues: Object.entries(selectors).filter(([, selector]) => visible(selector)).map(([name]) => name),
          placed: document.querySelector('.pw3d-label[data-placed="true"] span')?.textContent,
          done: visible('.pw-capture-summary:not([data-failed="true"])'),
          error: visible(".pw-capture-failure") ? document.querySelector(".pw-capture-failure").textContent
            : (visible('.pw-capture-summary[data-failed="true"]') ? document.querySelector('.pw-capture-summary[data-failed="true"]').textContent : ""),
        };
      }, cues);
      if (!state.threeD) throw new Error("The app left 3D during the capture");
      if (state.error) throw new Error(`Capture failed in the app: ${compact(state.error)}`);
      for (const name of state.cues) {
        if (seen.has(name)) continue;
        seen.add(name);
        mark(name);
      }
      if (state.placed && !seen.has("placed")) {
        seen.add("placed");
        mark("placed", { id: state.placed, risk: await riskScore(page) });
      }
      finished = state.done;
      if (!finished) await page.waitForTimeout(100);
    }
    if (!finished || !seen.has("placed")) throw new Error("The live capture did not finish and place a device");
    mark("done", { seconds: (Date.now() - submittedAt) / 1000, risk: await riskScore(page) });
    log(`  Recorded cues: ${[...seen].join(", ")}`);

    const events = (await (await response).text()).split(/\r?\n/).flatMap((line) => {
      if (!line.startsWith("data: ")) return [];
      try { return [JSON.parse(line.slice(6))]; } catch { return []; }
    });
    const profile = events.find(({ type }) => type === "perception.done")?.profile;
    if (profile?.physical_kind !== "plc_cabinet") throw new Error(`The live run classified the photo as ${profile?.physical_kind ?? "unknown"}`);
    const asDropped = events.find(({ type, phase }) => type === "selfcheck.done" && phase === "as-dropped")?.result;
    const checked = (asDropped?.findings ?? []).map(({ title }) => title).join(" · ");
    mark("classified", { type: profile.device_type, kind: profile.physical_kind, runId: events[0]?.runId, checked });

    const dialog = page.getByRole("button", { name: "Close phone dialog" });
    if (await dialog.isVisible()) await dialog.click();
    const rail = page.locator("#pw-results");
    const asDroppedRow = rail.getByText(/^As-dropped rules check/).first();
    await require(asDroppedRow, "as-dropped rules check");
    await asDroppedRow.scrollIntoViewIfNeeded();
    await asDroppedRow.click();
    const details = asDroppedRow.locator("xpath=ancestor::details[1]");
    const paths = details.locator(".pw-panel-path:visible");
    const path = await paths.count() ? paths.first() : null;
    const pathText = path ? compact(await path.innerText()) : "";
    if (path) {
      await path.scrollIntoViewIfNeeded();
      await cursor.to(path, 480);
    } else {
      const findings = details.getByText(/^Rules engine findings/).first();
      if (await findings.isVisible()) await findings.click();
      const firstRisk = details.locator(".pw-panel-finding-label:visible").first();
      if (await firstRisk.count()) await firstRisk.scrollIntoViewIfNeeded();
    }
    mark("risk", { caption: riskCaption(checked, await rail.innerText(), pathText), path: pathText, checked });
    log(`  Checked risks: ${checked || "none"}; ${asDropped?.paths?.length ?? 0} new paths.`);
    await page.waitForTimeout(3800);

    const loss = await require(sel.placementLoss(page), "checked Here / There estimated loss");
    await loss.scrollIntoViewIfNeeded();
    await cursor.to(loss, 360);
    const text = compact(await loss.innerText());
    const amount = text.match(/^Here\s+(\$[^\s·]+)/)?.[1];
    if (!amount) throw new Error(`No as-dropped estimate in the displayed comparison: ${text}`);
    const areaName = compact(await rail.locator(".pw-panel-placement .pw-panel-location button").first().innerText({ timeout: 5000 }));
    mark("loss", { text, amount, area: areaName });
    log(`  ${text}. Recommended: ${areaName}.`);
    await page.waitForTimeout(3900);
    mark("end");
    writeFileSync(join(dir, "capture-answer.txt"), await rail.innerText());
    await page.screenshot({ path: join(dir, "capture-answer.png"), timeout: 5000 }).catch(() => {});
  },
  edit(marks, seconds) {
    const get = (name) => marks.find((mark) => mark.name === name);
    const at = (name) => get(name)?.t;
    const start = at("analyze");
    const read = at("scout") ?? at("reading") ?? start + 3.9;
    const placed = at("placed");
    const check = at("inspector") ?? at("architect") ?? placed + 0.8;
    const uploaded = at("photo");
    const uploadCaption = "New equipment: a photo of a PLC";
    const evidence = "AI crew reads the photo";
    const waitFrom = Math.max(start, read - 4);
    const waitDuration = (read - waitFrom) / 4;
    return [
      { from: Math.max(0, uploaded - 3.4), to: uploaded, duration: 3.4, caption: uploadCaption, credit: CREDIT },
      { from: Math.max(uploaded, start - 6.6), to: start, duration: 6.6, caption: uploadCaption, credit: CREDIT, photo: PHOTO },
      ...(waitDuration > 0.2 ? [{ from: waitFrom, to: read, duration: waitDuration, speed: 4, caption: evidence }] : []),
      { from: read, to: read + 4 - (waitDuration > 0.2 ? waitDuration : 0), duration: 4 - (waitDuration > 0.2 ? waitDuration : 0), caption: evidence },
      { from: check, to: check + 4, duration: 4, caption: "Rules engine checks the whole plant" },
      { from: Math.max(start, placed - 0.18), to: placed + 4, duration: 4, caption: placed < check ? "Replay · Controller drops into the plant" : "Controller drops into the plant" },
      { from: at("risk"), to: at("loss") - 0.45, duration: 3.33, caption: get("risk").data.caption },
      { from: at("loss"), to: Math.min(at("end"), seconds), duration: 3.33, caption: `Estimated loss ${get("loss").data.amount} per event` },
    ];
  },
};
