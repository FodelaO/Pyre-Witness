/** Registers a paired call and streams its state to both browser roles. */
import { BodyError, readBoundedJson } from "@/app/api/health/boundedJson";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { CLIENT_KEY, commandSchema, DESK_KEY, PAIR_CODE, PHONE_KEY, RECONNECT_MS } from "@/escalation/protocol";
import { authorize, readDialTarget, receive, register, subscribe } from "@/escalation/relay";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };
const noStore = { "Cache-Control": "no-store" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: noStore });

function credentials(request: Request, code: string) {
  const desk = request.headers.get(DESK_KEY);
  const phone = request.headers.get(PHONE_KEY);
  const key = desk ?? phone;
  return PAIR_CODE.test(code) && key && CLIENT_KEY.test(key) && !(desk && phone)
    ? { role: desk ? "desktop" as const : "phone" as const, key }
    : null;
}

export async function POST(request: Request, { params }: Context) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const { code } = await params;
  const client = credentials(request, code);
  if (!client) return error("Open the paired link.", 403);
  let body: unknown;
  try { body = await readBoundedJson(request, 6_144); }
  catch (failure) { return error("Invalid call message.", failure instanceof BodyError ? failure.status : 400); }
  const command = commandSchema.safeParse(body);
  if (!command.success) return error("Invalid call message.", 400);
  if (command.data.type === "pair") {
    const session = client.role === "desktop" && register(code, client.key);
    return session ? new Response(null, { status: 204, headers: noStore }) : error("Could not open this pairing.", 409);
  }
  const session = authorize(code, client.role, client.key);
  if (!session) return error("This call link expired or is paired to another browser.", 404);
  if (command.data.type === "dial-target") {
    const target = readDialTarget(session, client.role, command.data.id, command.data.version);
    return target ? Response.json(target, { headers: noStore }) : error("The call destination is unavailable.", 404);
  }
  return receive(session, client.role, command.data)
    ? new Response(null, { status: 204, headers: noStore })
    : error("This call changed. Check its latest status.", 409);
}

export async function GET(request: Request, { params }: Context) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const { code } = await params;
  const client = credentials(request, code);
  if (!client) return error("Open the paired link.", 403);
  const session = authorize(code, client.role, client.key, true);
  if (!session) return error("This call link expired or is paired to another browser.", 404);

  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let detach = () => {};
      const keepAlive = setInterval(() => {
        if (Date.now() >= session.expiresAt || (controller.desiredSize ?? 0) <= 0) close();
        else controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, RECONNECT_MS);
      keepAlive.unref?.();

      function close() {
        if (closed) return;
        dispose();
        controller.close();
      }

      dispose = () => {
        closed = true;
        clearInterval(keepAlive);
        request.signal.removeEventListener("abort", close);
        detach();
      };
      if (request.signal.aborted) {
        close();
        return;
      }
      request.signal.addEventListener("abort", close, { once: true });
      detach = subscribe(session, {
        role: client.role,
        close,
        send(frame) {
          if (closed) return;
          if ((controller.desiredSize ?? 0) <= 0) { close(); return; }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        },
      });
      if (closed) detach();
    },
    cancel() { dispose(); },
  }, { highWaterMark: 8 });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
