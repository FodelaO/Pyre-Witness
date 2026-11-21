/** Shows service health alongside measured product use for the current session. */
"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useRunStore } from "@/pipeline/runStore";
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { latestModelUses } from "./lastUse";
import { SERVICES, type ServiceHealth } from "./services";
import { refreshServices, useHealth, useHealthPolling } from "./useHealth";
import "./services.css";

const unknown: ServiceHealth[] = SERVICES.map((service) => ({
  service, status: "unknown", last: null, skipped: null, nextEligibleAt: null,
}));

function duration(ms: number) {
  return ms >= 1_000 ? `${(ms / 1_000).toFixed(1)} s` : `${ms} ms`;
}

function age(at: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(at)) / 1_000));
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3_600)} h ago`;
}

function statusText({ status, last }: ServiceHealth) {
  if (status === "ok") return "OK";
  if (status === "failing") return "Failing";
  if (status === "unknown") return "Unknown";
  return last ? `Skipped · last ${last.ok ? "OK" : "failed"}` : "Skipped";
}

export default function ServicesBoard() {
  useHealthPolling();
  const { snapshot, error, requesting } = useHealth();
  const events = useRunStore((state) => state.events);
  const runs = useTranscriptStore((state) => state.runs);
  const uses = useMemo(() => latestModelUses(events, runs), [events, runs]);
  const [now, setNow] = useState(Date.now);
  const title = useId();
  const services = snapshot?.services ?? unknown;
  const healthy = services.filter(({ last }) => last?.ok).length;

  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pw-health-board" aria-labelledby={title} aria-busy={requesting || snapshot?.refreshing}>
      <header className="pw-health-header">
        <div>
          <h2 id={title}>Gemini at work</h2>
          <p aria-live="polite">{healthy} / {services.length} services healthy</p>
        </div>
        <button type="button" className="pw-health-refresh" aria-label="Refresh services" disabled={requesting} onClick={() => void refreshServices()}>
          <RefreshCw size={13} aria-hidden />{requesting || snapshot?.refreshing ? "Checking…" : "Refresh"}
        </button>
      </header>
      {error && <p role="status" className="pw-health-request-error">{error}</p>}
      <ul className="pw-health-services">
        {services.map((row) => {
          const { service, status, last, skipped, nextEligibleAt } = row;
          const use = uses.get(service.model);
          const lastRun = [use?.latencyMs === undefined ? null : duration(use.latencyMs),
            use?.totalTokens === undefined ? null : `${use.totalTokens.toLocaleString("en-US")} tokens`].filter(Boolean).join(", ");
          const skipDetail = skipped === "on-demand" ? "On demand only"
            : skipped === "cooldown" && nextEligibleAt ? `Eligible ${new Date(nextEligibleAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : null;
          return (
            <li key={service.id} className="pw-health-service">
              <span className="pw-health-dot" data-status={status} aria-hidden />
              <div className="pw-health-description">
                <div className="pw-health-service-name"><strong>{service.label}</strong> <code>{service.model}</code></div>
                <p>{service.job}</p>
                {use && <p className="pw-health-use" title={new Date(use.at).toLocaleString()}>
                  Last run · {lastRun || age(new Date(use.at).toISOString(), now)}
                </p>}
              </div>
              <div className="pw-health-reading">
                <span data-status={status}>{statusText(row)}{last && status !== "skipped" && ` · ${duration(last.latencyMs)}`}</span>
                {last && <time dateTime={last.checkedAt} title={`${last.latencyMs} ms · ${last.checkedAt}`}>
                  {status === "skipped" && `${duration(last.latencyMs)} · `}checked {age(last.checkedAt, now)}
                </time>}
                {skipDetail && <span className="pw-health-skip">{skipDetail}</span>}
                {!last && !skipped && <span>Never checked</span>}
              </div>
              {last?.ok === false && <p className="pw-health-failure">{last.detail}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
