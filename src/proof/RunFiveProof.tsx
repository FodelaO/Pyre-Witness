/** Leads with the archived Run 5 result, paired placements and limits of the evaluation. */
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { FairComparison } from "../../eval/fairComparison";
import type { EvaluationReport } from "../../eval/report";
import { formatPercent } from "./MetricBars";
import { ProofReport } from "./ProofReport";
import { RunFiveBars, RunFiveHistory, wholePercent } from "./RunFiveCharts";
import { RunFiveReceipts } from "./RunFiveReceipts";
import { readExamples, readRunHistory } from "./runFiveEvidence";

export async function RunFiveProof({ report, comparison }: { report: EvaluationReport; comparison: FairComparison }) {
  const [examples, history] = await Promise.all([readExamples(report), readRunHistory(report)]);
  const { answered, riskDifference } = comparison;
  const { riskRecall, neverPlaceViolation, radiosRecall, cloudAccuracy, categoryAccuracy } = answered.metrics;
  const difference = riskDifference.answered;
  const significant = difference.interval && (difference.interval[0] > 0 || difference.interval[1] < 0);
  const safety = comparison.exact.find(({ key }) => key === "neverPlaceViolation")?.answered;
  const baselineLatency = report.overall.sides.baseline.latencyMs.p50;
  const systemLatency = report.overall.sides.system.latencyMs.p50;
  const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  const points = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`;

  return (
    <div className="pw-run5">
      <div className="pw-run5-context">
        <span>Run 5 · {report.dataset.evaluated} real captures · {answered.n} paired answers</span>
        <a href="/proof/sources">Photo credits <ArrowUpRight size={13} aria-hidden /></a>
      </div>
      <section className="pw-run5-hero" aria-label="Run 5 headline results">
        <article className="pw-judge-panel pw-run5-lead">
          <h2>Key risks found</h2>
          <div className="pw-run5-score">
            <div><strong>{wholePercent(riskRecall.system.value)}</strong><small>Pyre Witness</small></div>
            <span>vs</span>
            <div><strong>{wholePercent(riskRecall.baseline.value)}</strong><small>Single Gemini call</small></div>
          </div>
          {difference.value !== null && difference.interval && (
            <p className="pw-run5-gain"><b>{points(difference.value)} points</b>{significant && " · statistically significant"}
              <small>Paired bootstrap 95% CI {difference.interval.map(points).join(" to ")} pp · {difference.n} captures with risk labels</small>
            </p>
          )}
        </article>
        <article className="pw-judge-panel pw-run5-secondary">
          <h2>Forbidden-area recommendations</h2>
          <p className="pw-run5-score">
            <strong>{neverPlaceViolation.system.numerator}</strong><span>vs</span><strong>{neverPlaceViolation.baseline.numerator}</strong>
          </p>
          <p className="pw-run5-muted">Pyre Witness vs single call · {safety?.n ?? neverPlaceViolation.system.n} eligible pairs
            {safety?.p != null && <><br />{safety.p >= 0.05 ? "Inconclusive · " : ""}Exact McNemar p = {safety.p.toFixed(2)}</>}
          </p>
        </article>
        <article className="pw-judge-panel pw-run5-secondary pw-run5-parity">
          <h2>Radio and cloud at baseline parity</h2>
          <dl>
            <div><dt>Radio recall</dt><dd>{wholePercent(radiosRecall.system.value)}</dd></div>
            <div><dt>Cloud flag accuracy</dt><dd>{cloudAccuracy.system.value === null ? "—" : formatPercent(cloudAccuracy.system.value)}</dd></div>
          </dl>
          <a href="#pw-run5-metrics">Compare metrics <ArrowDown size={13} aria-hidden /></a>
        </article>
      </section>
      <RunFiveReceipts examples={examples} />
      <div className="pw-run5-analysis">
        <RunFiveBars cohort={answered} />
        <div>
          <RunFiveHistory history={history} />
          <aside className="pw-judge-panel pw-run5-limits" aria-labelledby="pw-run5-limits">
            <div className="pw-run5-section-heading"><h2 id="pw-run5-limits">Limits</h2></div>
            <p>One development set informed all five runs. No held-out set has been evaluated.</p>
            <p>The single call leads on device category ({wholePercent(categoryAccuracy.baseline.value)} vs {wholePercent(categoryAccuracy.system.value)})
              {baselineLatency !== null && systemLatency !== null && <> and median end-to-end time ({seconds(baselineLatency)} vs {seconds(systemLatency)})</>}.</p>
            <p>Run 5 compares the full system with one saved Gemini 4 Hydrogen call.</p>
          </aside>
        </div>
      </div>
      <details className="pw-judge-details pw-run5-archive">
        <summary>Full results, methods and failure cases</summary>
        <ProofReport report={report} />
      </details>
    </div>
  );
}
