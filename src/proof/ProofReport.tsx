/** Lays out run coverage, headline metrics, difficulty and failure evidence. */
import { GROUPS, SIDES } from "../../eval/types";
import { CHALLENGE_METHOD } from "../../eval/benchmarkCases";
import type { Proportion } from "../../eval/statistics";
import type { EvaluationReport } from "../../eval/report";
import { FailureGallery } from "./FailureGallery";
import { formatPercent, MetricBars, SIDE_NAME } from "./MetricBars";
import { RunComparison } from "./RunComparison";
import { ChallengeCard } from "./ChallengeCard";
import { DatasetStrip } from "./DatasetStrip";
import { FailureHighlights } from "./FailureHighlights";
import { IterationTimeline } from "./IterationTimeline";
import { ModalityCard, ModalityMeasurements } from "./ModalityCard";
import { ProofAccuracy } from "./ProofAccuracy";
import { PipelineEvidenceStrip } from "./PipelineEvidenceStrip";
import { FairMetrics } from "./FairMetrics";

function proportionText({ value, n, interval }: Proportion) {
  return value === null ? "—" : `${formatPercent(value)} [${interval?.map(formatPercent).join("–")}] (n=${n})`;
}

function latency(ms: number | null) {
  return ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`;
}

export function ProofReport({ report }: { report: EvaluationReport }) {
  const { overall, models, sides, dataset } = report;
  const partial = dataset.evaluated < dataset.selected;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(report.date));
  return (
    <>
      <div className="pw-proof-run-info">
        <span><strong>{report.label?.replace(/^run-(\d+)$/, "Run $1") ?? "Evaluation run"}</strong></span>
        <span><strong>n={dataset.evaluated}</strong> / {dataset.selected} {report.fairComparison ? "recorded pairs" : sides.length === 2 ? "paired captures" : "captures"}</span>
        <time dateTime={report.date}>{date} UTC</time>
        {report.fairComparison ? <span>{report.label === "run-3" ? "Fresh Hydrogen baseline" : "Saved fair Hydrogen baseline"} · {report.fairComparison.concurrency} workers</span>
          : report.baselineFrom && <span>Original baseline receipts</span>}
        {report.pipelineEvidence && <span>One development set we iterated on. No held-out set yet.</span>}
      </div>
      {partial && <p className="pw-proof-partial">
        Partial results · {sides.map((side) => `${SIDE_NAME[side]} ${dataset.attempted[side]}/${dataset.selected}`).join(" · ")}.
        {" "}Faster cases may finish first.
      </p>}
      <div className="pw-judge-grid">
        <ProofAccuracy report={report} />
        <DatasetStrip report={report} />
        <FailureHighlights report={report} />
        <ChallengeCard report={report} />
        <IterationTimeline report={report} />
        <ModalityCard report={report} />
      </div>
      <PipelineEvidenceStrip report={report} />
      {report.fairComparison && <FairMetrics comparison={report.fairComparison} />}
      <ModalityMeasurements report={report} />
      <details className="pw-judge-details" id="all-measurements">
        <summary>{report.fairComparison ? "Run details, models and difficulty breakdown" : "All measurements, models and matched-run comparison"}</summary>
        <div className="pw-proof-dashboard">
        <MetricBars summary={overall} sides={sides} objectAssessment={report.objectAssessment} />
        <aside className="pw-proof-run-details" aria-label="Run details">
          {SIDES.map((side) => {
            const result = overall.sides[side];
            const traces = side === "system" ? report.pipelineEvidence?.requestTraces : undefined;
            return (
              <section className="pw-proof-panel" key={side}>
                <h2>{SIDE_NAME[side]}</h2>
                {side === "baseline" ? <p className="pw-proof-models">{models.baseline}<br />One structured interaction
                  {report.baselineFrom && <><br />Run 1 receipts · zero new calls</>}</p> : (
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
                    <div><dt>{report.objectAssessment ? "False device / non-device" : "False accepts / rejects"}</dt><dd>{result.gate.falseAccepts} / {result.gate.falseRejects}</dd></div>
                    <div><dt>Run errors / timeouts</dt><dd>{result.failures} / {result.timeouts}</dd></div>
                    <div><dt>Device placements</dt><dd>{result.metrics.placementCoverage.numerator}/{result.metrics.placementCoverage.n}</dd></div>
                    <div><dt>Latency p50 / p95</dt><dd>{latency(result.latencyMs.p50)} / {latency(result.latencyMs.p95)} (n={result.latencyMs.n})</dd></div>
                    {report.objectAssessment && <div><dt>Completed p50 / p95</dt><dd>
                      {latency(result.completedLatencyMs.p50)} / {latency(result.completedLatencyMs.p95)} (n={result.completedLatencyMs.n})
                    </dd></div>}
                    <div><dt>{traces?.shorterCounters ? "Gemini HTTP counter (incomplete)" : "Gemini HTTP attempts"}</dt><dd>{result.calls.n ? result.calls.total : "—"}</dd></div>
                    <div><dt>{traces?.shorterCounters ? "Mean request traces / capture" : "Mean calls / capture"}</dt><dd>{traces?.shorterCounters
                      ? `${traces.perCapture.toFixed(2)} (n=${traces.n})` : `${result.calls.mean?.toFixed(2) ?? "—"} (n=${result.calls.n})`}</dd></div>
                    <div><dt>HTTP 429</dt><dd>{result.calls.n ? result.calls.rateLimited : "—"}</dd></div>
                    {report.objectAssessment && side === "system" && <div><dt>Cyber claims stripped</dt><dd>{result.negatives.suppressed}</dd></div>}
                  </dl>
                ) : <p className="pw-proof-models">Not run</p>}
              </section>
            );
          })}
          <p className="pw-proof-judge">Offline judge <code>{models.judge}</code>{report.judgeCalls.n > 0 && <> · {report.judgeCalls.total} separate calls</>}</p>
        </aside>
        </div>
        <details className="pw-proof-breakdown" open>
          <summary>Results by difficulty</summary>
        <div className="pw-proof-table-scroll">
          <table>
            <thead><tr><th>Group</th><th>Captures</th><th>Baseline kind</th><th>Pyre Witness kind</th><th>Baseline area</th><th>Pyre Witness area</th></tr></thead>
            <tbody>
              {GROUPS.map((group) => {
                const summary = report.breakdown[group];
                return <tr key={group}><th scope="row">{group === "links" ? "Product links" : group}</th><td>{summary.n}</td>
                  {(["physicalKindAccuracy", "physicalAreaAccuracy"] as const).flatMap((key) =>
                    SIDES.map((side) => <td key={`${side}-${key}`}>{proportionText(summary.sides[side].metrics[key])}</td>))}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        </details>
        {!report.fairComparison && <RunComparison comparison={report.comparison} />}
      </details>
      <section className="pw-judge-method" id="challenge-method" aria-label="Challenge criteria">
        <p>{CHALLENGE_METHOD} Ties use photos first, then capture ID.</p>
        <p>Completed responses include a deliberate usability stop. Each accuracy measure uses its labeled denominator.</p>
      </section>
      {report.dataset.warnings.length > 0 && <ul className="pw-proof-warnings">{report.dataset.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <div id="failure-gallery"><FailureGallery cases={report.failures} /></div>
    </>
  );
}
