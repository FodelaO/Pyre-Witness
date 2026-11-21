/** Measures controls that float above a drawing pane and tracks their footprints. */
export const CAPTURE_OVERLAY = ".pw-capture-root";

export function observeViewportOverlays(pane: HTMLElement, selector: string, onChange: (overlays: Element[]) => void) {
  const scope = pane.closest("main") ?? pane;
  let overlays: Element[] = [];
  const resize = new ResizeObserver(() => onChange(overlays));
  resize.observe(pane);

  function refresh() {
    const current = Array.from(scope.querySelectorAll(selector));
    for (const overlay of overlays) if (!current.includes(overlay)) resize.unobserve(overlay);
    for (const overlay of current) if (!overlays.includes(overlay)) resize.observe(overlay);
    overlays = current;
    onChange(overlays);
  }

  const mutations = new MutationObserver((records) => {
    if (records.some(({ addedNodes, removedNodes }) =>
      [...addedNodes, ...removedNodes].some((node) =>
        node instanceof Element && (node.matches(selector) || node.querySelector(selector)),
      ),
    )) refresh();
  });
  mutations.observe(scope, { subtree: true, childList: true });
  refresh();
  return () => {
    resize.disconnect();
    mutations.disconnect();
  };
}
