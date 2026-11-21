/** Exercises the Slack route without making any network requests. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/escalation/slack/route";

const webhook = "https://hooks.slack.com/services/test/webhook";
const alert = {
  assetTag: "TEST-901",
  assetName: "Test gateway",
  lossUsd: 290_000,
  risk: 82.4,
  action: "Remove the test gateway from the twin",
  test: true,
};

function request(body = alert) {
  return new Request("http://localhost:4119/api/escalation/slack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const post = vi.fn<typeof fetch>();

beforeEach(() => {
  post.mockReset().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", post);
  vi.stubEnv("SLACK_WEBHOOK_URL", webhook);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Slack escalation route", () => {
  it("posts a labelled test alert with the asset, estimate, risk, and action", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    expect(post).toHaveBeenCalledExactlyOnceWith(webhook, expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: expect.any(AbortSignal),
    }));
    const heading = "🔴 Pyre Witness alert";
    const details = "TEST SCENARIO · Simulated plant\nTEST-901 · Test gateway\n$290k est. loss / event · Risk 82.4/100\nRecommended action: Remove the test gateway from the twin";
    expect(JSON.parse(String(post.mock.calls[0][1]?.body))).toEqual({
      text: `${heading}\n${details}`,
      mrkdwn: false,
      blocks: [
        { type: "header", text: { type: "plain_text", text: heading } },
        { type: "section", text: { type: "plain_text", text: details } },
      ],
    });
  });

  it("returns a missing-configuration receipt without posting", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", undefined);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: false, reason: "not-configured" });
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects an invalid score without posting", async () => {
    const response = await POST(request({ ...alert, risk: 101 }));
    expect(response.status).toBe(400);
    expect(post).not.toHaveBeenCalled();
  });

  it("returns a generic failure when the webhook request throws", async () => {
    post.mockRejectedValue(new Error(webhook));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ sent: false, reason: "failed" });
  });
});
