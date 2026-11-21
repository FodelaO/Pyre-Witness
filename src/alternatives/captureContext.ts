/** Retains a profile and assessment per captured asset for the inspector's current session. */
import { useRunStore, type RunState } from "@/pipeline/runStore";
import type { Assessment, DeviceProfile } from "@/pipeline/types";

interface CaptureContext { profile: DeviceProfile; assessment: Assessment }

const captures = new Map<string, CaptureContext>();

function remember({ placedAssetId, profile, assessment }: RunState) {
  if (placedAssetId && profile && assessment) captures.set(placedAssetId, { profile, assessment });
}

remember(useRunStore.getState());
useRunStore.subscribe(remember);

export function captureContext(assetId: string) {
  return captures.get(assetId);
}
