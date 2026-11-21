/** Runs the shared threat-watch pipeline against a posted twin snapshot. */
import { runWatch } from "@/watch/run";
import { streamWatch } from "@/watch/sse";

export const runtime = "nodejs";

export function POST(request: Request): Promise<Response> {
  return streamWatch(request, runWatch);
}
