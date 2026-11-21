/** Delivers the LAN phone screen without a Next development WebSocket. */
import { phoneMarkup } from "@/escalation/phoneMarkup";
import { PAIR_CODE } from "@/escalation/wire.mjs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return new Response(phoneMarkup(PAIR_CODE.test(code) ? code : ""), { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
  } });
}
