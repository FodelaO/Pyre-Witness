/** Checks that a watch run starts only for the app's origin and inside its budget. */
import { describe, expect, it, vi } from "vitest";
import { createRateLimit } from "@/app/api/health/rateLimit";
import { admitWatch } from "./guard";

const request = (headers: Record<string, string> = {}) => new Request("http://localhost:4119/api/watch/managed", {
  method: "POST", headers: { host: "localhost:4119", origin: "http://localhost:4119", ...headers }, body: "{}",
});
const started = () => vi.fn(async () => new Response("data: {}\n\n", { headers: { "Content-Type": "text/event-stream" } }));

describe("watch admission", () => {
  it("starts runs up to the budget, then answers 429 without starting another", async () => {
    const limit = createRateLimit(2, 60_000, () => 0);
    const start = started();
    expect((await admitWatch(request(), limit, "The managed watch", start)).status).toBe(200);
    expect((await admitWatch(request(), limit, "The managed watch", start)).status).toBe(200);
    const refused = await admitWatch(request(), limit, "The managed watch", start);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBe("60");
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("does not start or count a request from another site", async () => {
    const limit = createRateLimit(1, 60_000, () => 0);
    const start = started();
    expect((await admitWatch(request({ origin: "https://evil.example" }), limit, "Threat watch", start)).status).toBe(403);
    expect(start).not.toHaveBeenCalled();
    expect(limit.blocked()).toBe(0);
  });

  it("gives the slot back when the snapshot is rejected before a run starts", async () => {
    const limit = createRateLimit(1, 60_000, () => 0);
    const invalid = vi.fn(async () => Response.json({ error: "Send a valid simulated twin snapshot." }, { status: 400 }));
    expect((await admitWatch(request(), limit, "Threat watch", invalid)).status).toBe(400);
    expect((await admitWatch(request(), limit, "Threat watch", started())).status).toBe(200);
  });
});
