/** Presents measured pipeline evidence from saved receipts and states the dataset scope. */
import type { EvaluationReport } from "../../eval/report";
import { formatPercent } from "./MetricBars";

export function PipelineEvidenceStrip({ report }: { report: EvaluationReport }) {
  const evidence = report.pipelineEvidence;
  const paired = report.fairComparison?.answered;
  if (!evidence?.n || !paired) return null;
  const forbidden = paired.metrics.neverPlaceViolation;
  const revisions = paired.revisions;
  return <section className="pw-judge-panel pw-judge-evidence" aria-labelledby="one-call-question">
    <div className="pw-judge-title">
      <h2 id="one-call-question">What a single call cannot do</h2>
    </div>
    <dl>
      <div><dt>Forbidden placements</dt><dd>{forbidden.system.numerator}/{forbidden.system.n} vs {forbidden.baseline.numerator}/{forbidden.baseline.n}</dd><small>Pyre Witness vs Hydrogen · shared answers</small></div>
      <div><dt>Rules-driven revisions</dt><dd>{revisions.value === null ? "—" : formatPercent(revisions.value)}</dd><small>{revisions.numerator}/{revisions.n} checked recommendations · shared answers</small></div>
      <div><dt>Rules-engine attack paths</dt><dd>{evidence.pathsPerCapture?.toFixed(2) ?? "—"} per capture</dd><small>{evidence.visiblePaths} shown across {evidence.n} captures</small></div>
      <div><dt>Deterministic checks</dt><dd>{evidence.checksPerCapture?.toFixed(2) ?? "—"} per capture</dd><small>{evidence.checks} checks · {evidence.medianCheckMs ?? "—"} ms median per check</small></div>
    </dl>
    <p className="pw-judge-note">Paths come from the as-dropped and final checks. {evidence.distinctTriggeredRules} distinct rules triggered. Individual rule invocations are untracked.</p>
  </section>;
}
