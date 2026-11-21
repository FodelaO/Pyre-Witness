/** Discovers LAN IPv4 addresses for the pairing URL and QR. */
import { networkInterfaces } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { crossOriginRejection } from "@/app/api/health/originGuard";

export const runtime = "nodejs";

let macWifi: Promise<string[]> | undefined;
function wifiInterfaces(names: string[]) {
  if (process.platform !== "darwin") return names.filter((name) => /^(wl|wi-fi|wireless|airport)/i.test(name));
  // Hardware port names stay stable when the presenter moves between networks.
  return macWifi ??= promisify(execFile)("/usr/sbin/networksetup", ["-listallhardwareports"], { timeout: 1000 })
    .then(({ stdout }) => Array.from(stdout.matchAll(/^Hardware Port: (?:Wi-Fi|AirPort)\r?\nDevice: (\S+)/gmi), (match) => match[1]))
    .catch(() => ["en0"]);
}

export async function GET(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const interfaces = Object.entries(networkInterfaces()).sort(([a], [b]) =>
    Number(!/^(en|eth|wl)/i.test(a)) - Number(!/^(en|eth|wl)/i.test(b)));
  const wireless = await wifiInterfaces(interfaces.map(([name]) => name));
  const wifiAddresses = new Set<string>();
  const addresses = interfaces.flatMap(([name, entries]) => (entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254."))
    .map(({ address }) => {
      if (wireless.includes(name)) wifiAddresses.add(address);
      return address;
    }));
  const port = Number(new URL(request.url).port) || Number(process.env.PORT) || 4119;
  return Response.json({ addresses: [...new Set(addresses)], wifiAddresses: [...wifiAddresses], port }, { headers: { "Cache-Control": "no-store" } });
}
