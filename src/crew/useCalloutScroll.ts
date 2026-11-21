/** Lets a scrollable crew callout consume its own wheel gestures. */
import { useEffect, useRef } from "react";

export function useCalloutScroll<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const stopFloorZoom = (event: WheelEvent) => event.stopPropagation();
    element.addEventListener("wheel", stopFloorZoom, { passive: true });
    return () => element.removeEventListener("wheel", stopFloorZoom);
  }, [enabled]);
  return ref;
}
