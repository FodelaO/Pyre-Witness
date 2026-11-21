/** Discovers LAN IPv4 addresses for the pairing URL and QR. */
import { networkInterfaces } from "node:os";
import { crossOriginRejection } from "@/app/api/health/originGuard";

export const runtime = "nodejs";

export function GET(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const interfaces = Object.entries(networkInterfaces()).sort(([a], [b]) =>
    Number(!/^(en|eth|wl)/i.test(a)) - Number(!/^(en|eth|wl)/i.test(b)));
  const addresses = interfaces.flatMap(([, entries]) => (entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254."))
    .map(({ address }) => address));
  const port = Number(new URL(request.url).port) || Number(process.env.PORT) || 4119;
  return Response.json({ addresses: [...new Set(addresses)], port }, { headers: { "Cache-Control": "no-store" } });
}
