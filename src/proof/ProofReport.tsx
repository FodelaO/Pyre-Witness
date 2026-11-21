/** Lays out run coverage, headline metrics, difficulty and failure evidence. */
import { GROUPS, SIDES } from "../../eval/types";
import type { Proportion } from "../../eval/statistics";
import type { EvaluationReport } from "../../eval/report";
import { FailureGallery } from "./FailureGallery";
import { formatPercent, MetricBars, SIDE_NAME } from "./MetricBars";
import styles from "./proof.module.css";

function proportionText({ value, n }: Proportion) {
  return value === null ? "—" : `${formatPercent(value)} (n=${n})`;
}

function latency(ms: number | null) {
  return ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`;
}

export function ProofReport({ report }: { report: EvaluationReport }) {
  const { overall, models, sides } = report;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(report.date));
  return (
    <>
      <div className={styles.runInfo}>
        <span><strong>{report.dataset.selected}</strong> of {report.dataset.available} items</span>
        <time dateTime={report.date}>{date} UTC</time>
        {report.reused > 0 && <span>{report.reused} cached artifacts</span>}
      </div>
      <div className={styles.dashboard}>
        <MetricBars summary={overall} sides={sides} />
        <aside className={styles.runDetails} aria-label="Run details">
          {SIDES.map((side) => {
            const result = overall.sides[side];
            return (
              <section className={styles.panel} key={side}>
                <h2>{SIDE_NAME[side]}</h2>
                <p className={styles.models}>
                  {side === "baseline" ? models.baseline : [models.gate, models.perception, models.reasoning, models.chief].join(" · ")}
                </p>
                {sides.includes(side) ? (
                  <dl className={styles.runStats}>
                    <div><dt>False accepts / rejects</dt><dd>{result.gate.falseAccepts} / {result.gate.falseRejects}</dd></div>
                    <div><dt>Run errors / timeouts</dt><dd>{result.failures} / {result.timeouts}</dd></div>
                    <div><dt>Latency p50 / p95</dt><dd>{latency(result.latencyMs.p50)} / {latency(result.latencyMs.p95)}</dd></div>
                  </dl>
                ) : <p className={styles.models}>Not run</p>}
              </section>
            );
          })}
          <p className={styles.judge}>Type judge <code>{models.judge}</code></p>
        </aside>
      </div>
      <details className={styles.breakdown}>
        <summary>Results by difficulty</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead><tr><th>Group</th><th>Items</th><th>Baseline kind / area</th><th>Pyre Witness kind / area</th></tr></thead>
            <tbody>
              {GROUPS.map((group) => {
                const summary = report.breakdown[group];
                return <tr key={group}><th scope="row">{group === "links" ? "Product links" : group}</th><td>{summary.n}</td>
                  {SIDES.map((side) => {
                    const metrics = summary.sides[side].metrics;
                    return <td key={side}>{proportionText(metrics.physicalKindAccuracy)} / {proportionText(metrics.physicalAreaAccuracy)}</td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </details>
      {report.dataset.warnings.length > 0 && <ul className={styles.warnings}>{report.dataset.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <FailureGallery cases={report.failures} />
    </>
  );
}
