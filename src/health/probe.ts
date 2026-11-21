/** Bounds each probe and sanitizes provider details before they leave the server. */
import { providerDiagnostic } from "@/gemini/transport";
import { HEALTH_PROBE_TIMEOUT_MS, type HealthResult, type HealthService } from "./services";

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

export function classifyProbeFailure(error: unknown): NonNullable<HealthResult["failure"]> {
  const { status, name, code } = providerDiagnostic(error);
  if (status !== undefined && status >= 400 && status < 600) return "http";
  if (/TimeoutError$/i.test(name) || /(?:ETIMEDOUT|_TIMEOUT)$/.test(code ?? "")) return "timeout";
  if (/(Abort|Aborted|Cancellation)Error$/i.test(name) || code === "ABORT_ERR") return "aborted";
  return "other";
}

export async function runCheck(service: HealthService, probe: Probe, timeoutMs = HEALTH_PROBE_TIMEOUT_MS): Promise<HealthResult> {
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
  let failure: HealthResult["failure"];
  let detail: string;
  try {
    detail = await Promise.race([probe(controller.signal), deadline]);
    ok = true;
  } catch (error) {
    failure = controller.signal.aborted ? "timeout" : classifyProbeFailure(error);
    detail = healthErrorDetail(controller.signal.aborted ? timeout : error);
  } finally {
    clearTimeout(timer);
  }
  return { ...service, ok, failure, detail, latencyMs: Math.round(performance.now() - start), checkedAt: new Date().toISOString() };
}
