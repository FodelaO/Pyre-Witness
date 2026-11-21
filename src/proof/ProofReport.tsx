/** Lays out run coverage, headline metrics, difficulty and failure evidence. */
import { GROUPS, SIDES } from "../../eval/types";
import type { Proportion } from "../../eval/statistics";
import type { EvaluationReport } from "../../eval/report";
import { FailureGallery } from "./FailureGallery";
import { formatPercent, MetricBars, SIDE_NAME } from "./MetricBars";

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
      <div className="pw-proof-run-info">
        <span><strong>n={report.dataset.selected}</strong> of {report.dataset.available} available</span>
        <time dateTime={report.date}>{date} UTC</time>
        {report.reused > 0 && <span>{report.reused} cached artifacts</span>}
      </div>
      <div className="pw-proof-dashboard">
        <MetricBars summary={overall} sides={sides} />
        <aside className="pw-proof-run-details" aria-label="Run details">
          {SIDES.map((side) => {
            const result = overall.sides[side];
            return (
              <section className="pw-proof-panel" key={side}>
                <h2>{SIDE_NAME[side]}</h2>
                {side === "baseline" ? <p className="pw-proof-models">{models.baseline}</p> : (
                  <dl className="pw-proof-models pw-proof-model-list">
                    <div><dt>Gate</dt><dd>{models.gate}</dd></div>
                    <div><dt>Scout</dt><dd>{models.perception}</dd></div>
                    <div><dt>Architect</dt><dd>{models.reasoning}</dd></div>
                    <div><dt>Inspector</dt><dd>Rules engine</dd></div>
                    <div><dt>Chief</dt><dd>{models.chief}</dd></div>
                  </dl>
                )}
                {sides.includes(side) ? (
                  <dl className="pw-proof-run-stats">
                    <div><dt>False accepts / rejects</dt><dd>{result.gate.falseAccepts} / {result.gate.falseRejects}</dd></div>
                    <div><dt>Run errors / timeouts</dt><dd>{result.failures} / {result.timeouts}</dd></div>
                    <div><dt>Latency p50 / p95</dt><dd>{latency(result.latencyMs.p50)} / {latency(result.latencyMs.p95)}</dd></div>
                  </dl>
                ) : <p className="pw-proof-models">Not run</p>}
              </section>
            );
          })}
          <p className="pw-proof-judge">Type judge <code>{models.judge}</code></p>
        </aside>
      </div>
      <details className="pw-proof-breakdown">
        <summary>Results by difficulty</summary>
        <div className="pw-proof-table-scroll">
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
      {report.dataset.warnings.length > 0 && <ul className="pw-proof-warnings">{report.dataset.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <FailureGallery cases={report.failures} />
    </>
  );
}
