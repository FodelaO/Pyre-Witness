/** Refuses browser requests from other sites and from host names an attacker could rebind. */
import { isIP } from "node:net";

const reject = (error: string) => Response.json({ error }, { status: 403, headers: { "Cache-Control": "no-store" } });

function hostName(host: string): string {
  const name = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.replace(/:\d+$/, "");
  return name.toLowerCase().replace(/\.$/, "");
}

/** Literal addresses and local-only names cannot be pointed at this server by public DNS. */
export function isLocalHost(host: string, extra = process.env.PYRE_ALLOWED_HOSTS ?? ""): boolean {
  const name = hostName(host);
  if (!name) return false;
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || isIP(name) !== 0) return true;
  return extra.split(",").some((allowed) => allowed.trim().toLowerCase() === name);
}

/**
 * Returns a 403 for a cross-site browser request or an unexpected Host, otherwise null.
 * This is CSRF and DNS-rebinding defence only. It does not authenticate the caller: clients that
 * send no Origin (curl, scripts) pass, as does anyone who can reach the port directly.
 */
export function crossOriginRejection(request: Request): Response | null {
  const host = (request.headers.get("host") ?? new URL(request.url).host).toLowerCase();
  if (!isLocalHost(host)) return reject("Open Pyre Witness on localhost or its LAN address.");
  if (request.headers.get("sec-fetch-site") === "cross-site") return reject("Open Pyre Witness to use this action.");
  const origin = request.headers.get("origin");
  if (origin === null) return null;
  if (!URL.canParse(origin) || new URL(origin).host.toLowerCase() !== host) {
    return reject("Open Pyre Witness to use this action.");
  }
  return null;
}
