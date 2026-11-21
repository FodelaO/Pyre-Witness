/** Retains a profile and assessment per captured asset for the inspector's current session. */
import { create } from "zustand";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";

export interface CaptureContext { profile: DeviceProfile; assessment: Assessment }

// A null entry reserves the tag for a capture that has landed but has no assessment yet.
const useCaptures = create<ReadonlyMap<string, CaptureContext | null>>(() => new Map());

function remember({ placedAssetId: id, profile, assessment, events }: RunState, previous?: RunState) {
  if (!id || !profile) return;
  const captures = useCaptures.getState();
  const cached = captures.get(id);
  const claimed = id !== previous?.placedAssetId || profile !== previous?.profile;
  if (!claimed && (!captures.has(id) || !assessment || assessment === cached?.assessment)) return;
  if (!assetById(useTwinStore.getState().twin, id)) return;
  const start = events[0];
  if (!assessment && start?.type === "run.started" && start.mode === "reassess" && cached?.profile === profile) return;
  useCaptures.setState(new Map(captures).set(id, assessment ? { profile, assessment } : null), true);
}

remember(useRunStore.getState());
useRunStore.subscribe(remember);
useTwinStore.subscribe(({ twin }, previous) => {
  if (twin.assets === previous.twin.assets) return;
  const captures = useCaptures.getState();
  const removed = [...captures.keys()].filter((id) => !assetById(twin, id));
  if (!removed.length) return;
  const next = new Map(captures);
  for (const id of removed) next.delete(id);
  useCaptures.setState(next, true);
});

export function captureContext(assetId: string) {
  return useCaptures.getState().get(assetId) ?? undefined;
}

export function useCaptureContext(assetId: string) {
  return useCaptures((captures) => captures.get(assetId) ?? undefined);
}
