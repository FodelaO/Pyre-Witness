/** Covers complete and interrupted responses with events split across network chunks. */
import { describe, expect, it } from "vitest";
import { readChatEvents, type ChatEvent } from "./chatStream";

const frame = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;

function body(contents: string) {
  const bytes = new TextEncoder().encode(contents);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < bytes.length; index += 7) {
        controller.enqueue(bytes.slice(index, index + 7));
      }
      controller.close();
    },
  });
}

describe("agent chat event reader", () => {
  it("keeps valid events and their parties in wire order across chunk boundaries", async () => {
    const events: ChatEvent[] = [];
    const typing = { type: "typing", agent: "chief" };
    const request = { type: "message", id: "1", from: "chief", to: "inspector", kind: "delegation",
      text: "@inspector: Check placement\nRevisión", engine: "gemini-4-neon", latencyMs: 96 };
    const check = { type: "message", id: "2", from: "inspector", to: "chief", kind: "reply",
      text: "Check complete", engine: "rules engine", latencyMs: 1 };
    const error = { type: "error", agent: "scout", message: "Timed out" };
    const done = { type: "done" };
    const stream = body([typing, request, { ...request, from: "unknown" }, error, check, done].map(frame).join(""));
    await readChatEvents(stream, (event) => events.push(event));
    expect(events).toEqual([typing, request, error, check, done]);
  });

  it("rejects an interrupted turn after reporting the events that arrived", async () => {
    const events: ChatEvent[] = [];
    const typing = { type: "typing", agent: "architect" };
    await expect(readChatEvents(body(frame(typing)), (event) => events.push(event))).rejects.toThrow("before completion");
    expect(events).toEqual([typing]);
  });
});
