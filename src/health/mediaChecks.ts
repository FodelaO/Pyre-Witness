/** Probes the constrained Live handshake and the Files upload/delete lifecycle. */
import { randomBytes } from "node:crypto";
import type { LiveServerMessage } from "@google/genai";
import { chiefSetup } from "@/app/api/voice/session/setup";
import { MODEL_IDS } from "@/gemini/models";
import { HEALTH_PROBE_TIMEOUT_MS } from "./services";

const GOOGLE = "https://generativelanguage.googleapis.com";
const LIVE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

function auth() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is missing on the server.");
  return { "x-goog-api-key": key };
}

async function googleRequest(url: string | URL, init: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, cache: "no-store", redirect: "error" });
  if (response.ok) return response;
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  throw Object.assign(new Error(body?.error?.message || response.statusText || "Google rejected the request."), { status: response.status });
}

function liveHandshake(token: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const url = new URL(LIVE);
  url.searchParams.set("access_token", token);
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";

    function finish(error?: Error) {
      signal.removeEventListener("abort", aborted);
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      if (socket.readyState < WebSocket.CLOSING) socket.close(1000);
      if (error) reject(error);
      else resolve();
    }

    const aborted = () => finish(signal.reason);
    signal.addEventListener("abort", aborted, { once: true });
    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ setup: { model: `models/${MODEL_IDS.live}` } }));
      } catch {
        finish(new Error("Gemini Live could not send its setup message."));
      }
    };
    socket.onmessage = ({ data }: MessageEvent<string | ArrayBuffer>) => {
      try {
        const message = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data)) as LiveServerMessage;
        if (message.setupComplete) finish();
      } catch {
        finish(new Error("Gemini Live returned invalid setup data."));
      }
    };
    socket.onerror = (event) => finish(new Error("message" in event && typeof event.message === "string"
      ? event.message : "Gemini Live WebSocket connection failed."));
    socket.onclose = ({ code, reason }) => finish(new Error(`Gemini Live closed (${code})${reason ? ` · ${reason}` : ""}.`));
  });
}

export async function checkLive(signal: AbortSignal): Promise<string> {
  const now = Date.now();
  const response = await googleRequest(`${GOOGLE}/v1beta/auth_tokens`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 2 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      bidiGenerateContentSetup: chiefSetup,
    }),
    signal,
  });
  const { name } = await response.json() as { name?: string };
  if (typeof name !== "string" || !name.startsWith("auth_tokens/")) throw new Error("Gemini did not issue a Live token.");
  await liveHandshake(name, signal);
  return "One-use token minted and Live setup acknowledged.";
}

export async function checkFiles(signal: AbortSignal): Promise<string> {
  const headers = auth();
  const name = `files/pw-health-${randomBytes(10).toString("hex")}`;
  const type = "text/plain";
  const file = new File(["Pyre Witness health check.\n"], "probe.txt", { type });
  // Reserve time in the overall deadline to delete even after a lost finalize response.
  const uploadSignal = AbortSignal.any([signal, AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS - 2_000)]);
  const session = await googleRequest(`${GOOGLE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...headers, "Content-Type": "application/json", "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-Upload-Header-Content-Type": type,
    },
    body: JSON.stringify({ file: { name, displayName: "Pyre Witness health probe" } }),
    signal: uploadSignal,
  });
  const uploadUrl = session.headers.get("x-goog-upload-url");
  await session.body?.cancel();
  const url = uploadUrl && URL.canParse(uploadUrl) ? new URL(uploadUrl) : null;
  if (url?.origin !== GOOGLE) throw new Error("Files API did not return a valid upload session.");

  async function deleteProbe() {
    const response = await googleRequest(`${GOOGLE}/v1beta/${name}`, { headers, method: "DELETE", signal });
    await response.body?.cancel();
  }

  try {
    const response = await googleRequest(url, {
      method: "POST",
      headers: { "Content-Type": type, "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
      body: file,
      signal: uploadSignal,
    });
    const uploaded = await response.json() as { file?: { name?: string; state?: string } };
    if (uploaded.file?.name !== name || uploaded.file.state === "FAILED") throw new Error("Files API did not confirm the probe upload.");
  } catch (error) {
    await deleteProbe().catch(() => undefined);
    throw error;
  }
  await deleteProbe();
  return `Uploaded and deleted a ${file.size}-byte file.`;
}
