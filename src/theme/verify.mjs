/** Checks the live theme switch and captures the required demo surfaces in Chrome. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(process.cwd() + "/package.json")("playwright");
const base = "http://localhost:4119";
const shots = "docs/log/shots";
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  mkdirSync(shots, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const theme = document.documentElement?.dataset.theme;
      if (theme && !window.pwThemeBoot) window.pwThemeBoot = { theme, at: performance.now() };
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-theme"] });
  });

  async function checkTheme(theme) {
    const actual = await page.evaluate(() => {
      const root = document.documentElement;
      const css = getComputedStyle(root);
      return [root.dataset.theme, css.colorScheme, css.backgroundColor];
    });
    assert.deepEqual(actual, [theme, theme, theme === "light" ? "rgb(238, 236, 228)" : "rgb(7, 11, 16)"]);
  }

  async function verifyLightBoot() {
    await checkTheme("light");
    const timing = await page.evaluate(() => ({
      boot: window.pwThemeBoot,
      firstPaint: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
    }));
    assert.equal(timing.boot?.theme, "light");
    if (timing.firstPaint !== undefined) assert.ok(timing.boot.at <= timing.firstPaint, JSON.stringify(timing));
  }

  async function capture(name) {
    await page.mouse.move(8, 68);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${shots}/theme-light-${name}.png`,
      style: "nextjs-portal { visibility: hidden !important }",
    });
    console.log(`Captured ${name}`);
  }

  async function setLens(key) {
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press(key);
    await page.locator(`.lens-toggle[aria-valuenow="${key}"]`).waitFor();
  }

  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".pw-top").waitFor();
  const moon = page.getByRole("button", { name: "Switch to dark mode", exact: true });
  await checkTheme("light");
  const mounted = await moon.isVisible();
  if (mounted) {
    await moon.focus();
    await page.keyboard.press("Enter");
    await checkTheme("dark");
    assert.equal(await page.evaluate(() => localStorage.getItem("pw-theme")), "dark");
    await page.getByRole("button", { name: "Switch to light mode", exact: true }).focus();
    await page.keyboard.press("Space");
    await checkTheme("light");
    assert.equal(await page.evaluate(() => localStorage.getItem("pw-theme")), "light");
    console.log("Keyboard switch and storage passed");
  }

  await page.evaluate(() => localStorage.setItem("pw-theme", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".pw-top").waitFor();
  await verifyLightBoot();

  for (const [key, name] of [["1", "material"], ["2", "both"], ["3", "data"]]) {
    await setLens(key);
    await capture(`lens-${name}`);
  }
  await setLens("2");
  for (const selector of [".pw-capture-toolbar", ".pw-sim-rail", ".pw-crew-dock"]) {
    await page.locator(selector).waitFor();
  }
  await capture("instrument-docks");

  const asset = page.locator('[data-floor-asset="PLC-F3"]');
  await asset.locator(".pw-floor-asset-hit").click();
  await page.locator('[data-floor-asset="PLC-F3"][aria-pressed="true"]').waitFor();
  const results = page.locator("#pw-results");
  await results.getByText("Asset inspector", { exact: true }).waitFor();
  const loss = results.locator("details[data-loss-asset]").first();
  await loss.getByText("Show more", { exact: true }).click();
  assert.notEqual(await loss.getAttribute("open"), null);
  await capture("asset-plc-f3-loss");

  const watch = page.locator(".pw-top-watch");
  if ((await watch.getAttribute("aria-expanded")) !== "true") await watch.click();
  await page.locator("#pw-watch[open] .pw-watch-body").scrollIntoViewIfNeeded();
  await capture("watch");

  await page.getByRole("button", { name: "Describe device", exact: true }).click();
  await page.locator("#pw-capture-editor textarea[name=description]").waitFor();
  await capture("describe-device");
  await page.keyboard.press("Escape");
  await page.locator("#pw-capture-editor").waitFor({ state: "hidden" });

  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("Shift+T");
  await page.locator("dialog.pw-transcript-drawer[open]").waitFor();
  await capture("transcript");

  await page.goto(base + "/proof", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Proof it works" }).waitFor();
  await capture("proof");
  await verifyLightBoot();

  await page.evaluate(() => localStorage.setItem("pw-theme", "dark"));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".pw-top").waitFor();
  await checkTheme("dark");
  const darkParity = await page.evaluate(() => {
    const html = document.documentElement;
    const elements = [...document.querySelectorAll("*")];
    const read = () => elements.map((element) => {
      const css = getComputedStyle(element);
      return [css.color, css.backgroundColor, css.borderColor, css.boxShadow, css.fill, css.stroke, css.colorScheme].join(",");
    }).join("\n");
    const withAttribute = read();
    html.removeAttribute("data-theme");
    const withoutAttribute = read();
    html.dataset.theme = "dark";
    return { identical: withAttribute === withoutAttribute, elements: elements.length };
  });
  assert.ok(darkParity.identical);
  console.log(`Dark palette matches the unthemed drawing across ${darkParity.elements} elements`);
  assert.ok(mounted, "The orchestrator still needs to mount ThemeToggle in TopBar.");
} finally {
  await browser.close();
}
