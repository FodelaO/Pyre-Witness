/** Compact `2D | 3D` instrument switch. Hides itself when the browser has no WebGL2. */
"use client";

import { useEffect, useState } from "react";
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

export function handleViewArrow(key: string, buttons: ArrayLike<Pick<HTMLButtonElement, "focus">>) {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return false;
  useView3DStore.getState().chooseView(key === "ArrowRight");
  const selected = useView3DStore.getState().enabled ? 1 : 0;
  buttons[selected]?.focus();
  return true;
}

export default function View3DToggle({ className }: { className?: string }) {
  const enabled = useView3DStore((state) => state.enabled);
  const chooseView = useView3DStore((state) => state.chooseView);
  const supported = useWebGL2Support();

  useEffect(() => {
    if (supported === false && useView3DStore.getState().enabled) useView3DStore.getState().fail();
  }, [supported]);

  if (!supported) return null;

  return (
    <div className={"pw3d-toggle" + (className ? " " + className : "")} role="radiogroup" aria-label="Plant view dimension" title={HEIGHTS_CAPTION}
      onKeyDown={(event) => { if (handleViewArrow(event.key, event.currentTarget.querySelectorAll("button"))) event.preventDefault(); }}>
      <button type="button" role="radio" aria-checked={!enabled} tabIndex={enabled ? -1 : 0} onClick={() => chooseView(false)}>2D</button>
      <button type="button" role="radio" aria-checked={enabled} tabIndex={enabled ? 0 : -1} onClick={() => chooseView(true)}>3D</button>
    </div>
  );
}
