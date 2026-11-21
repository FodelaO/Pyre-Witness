/** Decides whether the activity feed needs its rows in the page. */

/**
 * The results panel keeps the feed inside a disclosure that starts closed. Nothing in a closed
 * disclosure is visible, so its rows (up to 200, updated on every crew step) need not exist.
 * A feed that is not inside a disclosure is always shown.
 */
export function feedShown(disclosure: Pick<HTMLDetailsElement, "open"> | null | undefined): boolean {
  return disclosure ? disclosure.open : true;
}
