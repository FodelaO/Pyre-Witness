/** Shows measured proportions as aligned bars and confidence whiskers. */
import { HEADLINES, METRICS, type Summary } from "../../eval/metrics";
import type { PairedDifference, Proportion } from "../../eval/statistics";
import { SIDES, type Side } from "../../eval/types";
import styles from "./proof.module.css";

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
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{SIDE_NAME[side]}</span>
      <div className={`${styles.track} ${side === "system" ? styles.systemTrack : ""}`} aria-hidden="true">
        {width && <span className={styles.fill} style={{ width: `${value.value! * 100}%` }} />}
        {value.interval && (
          <span className={styles.whisker} style={{ left: `${value.interval[0] * 100}%`, width: `${(value.interval[1] - value.interval[0]) * 100}%` }} />
        )}
      </div>
      <div className={styles.barValue}>
        <strong>{width ?? (ran ? "—" : "Not run")}</strong>
        <span>{range ? `${range.join("–")} · ` : ""}n={value.n}</span>
      </div>
    </div>
  );
}

export function MetricBars({ summary, sides }: { summary: Summary; sides: readonly Side[] }) {
  return (
    <section className={styles.panel} aria-labelledby="headline-results">
      <div className={styles.sectionHeading}>
        <h2 id="headline-results">Headline results</h2>
        <span>95% confidence intervals</span>
      </div>
      <div className={styles.scale} aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      {HEADLINES.map((key) => (
        <div className={styles.metric} key={key}>
          <div className={styles.metricHeading}>
            <h3>{METRICS[key]}</h3>
            <span>{comparison(summary.paired.metrics[key])}</span>
          </div>
          {SIDES.map((side) => <Bar key={side} side={side} value={summary.sides[side].metrics[key]} ran={sides.includes(side)} />)}
        </div>
      ))}
    </section>
  );
}
