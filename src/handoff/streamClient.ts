/** Consume the desktop photo stream with the receiver key in a request header. */
import { HANDOFF_KEY_HEADER, type HandoffFrame } from "./types";

export interface HandoffCredentials {
  code: string;
  key: string;
}

export class HandoffConnectionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function readHandoffStream(
  { code, key }: HandoffCredentials,
  signal: AbortSignal,
  onFrame: (frame: HandoffFrame) => boolean,
) {
  const response = await fetch(`/api/handoff/${code}/stream`, {
    signal,
    headers: { Accept: "text/event-stream", [HANDOFF_KEY_HEADER]: key },
    cache: "no-store",
  });
  if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith("text/event-stream")) {
    const message = response.status === 503 ? "Phone pairing is busy. Try again shortly." : "Could not open phone pairing.";
    throw new HandoffConnectionError(message, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      pending += decoder.decode(value, { stream: true });
      let boundary = pending.indexOf("\n\n");
      while (boundary !== -1) {
        const line = pending.slice(0, boundary);
        pending = pending.slice(boundary + 2);
        if (line.startsWith("data: ") && !onFrame(JSON.parse(line.slice(6)) as HandoffFrame)) return;
        boundary = pending.indexOf("\n\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
