/** Uses the device type until the pipeline assigns a human-readable tag. */
import type { Area, Asset } from "@/twin/types";

export function assetLabel({ id, origin, description, name }: Asset): string {
  // The escalation test scenario's injected device is labelled as a test on every drawing.
  if (id === "TEST-901") return `${id} · TEST SCENARIO`;
  return origin === "added" && /^NEW-[a-f0-9]{8}$/i.test(id) ? description || name : id;
}

export function labelAboveWashdown(x: number, bottom: number, washdown: Area["bounds"] | undefined, fitScale: number): boolean {
  return !!washdown && x >= washdown.x && x <= washdown.x + washdown.w
    && Math.abs(washdown.y + washdown.h - bottom) < 12 / fitScale;
}
