/** Coalesces newly raised causes and admits at most one automatic call per minute. */
export const AUTOMATIC_CALL_COOLDOWN_MS = 60_000;

export function createAutomaticCallDebounce(now: () => number = Date.now) {
  const seen = new Set<string>();
  let lastCall = -Infinity;

  return function take<T extends { id: string }>(orderedCauses: readonly T[]): T | undefined {
    const next = orderedCauses.find(({ id }) => !seen.has(id));
    if (!next) return undefined;
    for (const { id } of orderedCauses) seen.add(id);
    const time = now();
    if (time - lastCall < AUTOMATIC_CALL_COOLDOWN_MS) return undefined;
    lastCall = time;
    return next;
  };
}
