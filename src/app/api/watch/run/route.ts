/** Runs the shared threat-watch pipeline against a posted twin snapshot. */
import { runWatch } from "@/watch/run";
import { createWatchRunHandler, type WatchRunCache } from "@/watch/runAdmission";
import { sharedRateLimit } from "@/app/api/health/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

// Only a fresh Decisions and Neon review spends a slot.
const runs = sharedRateLimit("watch-run", 10, 10 * 60_000);
const server = globalThis as typeof globalThis & { pyreWatchRunCache?: WatchRunCache };
const cache = (server.pyreWatchRunCache ??= { reports: new Map(), pending: new Map() });
const post = createWatchRunHandler(runs, runWatch, cache);

export function POST(request: Request): Promise<Response> {
  return post(request);
}
