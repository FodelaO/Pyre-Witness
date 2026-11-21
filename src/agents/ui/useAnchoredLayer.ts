/** Positions a floating pane beside its anchor, clamped to the visible window. */
"use client";

import { useLayoutEffect, type RefObject } from "react";

export function useAnchoredLayer(panel: RefObject<HTMLElement | null>, anchor: HTMLElement | RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = panel.current;
    const origin = anchor instanceof HTMLElement ? anchor : anchor.current;
    if (!element || !origin) return;

    function position() {
      if (!element || !origin) return;
      const gap = 9;
      const edge = 12;
      const box = origin.getBoundingClientRect();
      const { offsetWidth, offsetHeight } = element;
      const maxLeft = Math.max(edge, window.innerWidth - offsetWidth - edge);
      const maxTop = Math.max(edge, window.innerHeight - offsetHeight - edge);
      const right = box.right + gap;
      const left = box.left - offsetWidth - gap;
      const side = right <= maxLeft ? "right" : left >= edge ? "left" : "stacked";
      const x = side === "right" ? right : side === "left" ? left : box.left;
      const below = box.bottom + gap;
      const above = box.top - offsetHeight - gap;
      const y = side !== "stacked" ? box.top : below <= maxTop || above < edge ? below : above;
      element.style.left = `${Math.max(edge, Math.min(maxLeft, x))}px`;
      element.style.top = `${Math.max(edge, Math.min(maxTop, y))}px`;
      element.dataset.side = side;
    }

    position();
    const observer = new ResizeObserver(position);
    observer.observe(origin);
    observer.observe(element);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [anchor, panel]);
}
