/** Orders the tour and bounds each step to its own cancellable lifetime. */
import type { TourAdvance } from "./tourAdvance";
import { LIVE_READ_MS } from "./tourPace";

export type TourTarget = () => Element | null;
export type TourCue = { text: string; target?: TourTarget };
export type TourContext = {
  signal: AbortSignal;
  show: (cue: TourCue) => void | Promise<void>;
  showLive: (cue: TourCue) => void;
  next: (suggestion?: string, acceptManual?: () => boolean) => Promise<void>;
};
export type TourStep = {
  title: string;
  initial: TourCue;
  timeoutMs: number;
  timeoutReason: string;
  run: (context: TourContext) => Promise<void>;
};

export type TourFrame = TourCue & {
  index: number;
  total: number;
  title: string;
  status: "running" | "ready" | "skipped" | "done";
  nextAction?: string;
};

type Guide = {
  startIndex: number;
  holdCompleted: boolean;
  done: (index: number) => boolean;
  observe: (inspect: () => void) => () => void;
};

const manuallyDone = Symbol("manually completed");

export function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);

    function cancel() {
      clearTimeout(timer);
      reject(signal.reason);
    }

    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function runTour(
  steps: readonly TourStep[], proof: TourStep, signal: AbortSignal,
  publish: (frame: TourFrame) => void, advance: TourAdvance, guide?: Guide,
): Promise<void> {
  const all = [...steps, proof];
  for (let index = guide?.startIndex ?? 0; index < all.length; index++) {
    if (signal.aborted) return;
    const step = all[index];
    const lifetime = new AbortController();
    const stepSignal = AbortSignal.any([signal, lifetime.signal]);
    let cue = step.initial;
    let pending: TourCue | undefined;
    let captionDrain: Promise<void> | undefined;
    const frame = (status: TourFrame["status"], nextAction?: string) => ({
      ...cue, index, total: steps.length, title: step.title, status, ...(guide && nextAction && { nextAction }),
    });
    const isDone = () => guide?.done(index) === true;
    if (isDone()) {
      if (index === steps.length || (guide?.holdCompleted && index === guide.startIndex)) {
        cue = { ...cue, text: "Already completed in this demo." };
        if (index === steps.length) publish(frame("done"));
        else await advance.wait(signal, () => publish(frame("ready"))).catch(() => {});
      }
      continue;
    }
    const render = (next: TourCue) => {
      cue = next;
      publish(frame("running"));
    };
    async function drainCaptions() {
      try {
        while (pending && !signal.aborted) {
          const next = pending;
          pending = undefined;
          render(next);
          await pause(LIVE_READ_MS, signal);
        }
      } finally {
        captionDrain = undefined;
      }
    }
    const showLive = (next: TourCue) => {
      if (stepSignal.aborted) return;
      pending = next.text === cue.text && next.target === cue.target ? undefined : next;
      if (pending && !captionDrain) captionDrain = drainCaptions().catch(() => {});
    };
    const show = (next: TourCue) => {
      const renderIfActive = () => { if (!stepSignal.aborted) render(next); };
      if (captionDrain) return captionDrain.then(renderIfActive);
      renderIfActive();
    };
    let remaining = step.timeoutMs;
    let started = performance.now();
    const armDeadline = () => setTimeout(() => lifetime.abort(new Error(step.timeoutReason)), remaining);
    let timer = armDeadline();
    const next: TourContext["next"] = async (suggestion, acceptManual = () => true) => {
      if (captionDrain) await captionDrain;
      stepSignal.throwIfAborted();
      clearTimeout(timer);
      remaining -= performance.now() - started;
      const inspect = () => {
        if (acceptManual() && isDone()) lifetime.abort(manuallyDone);
      };
      const off = guide?.observe(inspect);
      try {
        inspect();
        await advance.wait(stepSignal, () => publish(frame("ready", suggestion ?? cue.text)));
        inspect();
      } finally {
        off?.();
      }
      stepSignal.throwIfAborted();
      started = performance.now();
      timer = armDeadline();
      publish(frame("running"));
    };
    let onAbort: () => void = () => {};
    let skipReason: string | undefined;
    let completedManually = false;
    try {
      publish(frame("running", cue.text));
      const interrupted = new Promise<never>((_, reject) => {
        onAbort = () => reject(stepSignal.reason);
        if (stepSignal.aborted) onAbort();
        else stepSignal.addEventListener("abort", onAbort, { once: true });
      });
      await Promise.race([
        interrupted,
        Promise.resolve().then(() => {
          stepSignal.throwIfAborted();
          return step.run({ signal: stepSignal, show, showLive, next });
        }),
      ]);
    } catch (error) {
      completedManually = error === manuallyDone;
      if (!completedManually) skipReason = error instanceof Error ? error.message : "Step unavailable.";
    } finally {
      clearTimeout(timer);
      stepSignal.removeEventListener("abort", onAbort);
      lifetime.abort();
    }
    if (captionDrain) await captionDrain;
    if (signal.aborted) return;
    if (completedManually) {
      if (index === steps.length) publish(frame("done"));
      continue;
    }
    if (skipReason !== undefined) {
      cue = { ...cue, text: `Skipped · ${skipReason}` };
      const off = guide?.observe(() => { if (isDone()) advance.press(); });
      try {
        await advance.wait(signal, () => publish(frame("skipped"))).catch(() => {});
      } finally {
        off?.();
      }
    } else if (index < steps.length) {
      await advance.wait(signal, () => publish(frame("ready"))).catch(() => {});
    }
    if (index === steps.length && !signal.aborted) publish(frame("done"));
  }
}
