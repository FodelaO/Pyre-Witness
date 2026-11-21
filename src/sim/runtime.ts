/** Drives playback and one-second plant ticks from the visible browser clock. */
import { useSimStore } from "./simStore";

const FRAME_MS = 80;
let mounted = 0;
let close: (() => void) | null = null;

export function startSimRuntime(): () => void {
  mounted += 1;
  if (!close) {
    const pathname = window.location.pathname;
    let previous = performance.now();
    let plantSeconds = 0;
    let previousMode = useSimStore.getState().mode;
    function resetClock() {
      previous = performance.now();
      plantSeconds = 0;
    }
    const timer = window.setInterval(() => {
      if (window.location.pathname !== pathname) {
        close?.();
        return;
      }
      const now = performance.now();
      const seconds = Math.min(2, (now - previous) / 1000);
      previous = now;
      if (document.hidden) return;

      const sim = useSimStore.getState();
      const modeChanged = sim.mode !== previousMode;
      previousMode = sim.mode;
      if (sim.mode === "playing") sim.advance(modeChanged ? 0 : seconds);
      plantSeconds = modeChanged && sim.mode === "idle" ? 0 : plantSeconds + seconds;
      while (plantSeconds >= 1) {
        sim.tickPlant();
        plantSeconds -= 1;
      }
    }, FRAME_MS);
    document.addEventListener("visibilitychange", resetClock);
    close = () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resetClock);
      close = null;
    };
  }
  return () => {
    mounted -= 1;
    if (mounted === 0) close?.();
  };
}
