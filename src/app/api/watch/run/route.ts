/** Runs the shared threat-watch pipeline against a posted twin snapshot. */
import { runWatch } from "@/watch/run";
import { streamWatch } from "@/watch/sse";
import { sharedRateLimit } from "@/app/api/health/rateLimit";
import { admitWatch } from "../guard";

export const runtime = "nodejs";
export const maxDuration = 120;

// A run is one Decisions batch set plus one Neon reassessment. Feeds are cached for 30 minutes.
const runs = sharedRateLimit("watch-run", 10, 10 * 60_000);

export function POST(request: Request): Promise<Response> {
  return admitWatch(request, runs, "Threat watch", (admitted) => streamWatch(admitted, runWatch));
}
