/** Finds and operates existing app controls without creating alternate action paths. */
import type { TourContext, TourTarget } from "./tourMachine";

export function shown(element: Element): boolean {
  return element.getClientRects().length > 0 && !element.closest("[hidden], [inert]")
    && getComputedStyle(element).visibility === "visible";
}

export function target(selector: string): TourTarget {
  return () => Array.from(document.querySelectorAll(selector)).find(shown) ?? null;
}

export function button(selector: string, text?: string) {
  return () => Array.from(document.querySelectorAll<HTMLButtonElement>(selector))
    .find((element) => shown(element) && (text === undefined || element.textContent?.trim() === text)) ?? null;
}

export function ready(find: () => HTMLButtonElement | null) {
  return () => {
    const element = find();
    return element && !element.disabled && element.getAttribute("aria-disabled") !== "true" ? element : null;
  };
}

export function activate(element: HTMLButtonElement, signal: AbortSignal) {
  signal.throwIfAborted();
  if (!shown(element) || element.disabled || element.getAttribute("aria-disabled") === "true") {
    throw new Error("The control is no longer available.");
  }
  // The guide presses controls for the presenter but never takes their keyboard focus.
  const focused = document.activeElement;
  element.click();
  const moved = document.activeElement;
  if (moved === focused || !(moved instanceof HTMLElement)) return;
  if (focused instanceof HTMLElement && focused !== document.body && focused.isConnected) focused.focus({ preventScroll: true });
  else moved.blur();
}

export function waitFor<T>(
  read: () => T | undefined | null, signal: AbortSignal, subscribe: (read: () => void) => () => void,
  start?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    let unsubscribe = () => {};
    function cleanup() {
      unsubscribe();
      signal.removeEventListener("abort", cancel);
    }
    function cancel() {
      cleanup();
      reject(signal.reason);
    }
    function inspect() {
      const value = read();
      if (value == null) return;
      cleanup();
      resolve(value);
    }
    unsubscribe = subscribe(inspect);
    signal.addEventListener("abort", cancel, { once: true });
    try {
      start?.();
      inspect();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function waitForUi<T>(
  read: () => T | undefined | null, signal: AbortSignal, reason: string, maxMs = 5000,
): Promise<T> {
  const deadline = AbortSignal.timeout(maxMs);
  return waitFor(read, AbortSignal.any([signal, deadline]), (inspect) => {
    // Animation-driven visibility (including projected 3D labels) need not mutate the DOM.
    const timer = setInterval(inspect, 60);
    return () => clearInterval(timer);
  }).catch((error: unknown) => {
    if (signal.aborted) throw signal.reason;
    if (deadline.aborted) throw new Error(reason);
    throw error;
  });
}

export function pointAt(context: TourContext, find: TourTarget, text: string) {
  context.signal.throwIfAborted();
  return context.show({ text, target: find });
}

const drawer = button('button.pw-top-risk-mobile');
export const closeDrawer = button('.pw-rail-mobile-head button[aria-label="Close results"]');
export const dial = button('button[aria-controls="pw-risk-reviews"]');
export const crew = target(".pw-crew-dock-cards");

export function openResults(signal: AbortSignal) {
  const toggle = drawer();
  if (toggle?.getAttribute("aria-expanded") === "false") activate(toggle, signal);
}

export async function openReview(tab: "watch" | "todo", context: TourContext) {
  const { signal } = context;
  openResults(signal);
  const risk = await waitForUi(ready(dial), signal, "The plant risk dial is unavailable.");
  if (risk.getAttribute("aria-expanded") !== "true") activate(risk, signal);
  const findTab = button(`#pw-risk-tab-${tab}`);
  const control = await waitForUi(ready(findTab), signal, "The risk review tab is unavailable.");
  if (control.getAttribute("aria-selected") !== "true") activate(control, signal);
}
