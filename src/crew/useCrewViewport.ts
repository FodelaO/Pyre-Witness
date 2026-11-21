/** Reads the mounted camera, asset card and floor controls for zoom-aware, collision-free callouts. */
import { useLayoutEffect, useRef, useState } from "react";
import type { Box } from "./floorLayout";

const protectedLabels = ".pw-floor-zone-label-back, .pw-floor-zone-chip rect, .pw-floor-asset-tag";

export function useCrewViewport(canvas: { w: number; h: number }, selectedId: string | null) {
  const ref = useRef<SVGGElement>(null);
  const [layout, setLayout] = useState<{ viewport: Box; card: Box | null; chrome: Box[]; labels: Box[]; inverse: number } | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const svg = root?.ownerSVGElement;
    const stage = svg?.closest(".pw-plant-floor");
    if (!root || !svg) return;
    const camera = root.parentElement;
    const tag = stage?.querySelector(".pw-floor-tag-anchor");
    const readLayout = () => {
      const matrix = root.getScreenCTM();
      if (!matrix || matrix.a <= 0 || matrix.d <= 0) return;
      const { a, d, e, f } = matrix;
      const project = ({ left, top, width, height }: DOMRect): Box => ({
        x: (left - e) / a, y: (top - f) / d, w: width / a, h: height / d,
      });
      const viewport = project(svg.getBoundingClientRect());
      if (!viewport.w || !viewport.h) return;
      const bounds = tag?.getBoundingClientRect();
      const card = bounds && bounds.height > 1 && !tag?.hasAttribute("data-offscreen") ? project(bounds) : null;
      // Zoom buttons and the legend float over the drawing; callouts must not hide under them.
      const chrome = [...(stage?.querySelectorAll(".pw-floor-zoom, .pw-floor-legend-card") ?? [])]
        .map((element) => element.getBoundingClientRect()).filter(({ width, height }) => width > 1 && height > 1).map(project);
      const labels = [...svg.querySelectorAll(protectedLabels)]
        .filter((element) => Number(getComputedStyle(element).opacity) > .05).map((element) => element.getBoundingClientRect())
        .filter(({ width, height }) => width > 1 && height > 1).map(project)
        .map(({ x, y, w, h }) => ({ x: x - 2 / a, y: y - 2 / d, w: w + 4 / a, h: h + 4 / d }));
      setLayout({ viewport, card, chrome, labels, inverse: 1 / a });
    };
    let nextFrame = 0;
    const schedule = () => {
      if (nextFrame) return;
      nextFrame = requestAnimationFrame(() => { nextFrame = 0; readLayout(); });
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(svg);
    if (tag) resize.observe(tag);
    const mutate = new MutationObserver(schedule);
    if (camera) mutate.observe(camera, { attributes: true, attributeFilter: ["style", "transform", "data-easing"] });
    if (tag) mutate.observe(tag, { attributes: true, attributeFilter: ["style", "data-offscreen"] });
    if (stage) mutate.observe(stage, { attributes: true, attributeFilter: ["data-lens", "data-lens-detail"] });
    for (const layer of svg.querySelectorAll(".pw-floor-assets, .pw-floor-zone-labels")) {
      mutate.observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ["transform", "textLength"] });
    }
    const settled = (event: TransitionEvent) => {
      if (event.target === camera || (event.target instanceof Element && event.target.matches(protectedLabels))) schedule();
    };
    svg.addEventListener("transitionend", settled);
    readLayout();
    return () => {
      resize.disconnect();
      mutate.disconnect();
      if (nextFrame) cancelAnimationFrame(nextFrame);
      svg.removeEventListener("transitionend", settled);
    };
  }, [selectedId]);

  return { ref, ...layout ?? { viewport: { ...canvas, x: 0, y: 0 }, card: null, chrome: [] as Box[], labels: [] as Box[], inverse: 1.4 } };
}
