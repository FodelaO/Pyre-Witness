/** Returns a masked status snapshot for a recently created Pyre Witness call. */
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { CALL_SID, callJson, callMask, requestTwilio, twilioConfig } from "../twilio";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ sid: string }> }) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const { sid } = await params;
  const maskedNumber = CALL_SID.test(sid) ? callMask(sid) : undefined;
  if (!maskedNumber) return callJson({ error: "This call receipt is unavailable." }, 404);
  const config = twilioConfig();
  if (!config) return callJson({ error: "Twilio calling is unavailable." }, 503);
  const outcome = await requestTwilio(config, { sid });
  return "error" in outcome ? callJson(outcome, 502) : callJson({ mode: "twilio", ...outcome, maskedNumber });
}
