/** Opens the documented constrained Live WebSocket with only an ephemeral token. */
import type { LiveSendClientContentParameters, LiveSendRealtimeInputParameters, LiveSendToolResponseParameters, LiveServerMessage } from "@google/genai";
import { MODEL_IDS } from "@/gemini/models";
import { readVoiceError } from "./briefings";

type ClientMessage =
  | { setup: { model: string } }
  | { clientContent: LiveSendClientContentParameters }
  | { realtimeInput: LiveSendRealtimeInputParameters }
  | { toolResponse: LiveSendToolResponseParameters };

export interface ChiefLink {
  send(message: ClientMessage): void;
  close(): void;
}

export async function openChiefLink(signal: AbortSignal, message: (event: LiveServerMessage) => void,
  disconnected: (reason: string) => void): Promise<ChiefLink> {
  const response = await fetch("/api/voice/session", { method: "POST", signal });
  if (!response.ok) throw new Error(await readVoiceError(response, "A Chief session could not be started."));
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("token" in body)
    || typeof body.token !== "string" || !body.token.startsWith("auth_tokens/")) {
    throw new Error("The Chief session token was invalid.");
  }
  signal.throwIfAborted();
  const url = new URL("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained");
  url.searchParams.set("access_token", body.token);
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";

  return new Promise<ChiefLink>((resolve, reject) => {
    let ready = false;
    let disposed = false;
    const timeout = window.setTimeout(() => finish("Gemini Live setup timed out. Hold to try again."), 8_000);

    function finish(reason?: string) {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      if (socket.readyState < WebSocket.CLOSING) socket.close();
      if (!ready) reject(new Error(reason ?? "Chief session closed."));
      else if (reason) disconnected(reason);
    }

    const abort = () => finish();
    const link: ChiefLink = {
      close: abort,
      send(payload) {
        if (socket.readyState !== WebSocket.OPEN) throw new Error("Chief session disconnected. Hold to reconnect.");
        if (socket.bufferedAmount > 2 * 1024 * 1024) throw new Error("Chief audio connection fell behind. Hold to try again.");
        socket.send(JSON.stringify(payload));
      },
    };
    signal.addEventListener("abort", abort, { once: true });
    socket.onopen = () => {
      try { link.send({ setup: { model: `models/${MODEL_IDS.live}` } }); }
      catch { finish("Gemini Live could not start. Hold to try again."); }
    };
    socket.onmessage = ({ data }: MessageEvent<string | ArrayBuffer>) => {
      try {
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        const event: LiveServerMessage = JSON.parse(text);
        if (ready) message(event);
        else if (event.setupComplete) {
          ready = true;
          window.clearTimeout(timeout);
          resolve(link);
        }
      } catch {
        finish("Gemini Live returned an invalid message. Hold to reconnect.");
      }
    };
    socket.onerror = () => finish("Gemini Live could not connect. Hold to try again.");
    socket.onclose = () => finish("Chief session ended. Hold to reconnect.");
  });
}
