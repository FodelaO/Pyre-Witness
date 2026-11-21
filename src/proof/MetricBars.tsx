/** Shows measured proportions as aligned bars and confidence whiskers. */
import { HEADLINES, NEGATIVE_METRICS, metricName, type Summary } from "../../eval/metrics";
import type { PairedDifference, Proportion } from "../../eval/statistics";
import { SIDES, type Side } from "../../eval/types";

export const SIDE_NAME = { baseline: "Baseline", system: "Pyre Witness" } as const;
export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const percentPoints = (value: number) => `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

function comparison(delta: PairedDifference) {
  return delta.value === null || !delta.interval ? "Paired difference unavailable"
    : `${percentPoints(delta.value)} · ${delta.interval.map(percentPoints).join(" to ")} · ${delta.n} paired`;
}

function Bar({ side, value, ran }: { side: Side; value: Proportion; ran: boolean }) {
  const width = value.value === null ? null : formatPercent(value.value);
  const range = value.interval?.map(formatPercent);
  return (
    <div className="pw-proof-bar-row">
      <span className="pw-proof-bar-label">{SIDE_NAME[side]}</span>
      <div className={`pw-proof-track${side === "system" ? " pw-proof-system-track" : ""}`} aria-hidden="true">
        {width && <span className="pw-proof-fill" style={{ width: `${value.value! * 100}%` }} />}
        {value.interval && (
          <span className="pw-proof-whisker" style={{ left: `${value.interval[0] * 100}%`, width: `${(value.interval[1] - value.interval[0]) * 100}%` }} />
        )}
      </div>
      <div className="pw-proof-bar-value">
        <strong>{width ?? (ran ? "—" : "Not run")}</strong>
        <span>{range ? `${range.join("–")} · ` : ""}n={value.n}</span>
      </div>
    </div>
  );
}

export function MetricBars({ summary, sides, objectAssessment }: { summary: Summary; sides: readonly Side[]; objectAssessment?: boolean }) {
  const metrics = objectAssessment ? [...HEADLINES, ...NEGATIVE_METRICS] : HEADLINES;
  return (
    <section className="pw-proof-panel" aria-labelledby="headline-results">
      <div className="pw-proof-section-heading">
        <h2 id="headline-results">Headline results</h2>
        <span>Wilson 95% confidence intervals</span>
      </div>
      <div className="pw-proof-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      {metrics.map((key) => (
        <div className="pw-proof-metric" key={key}>
          <div className="pw-proof-metric-heading">
            <h3>{metricName(key, objectAssessment)}{key === "nonDeviceCyberClaims" && " · lower is better"}</h3>
            <span>{comparison(summary.paired.metrics[key])}</span>
          </div>
          {SIDES.map((side) => <Bar key={side} side={side} value={summary.sides[side].metrics[key]} ran={sides.includes(side)} />)}
        </div>
      ))}
    </section>
  );
}
