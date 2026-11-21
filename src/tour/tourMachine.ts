/** Orders the tour and bounds each step to its own cancellable lifetime. */
export type TourTarget = () => Element | null;
export type TourCue = { text: string; target?: TourTarget };
export type TourContext = { signal: AbortSignal; show: (cue: TourCue) => void };
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
  status: "running" | "skipped" | "done";
};

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
  publish: (frame: TourFrame) => void, skipMs = 2400,
): Promise<void> {
  for (const [index, step] of [...steps, proof].entries()) {
    if (signal.aborted) return;
    const lifetime = new AbortController();
    const stepSignal = AbortSignal.any([signal, lifetime.signal]);
    let cue = step.initial;
    const frame = (status: TourFrame["status"]) => ({ ...cue, index, total: steps.length, title: step.title, status });
    const show = (next: TourCue) => {
      if (stepSignal.aborted) return;
      cue = next;
      publish(frame("running"));
    };
    const timer = setTimeout(() => lifetime.abort(new Error(step.timeoutReason)), step.timeoutMs);
    let onAbort: () => void = () => {};
    try {
      show(cue);
      const interrupted = new Promise<never>((_, reject) => {
        onAbort = () => reject(stepSignal.reason);
        if (stepSignal.aborted) onAbort();
        else stepSignal.addEventListener("abort", onAbort, { once: true });
      });
      await Promise.race([
        interrupted,
        Promise.resolve().then(() => {
          stepSignal.throwIfAborted();
          return step.run({ signal: stepSignal, show });
        }),
      ]);
    } catch (error) {
      if (signal.aborted) return;
      lifetime.abort();
      cue = { ...cue, text: `Skipped · ${error instanceof Error ? error.message : "Step unavailable."}` };
      publish(frame("skipped"));
      await pause(skipMs, signal).catch(() => {});
    } finally {
      clearTimeout(timer);
      stepSignal.removeEventListener("abort", onAbort);
      lifetime.abort();
    }
    if (index === steps.length && !signal.aborted) publish(frame("done"));
  }
}
