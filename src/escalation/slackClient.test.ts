/** Verifies the real rehearsal trigger uses the Slack client once per raised alert. */
import { expect, it, vi } from "vitest";
import { monitorEscalations } from "./monitor";
import { ESCALATION_DEBOUNCE_MS } from "./policy";
import { monitorSlackAlerts, useSlackStatuses } from "./slackClient";
import { useEscalationStore } from "./store";
import { clearTestAlert, runTestAlert } from "./testScenario";

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
    const record = useEscalationStore.getState().records.find(({ trigger, level }) => trigger.test && level === 2);
    if (!record) throw new Error("The rehearsal did not raise its test alert.");

    const testPosts = () => post.mock.calls.filter(([, options]) =>
      JSON.parse(String(options?.body)).assetTag === "HMI-F3");
    expect(testPosts()).toHaveLength(1);
    expect(post.mock.calls.filter(([, options]) => JSON.parse(String(options?.body)).test)).toHaveLength(1);
    expect(testPosts()[0][0]).toBe("/api/escalation/slack");
    expect(JSON.parse(String(testPosts()[0][1]?.body))).toEqual({
      assetTag: "HMI-F3",
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
