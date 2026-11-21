/** Bounds each probe and sanitizes provider details before they leave the server. */
import { providerDiagnostic } from "@/gemini/transport";
import type { HealthResult, HealthService } from "./services";

export type Probe = (signal: AbortSignal) => Promise<string>;

export function healthErrorDetail(error: unknown): string {
  const { status, code, message } = providerDiagnostic(error);
  return [status === undefined ? undefined : `HTTP ${status}`, code, message]
    .filter(Boolean).join(" · ")
    .replace(/\bauth_tokens(?:\/|%2f)[\w.%+~=/:-]+/gi, "[redacted token]")
    .replace(/\b(access_token|upload_id|key)=([^\s&#"']+)/gi, "$1=[redacted]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .slice(0, 420);
}

export async function runCheck(service: HealthService, probe: Probe, timeoutMs = 8_000): Promise<HealthResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = new Error(`Timed out after ${timeoutMs / 1_000} s.`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(timeout);
      reject(timeout);
    }, timeoutMs);
  });
  let ok = false;
  let detail: string;
  try {
    detail = await Promise.race([probe(controller.signal), deadline]);
    ok = true;
  } catch (error) {
    detail = healthErrorDetail(controller.signal.aborted ? timeout : error);
  } finally {
    clearTimeout(timer);
  }
  return { ...service, ok, detail, latencyMs: Math.round(performance.now() - start), checkedAt: new Date().toISOString() };
}
