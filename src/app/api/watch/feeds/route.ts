/** Serves the live public-feed check independently of the Chief's model review. */
import { loadFeeds, loadKnownExploitedCves } from "@/watch/feeds";
import { loadBeverageRecalls } from "@/watch/feeds/openFda";
import type { LiveCheck } from "@/watch/liveTypes";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const now = Date.now();
  const [security, recalls, kev] = await Promise.all([loadFeeds(now), loadBeverageRecalls(now), loadKnownExploitedCves()]);
  const advisories = security.items.map((item) => item.cves.some((cve) => kev.has(cve)) ? { ...item, knownExploited: true } : item);
  const check: LiveCheck = {
    checkedAt: Date.now(), items: [...advisories, ...recalls.items], sources: [...security.sources, recalls.result],
  };
  return Response.json(check, { headers: { "Cache-Control": "no-store" } });
}
