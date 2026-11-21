/** Accepts one bounded chat turn and streams its attributed crew messages. */
import { agentChatRequestSchema, MAX_CHAT_BODY_BYTES, type AgentChatRequest } from "@/agents/server/requests";
import { runAgentTurn, type AgentChatEvent } from "@/agents/server/turn";
import { BodyError, readBoundedJson } from "@/app/api/health/boundedJson";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { sharedRateLimit, tooManyRequests } from "@/app/api/health/rateLimit";

export const runtime = "nodejs";
const limit = sharedRateLimit("agents-chat", 30, 5 * 60_000);
const encoder = new TextEncoder();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function streamTurn(request: Request, body: AgentChatRequest): Response {
  const disconnect = new AbortController();
  const signal = AbortSignal.any([request.signal, disconnect.signal]);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: AgentChatEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      void runAgentTurn(body, emit, signal).catch(() => {
        emit({ type: "error", message: "The chat turn could not finish." });
      }).finally(() => {
        emit({ type: "done" });
        if (!disconnect.signal.aborted) controller.close();
      });
    },
    cancel() { disconnect.abort(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}

export async function POST(request: Request): Promise<Response> {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const blocked = limit.blocked();
  if (blocked) return tooManyRequests(blocked, "Agent chat");

  let raw: unknown;
  try { raw = await readBoundedJson(request, MAX_CHAT_BODY_BYTES); }
  catch (error) {
    if (error instanceof BodyError) return jsonError(error.message, error.status);
    return jsonError("The chat request could not be read.", 400);
  }
  const body = agentChatRequestSchema.safeParse(raw);
  if (!body.success) {
    const issue = body.error.issues[0];
    const field = issue.path.join(".") || "body";
    return jsonError(issue.code === "custom" ? issue.message : `Invalid chat request at ${field}.`, 400);
  }

  const wait = limit.take();
  return wait ? tooManyRequests(wait, "Agent chat") : streamTurn(request, body.data);
}
