/** Uploads a walkthrough with the resumable Gemini Files API and polls its readiness. */
import { setTimeout as delay } from "node:timers/promises";
import { waitForRetry } from "@/gemini/transport";
import { ModelerError, type ModelMime } from "./limits";

const API = "https://generativelanguage.googleapis.com";

interface GeminiFile {
  name?: string;
  uri?: string;
  state?: "PROCESSING" | "ACTIVE" | "FAILED";
}

class FileApiError extends Error {
  constructor(readonly status: number) {
    super("The Gemini Files request failed.");
  }
}

async function call(url: string | URL, init: RequestInit, signal: AbortSignal) {
  const send = async () => {
    const response = await fetch(url, { ...init, signal, redirect: "error" });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new FileApiError(response.status);
    }
    return response;
  };
  try {
    return await send();
  } catch (error) {
    await waitForRetry(error, signal);
    return send();
  }
}

export async function uploadWalkthrough(
  file: File, mime: ModelMime, resource: string, apiKey: string, signal: AbortSignal,
): Promise<string> {
  const auth = { "x-goog-api-key": apiKey };
  const session = await call(`${API}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-Upload-Header-Content-Type": mime,
    },
    body: JSON.stringify({ file: { name: resource, displayName: "Pyre Witness walkthrough" } }),
  }, signal);
  const sessionUrl = session.headers.get("x-goog-upload-url");
  void session.body?.cancel().catch(() => {});
  const url = sessionUrl && URL.canParse(sessionUrl) ? new URL(sessionUrl) : null;
  if (url?.origin !== API) throw new ModelerError("Gemini did not return a valid video upload session.");
  const uploaded = await call(url, {
    method: "POST",
    headers: { "Content-Type": mime, "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: file,
  }, signal);
  let { file: stored } = await uploaded.json() as { file?: GeminiFile };
  while (stored?.state === "PROCESSING") {
    await delay(600, undefined, { signal });
    const status = await call(`${API}/v1beta/${resource}`, { headers: auth }, signal);
    stored = await status.json() as GeminiFile;
  }
  if (!stored?.uri || (stored.state && stored.state !== "ACTIVE")) {
    throw new ModelerError("Gemini could not process this walkthrough. Re-export the clip and try again.");
  }
  return stored.uri;
}

export async function deleteWalkthrough(resource: string, apiKey: string) {
  // Cleanup gets a short independent deadline even when the browser disconnects.
  try {
    const result = await call(`${API}/v1beta/${resource}`, {
      method: "DELETE", headers: { "x-goog-api-key": apiKey },
    }, AbortSignal.timeout(4_000));
    void result.body?.cancel().catch(() => {});
  } catch (error) {
    if (!(error instanceof FileApiError) || error.status !== 404) {
      console.warn("[modeler] Video cleanup could not finish before Files API expiry.");
    }
  }
}
