/** Admits a watch run only from the app's own origin and within a per-process budget. */
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { tooManyRequests, type RateLimit } from "@/app/api/health/rateLimit";

export async function admitWatch(
  request: Request,
  limit: RateLimit,
  what: string,
  start: (request: Request) => Promise<Response>,
): Promise<Response> {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const wait = limit.take();
  if (wait) return tooManyRequests(wait, what);
  const response = await start(request);
  // A snapshot rejected before the run started spent nothing, so it gives its slot back.
  if (!response.ok) limit.refund();
  return response;
}
