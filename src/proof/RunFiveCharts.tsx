/** Compares paired outcomes with confidence intervals and plots system recall across saved runs. */
import { fairMetricName, type FairComparison } from "../../eval/fairComparison";
import { METRIC_KEYS, type Metric } from "../../eval/metrics";
import type { Proportion } from "../../eval/statistics";
import { formatPercent } from "./MetricBars";
import type { readRunHistory } from "./runFiveEvidence";

const measures = [
  ["riskRecall", "Key risks found"],
  ["neverPlaceViolation", "Forbidden recommendations ↓"],
  ["radiosRecall", "Radio recall"],
  ["cloudAccuracy", "Cloud flag accuracy"],
  ["physicalAreaAccuracy", "Plant-area accuracy"],
  ["physicalKindAccuracy", "Physical-kind accuracy"],
  ["deviceTypeMatch", "Device-type naming match"],
  ["categoryAccuracy", "Device-category accuracy"],
] as const;

export const wholePercent = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;

function Band({ score, system }: { score: Proportion; system: boolean }) {
  const { value, interval, n } = score;
  return (
    <div className="pw-run5-band">
      <span className="pw-run5-sr">{system ? "Pyre Witness" : "Single Gemini call"}</span>
      <div className="pw-run5-track" data-system={system || undefined} aria-hidden="true">
        <i style={{ width: `${(value ?? 0) * 100}%` }} />
        {interval && <b style={{ left: `${interval[0] * 100}%`, width: `${(interval[1] - interval[0]) * 100}%` }} />}
      </div>
      <strong>{value === null ? "—" : formatPercent(value)}</strong>
      <small>{interval?.map(formatPercent).join("–") ?? "Interval unavailable"} · n={n}</small>
    </div>
  );
}

function MetricPair({ label, scores }: { label: string; scores: FairComparison["answered"]["metrics"][Metric] }) {
  return (
    <div className="pw-run5-metric">
      <h3>{label}</h3>
      <Band score={scores.system} system />
      <Band score={scores.baseline} system={false} />
    </div>
  );
}

export function RunFiveBars({ cohort }: { cohort: FairComparison["answered"] }) {
  return (
    <section className="pw-judge-panel pw-run5-metrics" aria-labelledby="pw-run5-metrics">
      <div className="pw-run5-section-heading"><h2 id="pw-run5-metrics">Run 5 by metric</h2></div>
      <p className="pw-run5-muted">{cohort.n} captures answered by both. Whiskers show Wilson 95% intervals.</p>
      <ul className="pw-run5-legend">
        <li><i /> Pyre Witness</li>
        <li><i /> Single Gemini call</li>
      </ul>
      <div className="pw-run5-metric-grid">
        {measures.map(([key, label]) => (
          <MetricPair key={key} label={label} scores={cohort.metrics[key]} />
        ))}
      </div>
      <details className="pw-run5-more-metrics">
        <summary>All other paired metrics</summary>
        <div className="pw-run5-metric-grid">
          {METRIC_KEYS.filter((key) => !measures.some(([headline]) => headline === key)).map((key) => (
            <MetricPair key={key} label={fairMetricName(key)} scores={cohort.metrics[key]} />
          ))}
        </div>
      </details>
    </section>
  );
}

export function RunFiveHistory({ history }: { history: Awaited<ReturnType<typeof readRunHistory>> }) {
  const coordinates = history.map(({ metric }, index) => ({
    x: 50 + index * 100,
    y: metric?.value == null ? null : 112 - metric.value * 110,
  }));
  const trend = coordinates.map(({ x, y }, index) =>
    y === null ? "" : `${index === 0 || coordinates[index - 1].y === null ? "M" : "L"} ${x},${y}`).join(" ");

  return (
    <section className="pw-judge-panel pw-run5-history" aria-labelledby="pw-run5-history">
      <div className="pw-run5-section-heading"><h2 id="pw-run5-history">Risk recall across five runs</h2></div>
      <p className="pw-run5-muted">Pyre Witness · all recorded attempts</p>
      <div className="pw-run5-trend">
        <svg viewBox="0 0 500 122" preserveAspectRatio="none" aria-hidden="true">
          {[2, 57, 112].map((y) => <line key={y} x1="0" y1={y} x2="500" y2={y} />)}
          <path d={trend} />
          {coordinates.map(({ x, y }) => y === null ? null : <circle key={x} cx={x} cy={y} r="4" />)}
        </svg>
        <ol>
          {history.map(({ run, metric, recorded }) => (
            <li key={run}><strong>{wholePercent(metric?.value ?? null)}</strong><span>Run {run}</span>
              <small>{recorded == null ? "Unavailable" : `${recorded} inputs`}</small></li>
          ))}
        </ol>
      </div>
      <p className="pw-run5-muted">Run 1 recorded 67 of 71 inputs. The pipeline and scoring evolved across runs.</p>
    </section>
  );
}
