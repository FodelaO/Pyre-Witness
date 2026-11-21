/** One per-process budget for pairing-code probes, shared by the upload and stream routes. */
import { sharedRateLimit } from "@/app/api/health/rateLimit";

/**
 * A probe is an upload to an unknown code, or a stream request that opens a session or meets a
 * code owned by another key. A 6-character code has 30 bits, so 20 probes a minute against at most
 * 12 live sessions leaves a guess rate that cannot find a code within its 10-minute life.
 * While the budget is spent every unproven request gets 429, so the limit is also not an oracle.
 */
export const handoffGuesses = sharedRateLimit("handoff-guess", 20, 60_000);
