/** Validates an escalation and posts a short Slack message through the server webhook. */
import { z } from "zod";
import { BodyError, readBoundedJson } from "@/app/api/health/boundedJson";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { formatUsd } from "@/econ/format";

const alertRequest = z.strictObject({
  assetTag: z.string().trim().min(1).max(100),
  assetName: z.string().trim().min(1).max(300),
  lossUsd: z.number().nonnegative().nullable(),
  risk: z.number().min(0).max(100),
  action: z.string().trim().min(1).max(500),
  test: z.boolean(),
});

export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) return Response.json({ sent: false, reason: "not-configured" });

  let body: unknown;
  try {
    body = await readBoundedJson(request, 8_192);
  } catch (error) {
    return Response.json({ sent: false, reason: "invalid-request" }, {
      status: error instanceof BodyError ? error.status : 400,
    });
  }
  const parsed = alertRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ sent: false, reason: "invalid-request" }, { status: 400 });
  }

  const { assetTag, assetName, lossUsd, risk, action, test } = parsed.data;
  const heading = `${risk >= 80 ? "🔴" : "🟠"} Pyre Witness alert`;
  const loss = lossUsd === null ? "Per-event loss estimate unavailable" : `${formatUsd(lossUsd)} est. loss / event`;
  const details = [
    test ? "TEST SCENARIO · Simulated plant" : "Simulated plant",
    `${assetTag} · ${assetName}`,
    `${loss} · Risk ${Number(risk.toFixed(1))}/100`,
    `Recommended action: ${action}`,
  ].join("\n");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${heading}\n${details}`,
        mrkdwn: false,
        blocks: [
          { type: "header", text: { type: "plain_text", text: heading } },
          { type: "section", text: { type: "plain_text", text: details } },
        ],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) return Response.json({ sent: true });
  } catch {
    // Fetch errors may contain the webhook URL. Keep provider details server-private.
  }
  return Response.json({ sent: false, reason: "failed" }, { status: 502 });
}
