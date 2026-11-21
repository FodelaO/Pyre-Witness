/** Maps the daily watch lifecycle to a readable status and indicator tone. */
import type { WatchRunState } from "@/watch/watchStore";

export function watchStatus(run: WatchRunState) {
  if (run.status === "running") return "Checking";
  if (run.status === "idle") return "Ready";
  if (run.status === "error") return /GEMINI_API_KEY/i.test(run.message ?? "") ? "Key missing" : "Feed offline";
  if (run.sources.length && run.sources.every(({ error }) => error)) return "Feed offline";
  if (run.stages.some(({ state }) => state === "failed") || run.sources.some(({ error }) => error)) return "Partial";
  return "Complete";
}
