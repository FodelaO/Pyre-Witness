/** Checks the sliding window, the wait it reports, refunds and the 429 response shape. */
import { describe, expect, it } from "vitest";
import { createRateLimit, sharedRateLimit, tooManyRequests } from "./rateLimit";

describe("per-process rate limit", () => {
  it("admits up to the maximum, then reports the wait until the oldest use leaves the window", () => {
    let now = 1_000_000;
    const limit = createRateLimit(2, 60_000, () => now);
    expect(limit.take()).toBe(0);
    now += 10_000;
    expect(limit.take()).toBe(0);
    expect(limit.take()).toBe(50);
    expect(limit.blocked()).toBe(50);
    now += 49_999;
    expect(limit.take()).toBe(1);
    now += 1;
    expect(limit.take()).toBe(0);
    expect(limit.take()).toBe(10);
  });

  it("does not record a rejected request, so a blocked caller cannot extend its own lockout", () => {
    let now = 0;
    const limit = createRateLimit(1, 1_000, () => now);
    expect(limit.take()).toBe(0);
    for (let attempt = 0; attempt < 50; attempt += 1) expect(limit.take()).toBe(1);
    now = 1_000;
    expect(limit.take()).toBe(0);
  });

  it("checks without recording and returns a refunded slot", () => {
    const limit = createRateLimit(1, 1_000, () => 0);
    expect(limit.blocked()).toBe(0);
    expect(limit.blocked()).toBe(0);
    expect(limit.take()).toBe(0);
    expect(limit.blocked()).toBe(1);
    limit.refund();
    expect(limit.take()).toBe(0);
  });

  it("shares one budget per name across callers in the process", () => {
    const name = `test-${Math.random()}`;
    expect(sharedRateLimit(name, 1, 60_000).take()).toBe(0);
    expect(sharedRateLimit(name, 1, 60_000).take()).toBeGreaterThan(0);
    expect(sharedRateLimit(`${name}-other`, 1, 60_000).take()).toBe(0);
  });

  it("answers 429 with Retry-After and a readable message", async () => {
    const response = tooManyRequests(42, "Fit image generation");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Fit image generation is rate limited on this server. Try again in 42 s." });
  });
});
