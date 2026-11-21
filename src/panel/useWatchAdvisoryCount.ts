/** Counts the sourced advisories rendered in the watch panel's primary list. */
"use client";

import { useEffect, useRef, useState } from "react";

export function useWatchAdvisoryCount() {
  const panel = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    // Watch owns the live feed. Its sourced rows distinguish advisories from drills.
    const update = () => setCount(element.querySelectorAll(".pw-signal-list > li[data-watch-source]").length);
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);

  return { panel, count };
}
