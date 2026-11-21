/** Identifies a cached provider failure that is eligible for a fresh watch run. */
import type { WatchRunState } from "@/watch/watchStore";

export function shouldRetryRestoredWatch(before: WatchRunState, after: WatchRunState): boolean {
  if (before === after || after.status !== "finished") return false;
  return after.report?.stages.some(({ name, state, detail }) =>
    (state === "failed" || state === "partial") &&
    (name === "triage" || name === "reassessment" || /GEMINI_API_KEY/i.test(detail)),
  ) ?? false;
}
