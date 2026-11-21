/** Discover usable IPv4 LAN addresses for the desktop pairing QR. */
import { networkInterfaces } from "node:os";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import type { HandoffInfo } from "@/handoff/types";

export const runtime = "nodejs";

export function GET(request: Request) {
  // LAN addresses are only for the desktop page itself, never for a rebound or foreign origin.
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const interfaces = Object.entries(networkInterfaces());
  const onLan = (name: string) => /^(en|eth|wl)/i.test(name) ? 0 : 1;
  interfaces.sort(([left], [right]) => onLan(left) - onLan(right));
  const addresses = interfaces.flatMap(([, entries]) => (entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address));
  const port = Number(new URL(request.url).port) || Number(process.env.PORT) || 4119;
  const info: HandoffInfo = { addresses: [...new Set(addresses)], port };
  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
}
