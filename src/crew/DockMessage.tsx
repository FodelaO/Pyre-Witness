/** Keeps the dock status on one line, trimming only at whole words. */
"use client";

import { useLayoutEffect, useRef, useState } from "react";

export default function DockMessage({ message }: { message: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(message);

  useLayoutEffect(() => {
    const label = ref.current;
    const measure = document.createElement("canvas").getContext("2d");
    if (!label || !measure) return;
    const fit = () => {
      const { width } = label.getBoundingClientRect();
      if (!width) return;
      const { fontSize, fontWeight, fontFamily } = getComputedStyle(label);
      measure.font = `${fontWeight} ${fontSize} ${fontFamily}`;
      if (measure.measureText(message).width <= width) {
        setVisible(message);
        return;
      }
      let prefix = "";
      for (const word of message.matchAll(/\S+/g)) {
        const next = message.slice(0, word.index + word[0].length).replace(/[\s·]+$/, "");
        if (measure.measureText(`${next}…`).width > width) break;
        prefix = next;
      }
      setVisible(`${prefix}…`);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(label);
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      resize.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [message]);

  return <span ref={ref} className="pw-crew-dock-message" title={message}>{visible}</span>;
}
