/** Starts the hosted watch comparison and streams through artifact validation. */
import { runManagedWatch } from "@/watch/runManaged";
import { streamWatch } from "@/watch/sse";

export const runtime = "nodejs";
export const maxDuration = 210;

export function POST(request: Request): Promise<Response> {
  return streamWatch(request, runManagedWatch);
}
