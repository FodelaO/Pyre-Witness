/** Opens a same-origin event stream and a compact command channel for either browser. */
import { DESK_KEY, PHONE_KEY, RECONNECT_MS } from "./wire.mjs";

/** @typedef {{ code: string, role: "desktop" | "phone", key: string }} CallConnection */

/** @param {number} bytes */
export function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** @param {CallConnection} connection */
function headers(connection) {
  return { [connection.role === "desktop" ? DESK_KEY : PHONE_KEY]: connection.key };
}

/** @param {CallConnection} connection @param {import("./protocol").CallCommand} command @param {AbortSignal} [signal] */
async function postCommand(connection, command, signal) {
  const response = await fetch(`/api/escalation/${connection.code}`, {
    method: "POST",
    headers: { ...headers(connection), "Content-Type": "application/json" },
    body: JSON.stringify(command),
    keepalive: !signal,
    signal,
  });
  if (!response.ok) throw new Error(response.status === 404 ? "The phone link expired." : "Could not update the call.");
  return response;
}

/** @param {CallConnection} connection @param {import("./protocol").CallCommand} command */
export async function callCommand(connection, command) {
  await postCommand(connection, command);
}

/** @param {CallConnection} connection @param {string} id @param {number} version @returns {Promise<import("./protocol").DialTarget>} */
export async function fetchDialTarget(connection, id, version) {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 5000);
  try {
    const response = await postCommand(connection, { type: "dial-target", id, version }, abort.signal);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {CallConnection} connection
 * @param {(frame: import("./protocol").PairingSnapshot) => void} onFrame
 * @param {(message: string, terminal?: boolean) => void} onError
 * @param {number} [retryMs]
 */
export function listenToCall(connection, onFrame, onError, retryMs = RECONNECT_MS) {
  const abort = new AbortController();
  let retry;

  async function connect() {
    try {
      const response = await fetch(`/api/escalation/${connection.code}`, {
        headers: headers(connection), cache: "no-store", signal: abort.signal,
      });
      if (response.status === 404 || response.status === 403) {
        if (!abort.signal.aborted) onError("Link expired or paired elsewhere. Open a fresh QR.", true);
        return;
      }
      if (!response.ok || !response.body) throw new Error("Call stream unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      try {
        while (!abort.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const frames = buffered.split("\n\n");
          buffered = frames.pop() ?? "";
          for (const frame of frames) {
            if (frame.startsWith("data: ")) onFrame(JSON.parse(frame.slice(6)));
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
      if (abort.signal.aborted) return;
    }
    if (abort.signal.aborted) return;
    onError("Call link interrupted. Reconnecting…");
    retry = setTimeout(() => void connect(), retryMs);
  }

  void connect();
  return () => { abort.abort(); clearTimeout(retry); };
}
