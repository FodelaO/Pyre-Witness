/** Runs the rehearsal through real twin, rules, economics and escalation store transitions. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { estimateLoss } from "@/econ/model";
import { scenarioFromPath } from "@/econ/scenarios";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import { AlertLadder } from "./AlertLadder";
import { readCauses } from "./evidence";
import { useFlagStore } from "./flagStore";
import { monitorEscalations } from "./monitor";
import { DEFAULT_THRESHOLDS, ESCALATION_DEBOUNCE_MS, thresholdCrossed } from "./policy";
import { useEscalationStore } from "./store";
import { TelephoneCard } from "./TelephoneCard";
import { clearTestAlert, runTestAlert, TEST_ASSET_ID, TEST_BRIEFING_PREFIX } from "./testScenario";
import { testScenarioCause } from "./testScenarioEvidence";
import { useEscalationPhone } from "./useEscalationPhone";

beforeEach(() => {
  useTwinStore.getState().setTwin(SEED_TWIN);
  useEscalationStore.setState({ records: [], thresholds: DEFAULT_THRESHOLDS });
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null });
});

afterEach(() => {
  useTwinStore.getState().setTwin(SEED_TWIN);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("preserves inventory that occupies the rehearsal tag", () => {
  const store = useTwinStore.getState();
  const inventory = { ...store.twin.assets.find(({ id }) => id === "HMI-F3")!,
    id: TEST_ASSET_ID, name: "Calibration station HMI" };
  store.addAsset(inventory);
  const before = useTwinStore.getState();
  expect.soft(runTestAlert()).toBe(false);
  expect.soft(useTwinStore.getState().selectedId).toBe(before.selectedId);
  expect.soft(readCauses(null).some((cause) => cause.kind === "finding" && cause.assetId === TEST_ASSET_ID && !cause.test)).toBe(true);
  clearTestAlert();
  expect.soft(useTwinStore.getState().twin.assets).toContain(inventory);
  expect.soft(useTwinStore.getState().risk.score).toBe(before.risk.score);

  store.removeAsset(TEST_ASSET_ID);
  expect(runTestAlert()).toBe(true);
  const gateway = useTwinStore.getState().twin.assets.find(({ id }) => id === TEST_ASSET_ID)!;
  const importedCopy = structuredClone(gateway);
  store.addAsset(importedCopy);
  expect.soft(testScenarioCause(useTwinStore.getState())).toBeNull();
  clearTestAlert();
  expect(useTwinStore.getState().twin.assets).toContain(importedCopy);
});

it("starts without a phone and raises and resolves all three labeled tiers together", () => {
  const stop = monitorEscalations();
  const records = () => useEscalationStore.getState().records.filter(({ trigger }) => trigger.test);
  const baseline = useTwinStore.getState().risk.score;
  try {
    let toggleTest: (() => boolean) | undefined;
    function TestAlertControl() {
      const phone = useEscalationPhone([]);
      expect(phone.contact).toBeNull();
      toggleTest = phone.toggleTest;
      return null;
    }
    renderToStaticMarkup(createElement(TestAlertControl));
    expect(toggleTest?.()).toBe(true);
    const state = useTwinStore.getState();
    const gateway = state.twin.assets.find(({ id }) => id === TEST_ASSET_ID);
    expect(gateway?.name).toBe("TEST · rogue LTE gateway");
    expect(gateway?.description).toContain("TEST SCENARIO");
    expect(gateway?.physical.connections).toContainEqual(expect.objectContaining({ to: "PLC-F3", medium: "network" }));
    expect(state.risk.score).toBeGreaterThan(baseline);
    const modeledLosses = state.risk.paths.filter((path) => path.steps[0]?.to === TEST_ASSET_ID)
      .map((path) => estimateLoss(state.twin, scenarioFromPath(state.twin, path)).lossIfManifests);
    expect(Math.max(...modeledLosses)).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.loss);
    const cause = testScenarioCause(state);
    if (!cause) throw new Error("The rules engine and loss model did not yield a test alert.");
    expect(cause.loss).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.loss);
    expect(state.risk.paths.find(({ title }) => title === cause.title)?.target).toBe("FIL-3");
    expect(thresholdCrossed(cause, DEFAULT_THRESHOLDS)).toBe(true);
    vi.advanceTimersByTime(ESCALATION_DEBOUNCE_MS - 1);
    expect(records()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(records().map(({ level, trigger }) => [level, trigger.assetId])).toEqual([
      [3, TEST_ASSET_ID], [1, "PT-401"], [2, "HMI-F3"],
    ]);
    expect(new Set(records().map(({ raisedAt }) => raisedAt)).size).toBe(1);
    expect(useFlagStore.getState().flags).toContainEqual(expect.objectContaining({ assetId: "PT-401", level: 1 }));
    expect(useFlagStore.getState().flags.map(({ assetId }) => assetId)).not.toContain("HMI-F3");
    expect(records()[0].script.startsWith(TEST_BRIEFING_PREFIX)).toBe(true);
    expect(records()[0].script).toContain("rogue LTE gateway");
    expect(records()[0].script).toMatch(/ Attack path from .+ to FIL-3\. Estimated loss \$[\d.,]+[kM]?\. /);
    expect(records()[0].script).toContain("Remove the test gateway from the twin");
    const callControls = renderToStaticMarkup(createElement(TelephoneCard, {
      mode: null, resolved: false, onCall: vi.fn(), onDevice: vi.fn(),
    }));
    expect(callControls).toContain("Add phone to get calls</button>");
    expect(callControls).toContain("lucide-phone");

    runTestAlert();
    vi.advanceTimersByTime(ESCALATION_DEBOUNCE_MS);
    expect(records()).toHaveLength(3);
    clearTestAlert();
    expect(useTwinStore.getState().twin.assets.some(({ id }) => id === TEST_ASSET_ID)).toBe(false);
    expect(useTwinStore.getState().risk.score).toBe(baseline);
    expect(records().every(({ resolvedAt }) => resolvedAt !== undefined)).toBe(true);
    expect(testScenarioCause(useTwinStore.getState())).toBeNull();
    expect(useFlagStore.getState().flags.map(({ assetId }) => assetId)).not.toContain("PT-401");
  } finally {
    stop();
  }
});

it("clears the test chips and flags and restores the pre-test risk without the monitor", () => {
  const riskBefore = useTwinStore.getState().risk.score;
  const stop = monitorEscalations();
  try {
    expect(runTestAlert()).toBe(true);
    vi.advanceTimersByTime(ESCALATION_DEBOUNCE_MS);
  } finally {
    stop();
  }

  const openId = useEscalationStore.getState().records.find(({ trigger }) => trigger.assetId === TEST_ASSET_ID)?.id;
  const renderLadder = (testRunning: boolean) => renderToStaticMarkup(createElement(AlertLadder, {
    records: useEscalationStore.getState().records,
    openId, testRunning, phoneConnected: false, onOpen: vi.fn(), onRing: vi.fn(), respond: vi.fn(),
  }));
  const rehearsal = renderLadder(true);
  for (const label of ["Flag · PT-401", "Message · HMI-F3", "Call · TEST-901", "Deciding…"]) {
    expect(rehearsal).toContain(label);
  }
  expect(useFlagStore.getState().flags).toContainEqual(expect.objectContaining({ assetId: "PT-401" }));

  clearTestAlert();

  const chips = renderLadder(false);
  expect(chips).not.toMatch(/Flag · PT-401|Message · HMI-F3|Call · TEST-901|TEST SCENARIO/);
  expect(useEscalationStore.getState().records.filter(({ trigger, resolvedAt }) => trigger.test && !resolvedAt)).toEqual([]);
  expect(useFlagStore.getState().flags.map(({ assetId }) => assetId)).not.toContain("PT-401");
  expect(useTwinStore.getState().twin.assets.some(({ id }) => id === TEST_ASSET_ID)).toBe(false);
  expect(useTwinStore.getState().risk.score).toBe(riskBefore);
});
