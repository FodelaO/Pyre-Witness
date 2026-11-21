/** Shows service health alongside measured product use for the current session. */
"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useRunStore } from "@/pipeline/runStore";
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { latestModelUses } from "./lastUse";
import { healthAge, initialServices, serviceTone, summarizeHealth, type ServiceHealth } from "./services";
import { refreshServices, useHealth, useHealthPolling } from "./useHealth";
import "./services.css";

function duration(ms: number) {
  return ms >= 1_000 ? `${(ms / 1_000).toFixed(1)} s` : `${ms} ms`;
}

const STATUS_TEXT = {
  checking: "Checking", "on-demand": "On demand", ok: "OK", stale: "Stale", failing: "Failing",
} satisfies Record<ServiceHealth["status"], string>;

export default function ServicesBoard() {
  useHealthPolling();
  const { snapshot, error, requesting, fromSession } = useHealth();
  const captureRunning = useRunStore((state) => state.status === "running");
  const events = useRunStore((state) => state.events);
  const runs = useTranscriptStore((state) => state.runs);
  const uses = useMemo(() => latestModelUses(events, runs), [events, runs]);
  const [now, setNow] = useState(Date.now);
  const title = useId();
  const services = snapshot?.services ?? initialServices;
  const { healthy, completed } = summarizeHealth(services);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pw-health-board" aria-labelledby={title} aria-busy={requesting || snapshot?.refreshing}>
      <div className="pw-health-header">
        <div>
          <h3 id={title}>Gemini at work</h3>
          <p aria-live="polite">{completed ? `${healthy} / ${completed} checked services healthy` : "Checking services"}</p>
          {snapshot?.checkedAt && <time dateTime={snapshot.checkedAt} className="pw-health-snapshot-age">
            {fromSession ? "Cached · checked " : "Checked "}{healthAge(snapshot.checkedAt, now)}
          </time>}
        </div>
        <button type="button" className="pw-health-refresh" aria-label="Refresh services" disabled={requesting || captureRunning} onClick={() => void refreshServices()}>
          <RefreshCw size={13} aria-hidden />{captureRunning ? "Capture running" : requesting || snapshot?.refreshing ? "Checking…" : "Refresh"}
        </button>
      </div>
      {error && <p role="status" className="pw-health-request-error">{error}</p>}
      <ul className="pw-health-services">
        {services.map((row) => {
          const { service, status, last, lastAttempt, lastGoodAt, failingSince, nextEligibleAt } = row;
          const tone = serviceTone(row);
          const use = uses.get(service.model);
          const lastRun = [use?.latencyMs === undefined ? null : duration(use.latencyMs),
            use?.totalTokens === undefined ? null : `${use.totalTokens.toLocaleString("en-US")} tokens`].filter(Boolean).join(", ");
          const cooldown = nextEligibleAt && Date.parse(nextEligibleAt) > now
            ? `Eligible ${new Date(nextEligibleAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : null;
          const pastGood = (status === "stale" || status === "failing") && lastGoodAt;
          const confirmedAt = status === "failing" ? failingSince ?? last?.checkedAt : null;
          const dated = pastGood || (!confirmedAt && (last?.checkedAt || lastAttempt?.checkedAt));
          return (
            <li key={service.id} className="pw-health-service">
              <span className="pw-health-dot" data-status={tone} aria-hidden />
              <div className="pw-health-description">
                <div className="pw-health-service-name"><strong>{service.label}</strong> <code>{service.model}</code></div>
                <p>{service.job}</p>
                {use && <p className="pw-health-use" title={new Date(use.at).toLocaleString()}>
                  Last run · {lastRun || healthAge(new Date(use.at).toISOString(), now)}
                </p>}
              </div>
              <div className="pw-health-reading">
                <span data-status={tone}>{STATUS_TEXT[status]}{last && (status === "ok" || status === "failing") && ` · ${duration(last.latencyMs)}`}</span>
                {confirmedAt && <time dateTime={confirmedAt} title={confirmedAt}>Confirmed {healthAge(confirmedAt, now)}</time>}
                {dated && <time dateTime={dated} title={dated}>
                  {pastGood ? "Last OK" : status === "stale" ? "Attempted" : "Checked"} {healthAge(dated, now)}
                </time>}
                {cooldown && <span>{cooldown}</span>}
              </div>
              {lastAttempt?.ok === false && <p className="pw-health-attempt" data-status={tone}>{lastAttempt.detail}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
