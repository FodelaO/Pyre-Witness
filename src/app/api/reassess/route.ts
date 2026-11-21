/** Streams a fresh assessment of a captured asset at the engineer's current placement. */
import { reassessRequestSchema } from "@/pipeline/server/requests";
import { runReassess } from "@/pipeline/server/run";
import { streamPipeline } from "@/pipeline/server/sse";

export const runtime = "nodejs";

export function POST(request: Request): Response {
  return streamPipeline(request, reassessRequestSchema, runReassess);
}
