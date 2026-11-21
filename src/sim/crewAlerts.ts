/** Forwards new simulated detections to Inspector's existing crew feed. */
import { appendActivity } from "@/crew/feedStore";
import type { SimAlert } from "./types";

function alertKey(alert: SimAlert): string {
  return `${alert.source}/${alert.id}/${alert.severity}`;
}

export function publishNewSimAlerts(current: SimAlert[], previous: SimAlert[], runId?: string): void {
  const seen = new Set(previous.map(alertKey));
  for (const alert of current) {
    const key = alertKey(alert);
    if (seen.has(key)) continue;
    seen.add(key);
    const prefix = alert.source === "simulation" ? "Simulated incident" : "Simulated plant";
    appendActivity({
      at: Date.now(),
      crew: "inspector",
      engine: "rules engine",
      kind: "sim",
      text: alert.title.startsWith("Simulated ") ? alert.title : `${prefix} · ${alert.title}`,
      ...(runId ? { runId } : {}),
    });
  }
}
