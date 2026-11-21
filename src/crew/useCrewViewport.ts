/** Reads the mounted camera and asset card for zoom-aware, collision-free callouts. */
import { useLayoutEffect, useRef, useState } from "react";
import type { Box } from "./floorLayout";

export function useCrewViewport(canvas: { w: number; h: number }, selectedId: string | null) {
  const ref = useRef<SVGGElement>(null);
  const [layout, setLayout] = useState<{ viewport: Box; card: Box | null; inverse: number } | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const svg = root?.ownerSVGElement;
    const stage = svg?.closest(".pw-plant-floor");
    if (!root || !svg) return;
    const camera = root.parentElement;
    const tag = stage?.querySelector(".pw-floor-tag-anchor");
    const readLayout = () => {
      const matrix = root.getScreenCTM();
      if (!matrix || matrix.a <= 0) return;
      const { a, d, e, f } = matrix;
      const project = ({ left, top, width, height }: DOMRect): Box => ({
        x: (left - e) / a, y: (top - f) / d, w: width / a, h: height / d,
      });
      const viewport = project(svg.getBoundingClientRect());
      if (!viewport.w || !viewport.h) return;
      const bounds = tag?.getBoundingClientRect();
      const card = bounds && bounds.height > 1 && !tag?.hasAttribute("data-offscreen") ? project(bounds) : null;
      setLayout({ viewport, card, inverse: 1 / a });
    };
    const resize = new ResizeObserver(readLayout);
    resize.observe(svg);
    if (tag) resize.observe(tag);
    const mutate = new MutationObserver(readLayout);
    if (camera) mutate.observe(camera, { attributes: true, attributeFilter: ["style", "transform", "data-easing"] });
    if (tag) mutate.observe(tag, { attributes: true, attributeFilter: ["style", "data-offscreen"] });
    camera?.addEventListener("transitionend", readLayout);
    readLayout();
    return () => {
      resize.disconnect();
      mutate.disconnect();
      camera?.removeEventListener("transitionend", readLayout);
    };
  }, [selectedId]);

  return { ref, ...layout ?? { viewport: { ...canvas, x: 0, y: 0 }, card: null, inverse: 1.4 } };
}
