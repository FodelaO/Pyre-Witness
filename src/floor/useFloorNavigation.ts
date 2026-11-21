/** Gives the drawing one sequential focus stop and spatial arrow navigation. */
import { useLayoutEffect, useRef, type RefObject } from "react";
import type { LensMode } from "@/layers/lensStore";

type DrawingTarget = SVGElement | HTMLElement;
const TARGET = ".pw-floor-svg [data-floor-target][tabindex], .pw-purdue-canvas button:not(:disabled), .pw3d-stage button:not(:disabled)";
const MANAGED = ".pw-floor-svg, .pw-floor-svg [tabindex], .pw-purdue-scroll, .pw-purdue-canvas button, .pw3d-stage button";
const direction: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

function available(target: DrawingTarget) {
  return target.matches(TARGET) && !target.closest('[aria-hidden="true"]')
    && target.getClientRects().length > 0 && getComputedStyle(target).visibility === "visible";
}

function focusOrder(owner: Element, target: DrawingTarget) {
  if (owner instanceof SVGElement && owner !== target && owner.getAttribute("tabindex") !== "-1") owner.setAttribute("tabindex", "-1");
  for (const element of owner.querySelectorAll(MANAGED)) {
    if (element !== target && element.getAttribute("tabindex") !== "-1") element.setAttribute("tabindex", "-1");
  }
  if (target.getAttribute("tabindex") !== "0") target.setAttribute("tabindex", "0");
}

function nextTarget(owner: Element, current: DrawingTarget, axis: readonly [number, number]) {
  const origin = current.getBoundingClientRect();
  let nearest: DrawingTarget | undefined;
  let cost = Infinity;
  for (const candidate of owner.querySelectorAll<DrawingTarget>(TARGET)) {
    if (candidate === current || !available(candidate)) continue;
    const box = candidate.getBoundingClientRect();
    const x = box.x + box.width / 2 - (origin.x + origin.width / 2);
    const y = box.y + box.height / 2 - (origin.y + origin.height / 2);
    const advance = x * axis[0] + y * axis[1];
    const side = Math.abs(x * axis[1] - y * axis[0]);
    const score = Math.hypot(advance, side) + side;
    if (advance > 1 && score < cost) {
      nearest = candidate;
      cost = score;
    }
  }
  return nearest;
}

export function useFloorNavigation(svgRef: RefObject<SVGSVGElement | null>, lens: LensMode) {
  const active = useRef<DrawingTarget | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const owner = svg.closest(".pw-stage-views") ?? svg;
    const reconcile = () => {
      if (!active.current || !owner.contains(active.current) || !available(active.current)) {
        active.current = Array.from(svg.querySelectorAll<DrawingTarget>("[data-floor-asset][tabindex]")).find(available)
          ?? Array.from(owner.querySelectorAll<DrawingTarget>(TARGET)).find(available) ?? svg;
      }
      focusOrder(owner, active.current);
    };
    const onFocus = (event: Event) => {
      const candidate = event.target instanceof Element ? event.target.closest<DrawingTarget>(TARGET) : null;
      if (candidate && available(candidate)) {
        active.current = candidate;
        focusOrder(owner, candidate);
      }
    };
    const onArrow = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;
      const axis = direction[event.key];
      const current = event.target instanceof Element ? event.target.closest<DrawingTarget>(TARGET) : null;
      if (!axis || !current) return;
      event.preventDefault();
      const nearest = nextTarget(owner, current, axis);
      nearest?.focus({ preventScroll: nearest instanceof SVGElement });
    };
    reconcile();
    const observer = new MutationObserver(reconcile);
    observer.observe(owner, { childList: true, subtree: true, attributes: true, attributeFilter: ["tabindex", "aria-hidden", "data-view3d"] });
    owner.addEventListener("focusin", onFocus);
    owner.addEventListener("keydown", onArrow);
    return () => {
      observer.disconnect();
      owner.removeEventListener("focusin", onFocus);
      owner.removeEventListener("keydown", onArrow);
    };
  }, [lens, svgRef]);
}
