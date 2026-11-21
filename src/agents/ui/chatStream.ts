/** Reads agent chat events from the POST response as complete SSE frames arrive. */
import { CREW_ORDER, type CrewId } from "@/crew/types";

export type ChatAddress = { mode: "direct"; to: CrewId } | { mode: "group" | "chief" };
export type ChatParty = "user" | "group" | CrewId;
export type ChatHistoryItem = { from: Exclude<ChatParty, "group">; to: ChatParty; text: string };
export type ChatMessage = ChatHistoryItem & {
  type: "message";
  id: string;
  kind: "reply" | "delegation" | "handoff" | "summary";
  engine: string;
  latencyMs: number;
};
export type ChatEvent = ChatMessage | { type: "typing"; agent: CrewId }
  | { type: "error"; agent?: CrewId; message: string } | { type: "done" };

export function isCrewId(value: unknown): value is CrewId {
  return CREW_ORDER.some((id) => id === value);
}

function eventFromFrame(frame: string): ChatEvent | undefined {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, "")).join("\n");
  if (!data) return;
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(data);
    if (!event || typeof event !== "object") return;
  } catch {
    return;
  }
  if (event.type === "done") return { type: "done" };
  if (event.type === "typing" && isCrewId(event.agent)) return { type: "typing", agent: event.agent };
  if (event.type === "error" && typeof event.message === "string") {
    return { type: "error", message: event.message, agent: isCrewId(event.agent) ? event.agent : undefined };
  }
  if (event.type !== "message" || typeof event.id !== "string" || typeof event.text !== "string"
    || typeof event.engine !== "string" || typeof event.latencyMs !== "number"
    || (event.from !== "user" && !isCrewId(event.from))
    || (event.to !== "user" && event.to !== "group" && !isCrewId(event.to))
    || (event.kind !== "reply" && event.kind !== "delegation" && event.kind !== "handoff" && event.kind !== "summary")) return;
  return {
    type: "message", id: event.id, from: event.from, to: event.to, kind: event.kind,
    text: event.text, engine: event.engine, latencyMs: event.latencyMs,
  };
}

export async function readChatEvents(stream: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      const frames = (pending + decoder.decode(value, { stream: !done })).split(/\r?\n\r?\n/);
      pending = done ? "" : frames.pop() ?? "";
      for (const frame of frames) {
        const event = eventFromFrame(frame);
        if (!event) continue;
        onEvent(event);
        if (event.type === "done") return;
      }
      if (done) throw new Error("Agent stream closed before completion");
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function postAgentChat(address: ChatAddress, message: string, history: ChatHistoryItem[], context: unknown,
  onEvent: (event: ChatEvent) => void) {
  const response = await fetch("/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ ...address, message, history, context }),
    // The server ends a turn within about 35 s; a stalled connection must not leave the composer locked.
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok || !response.body || !response.headers.get("Content-Type")?.startsWith("text/event-stream")) {
    throw new Error("Agent chat is unavailable");
  }
  await readChatEvents(response.body, onEvent);
}
