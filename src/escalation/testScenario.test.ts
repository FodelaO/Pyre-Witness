/** Runs the rehearsal through real twin, rules, economics and escalation store transitions. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { estimateLoss } from "@/econ/model";
import { scenarioFromPath } from "@/econ/scenarios";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import { monitorEscalations } from "./monitor";
import { DEFAULT_THRESHOLDS, ESCALATION_DEBOUNCE_MS, thresholdCrossed } from "./policy";
import { useEscalationStore } from "./store";
import { clearTestAlert, runTestAlert, TEST_ASSET_ID, TEST_BRIEFING_PREFIX } from "./testScenario";
import { testScenarioCause } from "./testScenarioEvidence";

beforeEach(() => {
  useTwinStore.getState().setTwin(SEED_TWIN);
  useEscalationStore.setState({ records: [], thresholds: DEFAULT_THRESHOLDS });
  vi.useFakeTimers();
});

afterEach(() => {
  useTwinStore.getState().setTwin(SEED_TWIN);
  vi.useRealTimers();
});

it("raises and resolves one labeled test alert above the default loss threshold", () => {
  const stop = monitorEscalations();
  const records = () => useEscalationStore.getState().records.filter(({ trigger }) => trigger.test);
  const baseline = useTwinStore.getState().risk.score;
  try {
    expect(runTestAlert()).toBe(true);
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
    expect(thresholdCrossed(cause, DEFAULT_THRESHOLDS)).toBe(true);
    vi.advanceTimersByTime(ESCALATION_DEBOUNCE_MS - 1);
    expect(records()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(records()).toHaveLength(1);
    expect(records()[0].script.startsWith(TEST_BRIEFING_PREFIX)).toBe(true);
    expect(records()[0].script).toContain("rogue LTE gateway");
    expect(records()[0].script).toContain("Remove the test gateway from the twin");

    runTestAlert();
    vi.advanceTimersByTime(ESCALATION_DEBOUNCE_MS);
    expect(records()).toHaveLength(1);
    clearTestAlert();
    expect(useTwinStore.getState().twin.assets.some(({ id }) => id === TEST_ASSET_ID)).toBe(false);
    expect(useTwinStore.getState().risk.score).toBe(baseline);
    expect(records()[0].resolvedAt).toBeDefined();
    expect(testScenarioCause(useTwinStore.getState())).toBeNull();
  } finally {
    stop();
  }
});
