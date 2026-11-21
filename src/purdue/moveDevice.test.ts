/** Verifies network-only relocation and the reassessment call at the shared store boundary. */
import { afterEach, expect, it, vi } from "vitest";
import * as pipeline from "@/pipeline/client";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { moveAddedDevice } from "./moveDevice";

afterEach(() => {
  vi.restoreAllMocks();
  useTwinStore.getState().reset();
});

it("moves an added asset's network placement, keeps its physical reference, and requests reassessment", async () => {
  const store = useTwinStore.getState();
  const seed = store.twin.assets[0];
  const asset: Asset = { ...seed, id: "test-added-device", origin: "added" };
  store.addAsset(asset);
  const reassess = vi.spyOn(pipeline, "reassessAsset").mockResolvedValue(undefined);

  expect(moveAddedDevice(seed.id, { level: 3.5, area: "Test DMZ" })).toBeUndefined();
  expect(moveAddedDevice(asset.id, asset.network)).toBeUndefined();
  expect(reassess).not.toHaveBeenCalled();

  await moveAddedDevice(asset.id, { level: 3.5, area: "Test DMZ" });
  const state = useTwinStore.getState();
  expect(state.selectedId).toBe(asset.id);
  expect(state.twin.assets.find(({ id }) => id === asset.id)).toMatchObject({
    network: { ...asset.network, level: 3.5, area: "Test DMZ" },
  });
  expect(state.twin.assets.find(({ id }) => id === asset.id)?.physical).toBe(asset.physical);
  expect(reassess).toHaveBeenCalledExactlyOnceWith(asset.id);
});
