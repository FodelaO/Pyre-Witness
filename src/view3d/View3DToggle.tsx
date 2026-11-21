/** Compact `2D | 3D` instrument switch. Hides itself when the browser has no WebGL2. */
"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { isWebGL2Available } from "./gl/renderer";
import { useView3DStore } from "./view3dStore";
import "./view3d.css";
import { HEIGHTS_CAPTION } from "./scene";

let supportCache: boolean | null = null;

/** Probes WebGL2 once per page (after mount, so server and first client render agree). */
export function useWebGL2Support(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(supportCache);
  useEffect(() => {
    if (supportCache === null) supportCache = isWebGL2Available();
    setSupported(supportCache);
  }, []);
  return supported;
}

export default function View3DToggle({ className }: { className?: string }) {
  const enabled = useView3DStore((state) => state.enabled);
  const chooseView = useView3DStore((state) => state.chooseView);
  const supported = useWebGL2Support();

  useEffect(() => {
    if (supported === false && useView3DStore.getState().enabled) useView3DStore.getState().fail();
  }, [supported]);

  if (!supported) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      chooseView(event.key === "ArrowRight");
    }
  }

  return (
    <div className={"pw3d-toggle" + (className ? " " + className : "")} role="radiogroup" aria-label="Plant view dimension" title={HEIGHTS_CAPTION} onKeyDown={onKeyDown}>
      <button type="button" role="radio" aria-checked={!enabled} tabIndex={enabled ? -1 : 0} onClick={() => chooseView(false)}>2D</button>
      <button type="button" role="radio" aria-checked={enabled} tabIndex={enabled ? 0 : -1} onClick={() => chooseView(true)}>3D</button>
    </div>
  );
}
