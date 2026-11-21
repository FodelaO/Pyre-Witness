/** Streams a capture through device identification, placement analysis and inspection. */
import { analyzeRequestSchema } from "@/pipeline/server/requests";
import { runAnalyze } from "@/pipeline/server/run";
import { streamPipeline } from "@/pipeline/server/sse";

export const runtime = "nodejs";

export function POST(request: Request): Response {
  return streamPipeline(request, analyzeRequestSchema, (body, emit, signal) =>
    runAnalyze(body, emit, signal, { completeBeforeBriefing: true }));
}
