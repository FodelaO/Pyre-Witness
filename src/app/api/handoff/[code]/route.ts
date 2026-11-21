/** Accept a phone upload into the paired desktop's temporary mailbox. */
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { tooManyRequests } from "@/app/api/health/rateLimit";
import { handoffGuesses } from "@/handoff/guessLimit";
import { HandoffUploadError, readHandoffPayload } from "@/handoff/payload";
import { handoffStore } from "@/handoff/store";
import { isHandoffCode } from "@/handoff/types";

export const runtime = "nodejs";

const expired = () => Response.json({ error: "This link expired. Open a new QR code on the desktop." }, { status: 410 });

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  const { code } = await params;
  // The code is the only credential here, so a spent guess budget closes the route for everyone.
  const wait = handoffGuesses.blocked();
  if (wait) return tooManyRequests(wait, "Phone pairing");
  if (!isHandoffCode(code) || !handoffStore.has(code)) {
    handoffGuesses.take();
    return expired();
  }

  try {
    const payload = await readHandoffPayload(request);
    if (!handoffStore.publish(code, payload)) return expired();
    return Response.json({ accepted: payload.images.length }, { status: 202 });
  } catch (error) {
    if (error instanceof HandoffUploadError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Could not receive the photos. Try again." }, { status: 400 });
  }
}
