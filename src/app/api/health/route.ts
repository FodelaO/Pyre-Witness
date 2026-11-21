/** Serves the cached health snapshot and accepts explicit refreshes. */
import { after } from "next/server";
import { getHealth, needsRefresh, refreshHealth } from "@/health/runner";
import type { HealthSnapshot } from "@/health/services";

export const runtime = "nodejs";
export const maxDuration = 40;

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

export async function POST(request: Request) {
  return json(await refreshHealth(new URL(request.url).searchParams.get("all") === "1"));
}
