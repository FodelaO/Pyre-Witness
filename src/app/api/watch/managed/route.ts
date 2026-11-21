/** Starts the hosted watch comparison and streams through artifact validation. */
import { runManagedWatch } from "@/watch/runManaged";
import { streamWatch } from "@/watch/sse";
import { sharedRateLimit } from "@/app/api/health/rateLimit";
import { admitWatch } from "../guard";

export const runtime = "nodejs";
export const maxDuration = 210;

// Each run starts a hosted sandbox for up to three minutes: the most expensive call in the app.
const runs = sharedRateLimit("watch-managed", 3, 10 * 60_000);

export function POST(request: Request): Promise<Response> {
  return admitWatch(request, runs, "The managed watch", (admitted) => streamWatch(admitted, runManagedWatch));
}
