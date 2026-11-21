/** Shows placement accuracy and inference cost at judge-readable scale. */
import type { EvaluationReport } from "../../eval/report";
import { exactP } from "../../eval/markdown";
import type { Proportion } from "../../eval/statistics";
import { SIDES, type Side } from "../../eval/types";
import { formatPercent, SIDE_NAME } from "./MetricBars";

const metric = "physicalAreaAccuracy";

function areaRows(report: EvaluationReport, completed: boolean) {
  return SIDES.map((side) => {
    const fair = report.fairComparison;
    if (fair) return { side, value: (completed ? fair.answered : fair.all).metrics[metric][side] };
    const stats = report.overall.sides[side];
    return { side, value: completed ? stats.completed?.metrics[metric] : stats.metrics[metric] };
  });
}

function Band({ side, value }: { side: Side; value?: Proportion }) {
  return (
    <div className="pw-judge-band">
      <span>{SIDE_NAME[side]}</span>
      <div className={`pw-judge-track ${side}`} aria-hidden="true">
        {value?.value != null && <i style={{ width: `${value.value * 100}%` }} />}
        {value?.interval && <b style={{ left: `${value.interval[0] * 100}%`, width: `${(value.interval[1] - value.interval[0]) * 100}%` }} />}
      </div>
      <div className="pw-judge-band-value">
        <strong>{value?.value == null ? "—" : formatPercent(value.value)}</strong>
        <small>{value?.interval ? `${value.interval.map(formatPercent).join("–")} · ` : ""}n={value?.n ?? 0}</small>
      </div>
    </div>
  );
}

const time = (ms: number | null) => ms === null ? "—" : `${(ms / 1_000).toFixed(1)}s`;

export function ProofAccuracy({ report }: { report: EvaluationReport }) {
  const { overall, fairComparison: fair } = report;
  const shared = fair?.answered.metrics[metric];
  const kind = fair?.answered.metrics.physicalKindAccuracy;
  const unsafe = fair?.answered.metrics.neverPlaceViolation;
  const delta = shared ? shared.baseline.value !== null && shared.system.value !== null
    ? shared.system.value - shared.baseline.value : null : overall.paired.metrics[metric].value;
  return (
    <section className="pw-judge-panel pw-judge-accuracy" aria-labelledby="baseline-question">
      <div className="pw-judge-title">
        <h2 id="baseline-question">How does it compare to the baseline?</h2>
        {delta !== null && <strong className="pw-judge-number">{delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)} pp</strong>}
      </div>
      <p className="pw-judge-lead">Physical-area accuracy against one Hydrogen call with a prose plant description and zero rules-engine calls.</p>
      <div className="pw-judge-accuracy-grid">
        {(fair ? [true, false] : [false, true]).map((completed) => (
          <div key={String(completed)}>
            <h3>{completed ? fair ? "Both sides answered" : "Completed responses" : "All attempts"} <small>Wilson 95%</small></h3>
            {areaRows(report, completed).map(({ side, value }) => <Band key={side} side={side} value={value} />)}
          </div>
        ))}
      </div>
      <div className="pw-judge-costs" aria-label="Inference cost and latency">
        {SIDES.map((side) => {
          const { calls, latencyMs } = overall.sides[side];
          const traces = side === "system" ? report.pipelineEvidence?.requestTraces : undefined;
          const cost = traces?.shorterCounters ? `${traces.perCapture.toFixed(2)} request traces/capture` : `${calls.mean?.toFixed(2) ?? "—"} calls/capture`;
          return <span key={side}><strong>{SIDE_NAME[side]}</strong> {cost} · {time(latencyMs.p50)} p50 · {time(latencyMs.p95)} p95</span>;
        })}
      </div>
      {kind?.baseline.value != null && kind.system.value != null && unsafe && <p className="pw-judge-note">
        Equipment kind · {formatPercent(kind.baseline.value)} Hydrogen / {formatPercent(kind.system.value)} Pyre Witness.
        {" "}Forbidden placements · {unsafe.baseline.numerator}/{unsafe.baseline.n} Hydrogen / {unsafe.system.numerator}/{unsafe.system.n} Pyre Witness.
      </p>}
      {report.objectAssessment && <p className="pw-judge-note">
        {overall.sides.baseline.failures}/{overall.sides.baseline.n} {fair && report.label === "run-3" ? "fresh " : ""}baseline errors.
        {fair?.areaTest.n ? ` Exact McNemar for area placement ${exactP(fair.areaTest.p)}.` : ""}
        {" "}Safety coverage gives Pyre Witness a Filler 3 drop. The baseline prompt asks it to decline non-devices.
      </p>}
    </section>
  );
}
