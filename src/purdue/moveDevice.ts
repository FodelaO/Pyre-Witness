/** Commits a diagram move to the twin and requests assessment for that placement. */
import { reassessAsset } from "@/pipeline/client";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { NetworkDrop } from "./layout";

export function moveAddedDevice(id: string, { area, level }: Pick<NetworkDrop, "area" | "level">) {
  const { twin, updateAsset, select } = useTwinStore.getState();
  const asset = assetById(twin, id);
  if (asset?.origin !== "added" || (asset.network.area === area && asset.network.level === level)) return;
  updateAsset(id, (current) => ({ ...current, network: { ...current.network, area, level } }));
  select(id);
  return reassessAsset(id);
}
