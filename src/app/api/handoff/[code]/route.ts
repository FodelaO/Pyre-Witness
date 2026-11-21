/** Accept a phone upload into the paired desktop's temporary mailbox. */
import { HandoffUploadError, readHandoffPayload } from "@/handoff/payload";
import { handoffStore } from "@/handoff/store";
import { isHandoffCode } from "@/handoff/types";

export const runtime = "nodejs";

const expired = () => Response.json({ error: "This link expired. Open a new QR code on the desktop." }, { status: 410 });

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isHandoffCode(code) || !handoffStore.has(code)) return expired();

  try {
    const payload = await readHandoffPayload(request);
    if (!handoffStore.publish(code, payload)) return expired();
    return Response.json({ accepted: payload.images.length }, { status: 202 });
  } catch (error) {
    if (error instanceof HandoffUploadError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Could not receive the photos. Try again." }, { status: 400 });
  }
}
