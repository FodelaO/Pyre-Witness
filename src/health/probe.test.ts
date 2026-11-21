/** Verifies that failed providers and stalled probes become sanitized results. */
import { expect, it, vi } from "vitest";
import { runCheck } from "./probe";
import { SERVICES } from "./services";

it("returns a failing result with the provider message and redacts credentials", async () => {
  const key = "test-provider-secret";
  vi.stubEnv("GEMINI_API_KEY", key);
  try {
    const result = await runCheck(SERVICES[0], async () => {
      throw Object.assign(new Error(`Permission denied (${key} auth_tokens/private-session)`), { status: 403 });
    });
    expect(result).toMatchObject({ id: "decisions", ok: false, detail: "HTTP 403 · Permission denied ([redacted] [redacted token])" });
    expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
  } finally {
    vi.unstubAllEnvs();
  }
});

it("returns on deadline even if the provider ignores cancellation", async () => {
  let signal: AbortSignal | undefined;
  const result = await runCheck(SERVICES[0], (abort) => {
    signal = abort;
    return new Promise(() => {});
  }, 10);
  expect(signal?.aborted).toBe(true);
  expect(result).toMatchObject({ ok: false, detail: "Timed out after 0.01 s." });
});
