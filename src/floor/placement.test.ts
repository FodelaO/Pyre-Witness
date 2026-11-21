/** Tests floor placement against the shared stores with an isolated reassessment spy. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reassessAsset } from "@/pipeline/client";
import { useDropStore } from "@/twin/dropPoint";
import { areaCenter, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { beginAssetMove, completeAssetMove, pinOnFloor, previewAssetMove } from "./placement";

vi.mock("@/pipeline/client", () => ({ reassessAsset: vi.fn(async () => undefined) }));

const store = useTwinStore.getState;
const drop = useDropStore.getState;
const [source, destination] = store().twin.areas.filter((area) => area.kind === "process");
const origin = areaCenter(source);
const target = areaCenter(destination);
const fixture: Asset = {
  id: "FLOOR-TEST-DEVICE",
  name: "Floor test fixture",
  origin: "added",
  status: "ok",
  criticality: 1,
  physical: { ...origin, area: source.id, kind: "generic_device", rotation: 0, connections: [] },
  network: { level: 0, area: "Test", conduit: null },
};

beforeEach(() => {
  store().reset();
  drop().setPoint(null);
  vi.clearAllMocks();
});

describe("floor placement", () => {
  it("leaves the pin armed in an unmarked gap and disarms after a valid click", () => {
    drop().arm();
    expect(pinOnFloor({ x: -5, y: -5 })).toBe(false);
    expect(drop().armed).toBe(true);
    expect(pinOnFloor(origin)).toBe(true);
    expect(drop()).toMatchObject({ armed: false, point: { ...origin, area: source.id } });
  });

  it("ignores seed equipment and added devices while a pin is armed", () => {
    const seed = store().twin.assets[0];
    expect(beginAssetMove(seed.id, seed.physical)).toBeNull();
    store().addAsset(fixture);
    drop().arm();
    expect(beginAssetMove(fixture.id, origin)).toBeNull();
  });

  it("updates coordinates and area during drag, then hands off one reassessment after release", async () => {
    store().addAsset(fixture);
    const move = beginAssetMove(fixture.id, { x: origin.x + 4, y: origin.y - 6 })!;
    previewAssetMove(move, { x: target.x + 4, y: target.y - 6 });
    previewAssetMove(move, { x: -20, y: -20 });

    expect(assetById(store().twin, fixture.id)?.physical).toMatchObject({ ...target, area: destination.id });
    expect(store().selectedId).toBe(fixture.id);
    expect(reassessAsset).not.toHaveBeenCalled();
    await completeAssetMove(move, false);
    expect(reassessAsset).toHaveBeenCalledExactlyOnceWith(fixture.id);
  });

  it("restores the original placement on pointer cancellation", () => {
    store().addAsset(fixture);
    const move = beginAssetMove(fixture.id, origin)!;
    previewAssetMove(move, target);
    completeAssetMove(move, true);

    expect(assetById(store().twin, fixture.id)?.physical).toEqual(fixture.physical);
    expect(reassessAsset).not.toHaveBeenCalled();
  });
});
