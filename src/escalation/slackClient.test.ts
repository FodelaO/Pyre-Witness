/** Verifies the real rehearsal trigger uses the Slack client once per raised alert. */
import { expect, it, vi } from "vitest";
import { monitorEscalations } from "./monitor";
import { ESCALATION_DEBOUNCE_MS } from "./policy";
import { monitorSlackAlerts, useSlackStatuses } from "./slackClient";
import { useEscalationStore } from "./store";
import { clearTestAlert, runTestAlert, TEST_ASSET_ID } from "./testScenario";

it("posts a test alert once and keeps its Slack receipt across record updates and remounts", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null });
  const post = vi.fn<typeof fetch>().mockImplementation(async () =>
    Response.json({ sent: false, reason: "not-configured" }));
  vi.stubGlobal("fetch", post);
  const stopSlack = monitorSlackAlerts();
  const stopEscalations = monitorEscalations();
  try {
    expect(runTestAlert()).toBe(true);
    await vi.advanceTimersByTimeAsync(ESCALATION_DEBOUNCE_MS);
    const record = useEscalationStore.getState().records.find(({ trigger }) => trigger.test);
    if (!record) throw new Error("The rehearsal did not raise its test alert.");

    const testPosts = () => post.mock.calls.filter(([, options]) =>
      JSON.parse(String(options?.body)).assetTag === TEST_ASSET_ID);
    expect(testPosts()).toHaveLength(1);
    expect(testPosts()[0][0]).toBe("/api/escalation/slack");
    expect(JSON.parse(String(testPosts()[0][1]?.body))).toEqual({
      assetTag: TEST_ASSET_ID,
      assetName: record.trigger.assetName,
      lossUsd: record.trigger.loss,
      risk: record.trigger.score,
      action: record.action,
      test: true,
    });
    expect(useSlackStatuses.getState()[record.id]).toBe("not set");

    useEscalationStore.getState().update(record.id, { ringing: { at: Date.now(), channel: "desktop" } });
    stopSlack();
    monitorSlackAlerts()();
    expect(testPosts()).toHaveLength(1);
  } finally {
    stopEscalations();
    stopSlack();
    clearTestAlert();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
