// Visible cursor for headless recordings. The overlay is purely cosmetic (pointer-events: none)
// and only mirrors the REAL mouse events Playwright sends; it never triggers anything itself.
// It also hides the Next.js dev-tools badge, which is dev-server chrome, not part of the product.

const OVERLAY = `
(() => {
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    const style = document.createElement("style");
    style.textContent = \`
      nextjs-portal { display: none !important; }
      #__demo_cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
        pointer-events: none; transform: translate(-100px, -100px); will-change: transform; }
      #__demo_cursor svg { filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
      .__demo_ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 34px; height: 34px;
        margin: -17px 0 0 -17px; border-radius: 50%; border: 2px solid rgba(255,255,255,.85);
        animation: __demo_ripple .45s ease-out forwards; }
      @keyframes __demo_ripple { from { transform: scale(.35); opacity: 1 } to { transform: scale(1.25); opacity: 0 } }\`;
    document.documentElement.appendChild(style);
    const el = document.createElement("div");
    el.id = "__demo_cursor";
    el.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24 L15 22.5 L11.7 15 L18.5 15 Z" fill="#fff" stroke="#0b0f17" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(el);
    const move = (e) => { el.style.transform = "translate(" + (e.clientX - 3) + "px," + (e.clientY - 2) + "px)"; };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("mousemove", move, true);
    window.addEventListener("pointerdown", (e) => {
      const r = document.createElement("div");
      r.className = "__demo_ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

export async function installCursor(context) {
  await context.addInitScript(OVERLAY);
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function makeCursor(page, log = console.log) {
  let pos = { x: 960, y: 600 };

  async function glide(x, y, ms = 700) {
    const from = { ...pos };
    const t0 = Date.now();
    for (;;) {
      const t = Math.min(1, (Date.now() - t0) / ms);
      const k = ease(t);
      await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
      if (t >= 1) break;
      await page.waitForTimeout(12);
    }
    pos = { x, y };
  }

  async function centerOf(locator) {
    await locator.waitFor({ state: "visible", timeout: 4000 });
    const b = await locator.boundingBox();
    if (!b) throw new Error("element has no box");
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }

  return {
    get pos() { return pos; },
    glide,
    async place(x, y) { pos = { x, y }; await page.mouse.move(x, y); },
    async to(locator, ms) { const c = await centerOf(locator); await glide(c.x, c.y, ms); return c; },
    /**
     * Moves to the element and clicks it with the real mouse. If `verify` says the click had no
     * effect (some controls swallow mouse clicks; see the report), activates it with the keyboard
     * (focus + Enter), which is still a real user input handled by the app's own handler.
     */
    async click(locator, { ms = 650, verify, label = "element", keyFallback } = {}) {
      const c = await centerOf(locator);
      await glide(c.x, c.y, ms);
      await page.waitForTimeout(120);
      await page.mouse.down();
      await page.waitForTimeout(70);
      await page.mouse.up();
      if (verify) {
        await page.waitForTimeout(250);
        if (!(await verify())) {
          log(`  ! mouse click on ${label} had no effect; activating it with the keyboard (focus + Enter)`);
          if (keyFallback) await keyFallback();
          else { await locator.focus(); await page.keyboard.press("Enter"); }
          await page.waitForTimeout(200);
          if (!(await verify())) throw new Error(`${label} did not respond to mouse or keyboard`);
        }
      }
      return c;
    },
  };
}
