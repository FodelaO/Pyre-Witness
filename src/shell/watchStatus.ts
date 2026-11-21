/** Maps the daily watch lifecycle to a readable status and indicator tone. */
import type { WatchFeedStatus } from "@/watch/feedStatus";
import type { WatchRunState } from "@/watch/watchStore";

const missingKey = /GEMINI_API_KEY/i;
const checkTime = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

type MonitoringStatus = { tone: "live" | "attention" | "alarm"; label: string };
type MonitoringContext = { feedStatus: WatchFeedStatus; review: WatchRunState };

function runStatus(run: WatchRunState) {
  if (run.status === "running") return "Checking";
  if (run.status === "idle") return "Ready";
  if (run.status === "error") return missingKey.test(run.message ?? "") ? "Key missing" : "Feed offline";
  if (run.sources.length && run.sources.every(({ error }) => error)) return "Feed offline";
  if (run.stages.some(({ state }) => state === "failed") || run.sources.some(({ error }) => error)) return "Partial";
  return "Complete";
}

function monitoringStatus(run: WatchRunState, { feedStatus, review }: MonitoringContext): MonitoringStatus {
  const keyMissing = missingKey.test(run.message ?? "") || missingKey.test(review.message ?? "")
    || review.stages.some(({ state, detail }) => state === "failed" && missingKey.test(detail));
  if (keyMissing) return { tone: "alarm", label: "Threat watch · Gemini key missing" };

  const liveSource = run.sources.some(({ error }) => !error);
  if (feedStatus === "offline" || (run.sources.length > 0 && !liveSource)) {
    return { tone: "alarm", label: "Threat watch · feed offline" };
  }
  if (feedStatus === "stale") return { tone: "attention", label: "Threat watch · feed check stale" };
  if (run.sources.some(({ error }) => error)) return { tone: "attention", label: "Threat watch · some feeds failed" };

  const incompleteReview = [run, review].some(({ status, stages }) => status === "error"
    || stages.some(({ state }) => state === "failed" || state === "partial"));
  if (incompleteReview) {
    return liveSource
      ? { tone: "live", label: "Live monitoring · review incomplete" }
      : { tone: "attention", label: "Threat watch · review incomplete" };
  }
  if (run.status === "running" || (!liveSource && review.status === "running")) {
    return { tone: "live", label: "Threat watch · checking feeds" };
  }
  if (liveSource || run.status === "finished") return { tone: "live", label: "Live monitoring" };
  return { tone: "live", label: "Threat watch · ready" };
}

export function watchStatus(run: WatchRunState): ReturnType<typeof runStatus>;
export function watchStatus(run: WatchRunState, context: MonitoringContext): MonitoringStatus;
export function watchStatus(run: WatchRunState, context?: MonitoringContext) {
  if (!context) return runStatus(run);
  const status = monitoringStatus(run, context);
  if (run.checkedAt === undefined) return status;
  return { ...status, label: `${status.label} · threat feeds checked ${checkTime.format(run.checkedAt)}` };
}
