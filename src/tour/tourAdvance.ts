/** Accepts one presenter input at a time and leaves editing shortcuts alone. */
export class TourAdvance {
  private resolve: (() => void) | undefined;

  press(): boolean {
    const resolve = this.resolve;
    this.resolve = undefined;
    resolve?.();
    return !!resolve;
  }

  async wait(signal: AbortSignal, present: () => void): Promise<void> {
    signal.throwIfAborted();
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const cancel = () => reject(signal.reason);
    this.resolve = resolve;
    signal.addEventListener("abort", cancel, { once: true });
    try {
      present();
      await promise;
      signal.throwIfAborted();
    } finally {
      signal.removeEventListener("abort", cancel);
      this.resolve = undefined;
    }
  }
}

export function isEditing(target: EventTarget | null): boolean {
  return !!target && "closest" in target && !!(target as Element).closest(
    "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
  );
}

export function handleTourArrow(event: KeyboardEvent, activeElement: Element | null, advance: () => boolean) {
  if (event.key !== "ArrowRight" || event.defaultPrevented || event.repeat || event.isComposing
    || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    || isEditing(activeElement) || event.composedPath().some(isEditing)) return;
  if (advance()) event.preventDefault();
}
