/** Pins which figures can raise a call: displayed rounding, and one figure for the captured device. */
import { afterEach, expect, it } from "vitest";
import { roundUsd } from "@/econ/format";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import { readCauses } from "./evidence";

afterEach(() => {
  useRunStore.getState().reset();
  useTwinStore.getState().reset();
});

it("prices each finding with the rounded figure the asset inspector prints", () => {
  const findings = readCauses(null).filter(({ key }) => key.startsWith("finding:"));
  expect(findings.length).toBeGreaterThan(0);
  for (const { loss } of findings) expect(loss).toBe(roundUsd(loss ?? Number.NaN));
});

it("holds finding-level figures for the captured device while its run is still pricing it", () => {
  const seeded = readCauses(null).find(({ key }) => key.startsWith("finding:"));
  expect(seeded?.assetId).toBeTruthy();
  useRunStore.setState({ status: "running", placedAssetId: seeded!.assetId });
  const during = readCauses(seeded!.assetId);
  expect(during.some(({ kind, assetId }) => kind === "finding" && assetId === seeded!.assetId)).toBe(false);
  const risk = during.find(({ kind }) => kind === "risk");
  expect(risk?.assetId).toBe(seeded!.assetId);
  expect(risk?.loss).toBeNull();

  // Without a checked recommendation the panel prints no placement figure, so the findings return.
  useRunStore.setState({ status: "done" });
  const after = readCauses(seeded!.assetId);
  expect(after.some(({ key }) => key === seeded!.key)).toBe(true);
  expect(after.some(({ key }) => key.startsWith("capture:"))).toBe(false);
});
