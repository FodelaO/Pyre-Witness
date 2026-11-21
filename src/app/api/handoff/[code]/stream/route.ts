/** Stream paired photos to the desktop, with replay after a reconnect. */
import { handoffStore } from "@/handoff/store";
import { HANDOFF_KEY_HEADER, isHandoffCode, type HandoffFrame } from "@/handoff/types";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const key = request.headers.get(HANDOFF_KEY_HEADER);
  if (!isHandoffCode(code) || !key || !/^[a-f0-9]{32}$/.test(key)) {
    return new Response("Open phone capture on the desktop.", { status: 403 });
  }

  const session = handoffStore.register(code, key);
  if (session.status === "conflict") return new Response("Get a new QR code.", { status: 409 });
  if (session.status === "full") return new Response("Phone pairing is busy. Try again shortly.", { status: 503 });

  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe = () => {};
      const heartbeat = setInterval(() => {
        if (!closed && (controller.desiredSize ?? 0) > 0) controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15_000);
      heartbeat.unref?.();

      function close() {
        if (closed) return;
        dispose();
        controller.close();
      }

      function send(frame: HandoffFrame) {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }

      dispose = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
      };
      if (request.signal.aborted) {
        close();
        return;
      }
      request.signal.addEventListener("abort", close, { once: true });
      send({ type: "ready", expiresAt: session.expiresAt });
      unsubscribe = session.subscribe({
        send: (packet) => {
          if ((controller.desiredSize ?? 0) > 0) send({ type: "photos", packet });
          else close();
        },
        close: (reason) => {
          send({ type: reason });
          close();
        },
      });
      if (closed) unsubscribe();
    },
    cancel: () => dispose(),
  }, { highWaterMark: 2 });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
