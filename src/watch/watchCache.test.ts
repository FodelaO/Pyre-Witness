/** Verifies reload restores pending watch proposals without a second run or a replayed decision. */
import { useTwinStore } from "@/twin/store";
import { afterEach, expect, it, vi } from "vitest";
import type { WatchReport } from "./types";
import { LAST_WATCH_DAY, restoreWatchReport, saveWatchReport } from "./watchCache";
import { useWatchStore, watchDay } from "./watchStore";

afterEach(() => {
  useTwinStore.getState().reset();
  vi.unstubAllGlobals();
});

it("restores pending proposals once and remembers approvals and rejections across a twin reload", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const date = watchDay();
  const { risk, proposeMitigations, decideMitigation, reset } = useTwinStore.getState();
  const base = {
    title: "Fixture safeguard", description: "Review the simulation", kind: "physical" as const,
    proposedBy: "threat-watch", status: "proposed" as const, riskDelta: 0,
  };
  const recommendations: WatchReport["recommendations"] = [
    { ...base, id: "watch-applied", targets: ["HMI-F3"], effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "port-lock" }] },
    { ...base, id: "watch-rejected", targets: ["HMI-F3"], effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "locked-cabinet" }] },
    { ...base, id: "watch-pending", targets: ["GW-PK"], effects: [{ type: "disable_radio", assetId: "GW-PK", radio: "cellular" }] },
    { ...base, id: "watch-stale", targets: ["removed"], effects: [{ type: "add_protection", assetId: "removed", protection: "port-lock" }] },
  ];
  const report: WatchReport = {
    date, runId: "fixture", mode: "local", finishedAt: Date.now(), headline: "Fixture report", baselineScore: risk.score,
    sources: [], candidates: [], items: [], warnings: [], stages: [], recommendations,
  };
  saveWatchReport(report);
  values.set(LAST_WATCH_DAY, date);
  proposeMitigations(recommendations.slice(0, 2));
  decideMitigation("watch-applied", "approved");
  decideMitigation("watch-rejected", "rejected");
  expect(JSON.parse(values.get("pyre-witness:watch:last-report")!).recommendations.map(({ status }: { status: string }) => status))
    .toEqual(Array(4).fill("proposed"));
  reset();

  const initialTwin = useTwinStore.getState().twin;
  useWatchStore.getState().runDaily();
  useWatchStore.getState().runDaily();
  restoreWatchReport(date, "local");
  expect(fetch).not.toHaveBeenCalled();
  expect(useTwinStore.getState().twin).toBe(initialTwin);
  expect(useTwinStore.getState().mitigations).toMatchObject([{ id: "watch-pending", status: "proposed", riskDelta: expect.any(Number) }]);
  const restored = useWatchStore.getState().local.report;
  expect(restored?.recommendations.map(({ id }) => id)).toEqual(["watch-pending"]);
  expect(restored?.warnings).toEqual([expect.stringContaining("1 saved proposals need a fresh review")]);
});
