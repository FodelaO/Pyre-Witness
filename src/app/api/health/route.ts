/** Serves the cached health snapshot and accepts explicit refreshes. */
import { after } from "next/server";
import { getHealth, needsRefresh, refreshHealth } from "@/health/runner";
import type { HealthSnapshot } from "@/health/services";
import { crossOriginRejection } from "./originGuard";
import { sharedRateLimit, tooManyRequests } from "./rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

function json(snapshot: HealthSnapshot) {
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  const snapshot = getHealth();
  if (needsRefresh()) {
    after(async () => {
      if (needsRefresh()) await refreshHealth();
    });
  }
  return json(snapshot);
}

// Coalesce in-flight calls. The runner also enforces a 60 s start gap across all callers.
const refreshes = sharedRateLimit("health-refresh", 1, 15_000);

export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  if (!getHealth().refreshing) {
    const wait = refreshes.take();
    if (wait) return tooManyRequests(wait, "The service check");
  }
  return json(await refreshHealth(new URL(request.url).searchParams.get("all") === "1"));
}
