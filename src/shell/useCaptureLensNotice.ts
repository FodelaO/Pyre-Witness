/** Reveals digital impact once per new capture and defers while the slider is held. */
import { useEffect, useRef, useState } from "react";
import { useLensStore } from "@/layers/lensStore";
import { captureWithDataImpact } from "@/panel/runEvidence";
import { useRunStore } from "@/pipeline/runStore";

export function useCaptureLensNotice(): boolean {
  const capture = useRunStore(captureWithDataImpact);
  const dragging = useLensStore((state) => state.dragging);
  const considered = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const lens = useLensStore.getState();
    if (!capture || capture === considered.current || dragging || lens.dragging) return;
    considered.current = capture;
    if (lens.mode === "material") {
      lens.setMode("both");
      setNotice(capture);
    }
  }, [capture, dragging]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return notice !== null && notice === capture;
}
