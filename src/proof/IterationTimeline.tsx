/** Connects each measured run to the change that preceded it. */
import type { EvaluationReport, RunMilestone } from "../../eval/report";
import { formatPercent } from "./MetricBars";

const steps = [
  { label: "run-1", name: "Run 1", change: "Full plant context before rules." },
  { label: "run-2", name: "Run 2", change: "Compact prompts, Carbon low, early rules, targeted revision." },
  { label: "run-3", name: "Run 3", change: "Isolated gate failures and retries with backoff." },
  { label: "run-3-baseline", name: "Fair baseline", change: "Same Hydrogen prompt. Corrected local length scoring." },
  { label: "run-4", name: "Run 4", change: "Function-first kind guide. Final risks include rules and Scout evidence." },
  { label: "run-5", name: "Run 5", change: "Scout verifies connectivity evidence. Merged risks sort before the cap." },
] as const;

const compactHistory: Partial<Record<(typeof steps)[number]["label"], string>> = {
  "run-1": "Full plant context before rules.",
  "run-2": "Early rules and shorter prompts.",
  "run-3": "Gate failure isolation and backoff.",
  "run-4": "Function-first kind guide and merged risk list.",
};

function headline(run?: RunMilestone) {
  if (!run?.paired || run.latencyMs.p50 === null) return "Pending";
  return `${(run.latencyMs.p50 / 1_000).toFixed(run.label === "run-1" ? 0 : 1)}s p50`;
}

function outcome(run: RunMilestone) {
  if (run.label === "run-1") return `${run.timeouts}/${run.paired} timeouts · ${run.placements} placements`;
  const gate = run.gateFallbacks ? `${run.gateFallbacks} gate fallbacks` : `${run.gateFailures} at gate`;
  return `${run.placements} placements · ${run.failures}/${run.paired} errors · ${gate}`;
}

export function IterationTimeline({ report }: { report: EvaluationReport }) {
  const measurements = new Map(report.timeline?.map((run) => [run.label, run]));
  const fair = report.fairComparison;
  const historical = fair?.historical;
  const compact = Boolean(report.versionDelta);
  const visibleSteps = report.label === "run-5" ? steps : steps.filter(({ label }) => label !== "run-5");
  const audit = report.scoringAudit?.metrics;
  const sharedTransition = (key: "physicalKindAccuracy" | "riskRecall", latest: number) => {
    const before = audit?.find((metric) => metric.key === key)?.rescored.answered.value;
    return `${before == null ? "" : `${formatPercent(before)} → `}${formatPercent(latest)}`;
  };
  return (
    <section className="pw-judge-panel pw-judge-timeline" aria-labelledby="changes-question">
      <div className="pw-judge-title"><h2 id="changes-question">Where did it break and what changed?</h2></div>
      <ol>
        {visibleSteps.map(({ label, name, change }) => {
          if (label === "run-3-baseline") return <li key={label} className={fair ? undefined : "pending"}>
            <div><strong>{name}</strong><b>{fair?.baselineAttempts ? `${fair.baselineAnswers}/${fair.baselineAttempts} answered` : "Pending"}</b></div>
            <p>{change}</p>
          </li>;
          const run = measurements.get(label);
          const scores = label === "run-4" && report.label === "run-4" && run?.paired && fair?.answered.metrics;
          const short = compact ? compactHistory[label] : undefined;
          if (short && run?.paired) return <li key={label}>
            <div><strong>{name}</strong><b>{headline(run)}</b></div>
            <p>{short} {label === "run-1" ? `${run.timeouts}/${run.paired} timeouts.` : `${run.failures}/${run.paired} errors.`}</p>
          </li>;
          return (
            <li key={label} className={run?.paired ? undefined : "pending"}>
              <div><strong>{name}</strong><b>{headline(run)}</b></div>
              <p>{change}</p>
              {run?.paired && <small>{outcome(run)}</small>}
              {scores && scores.physicalKindAccuracy.system.value !== null && scores.riskRecall.system.value !== null && <small>
                Shared answers · kind {sharedTransition("physicalKindAccuracy", scores.physicalKindAccuracy.system.value)} · risk recall {sharedTransition("riskRecall", scores.riskRecall.system.value)}
              </small>}
            </li>
          );
        })}
      </ol>
      {historical?.n ? <p className="pw-judge-note">
        Earlier baseline under load{historical.area.value === null ? "" : ` · ${formatPercent(historical.area.value)} area accuracy`}
        {` · ${historical.failures}/${historical.n} errors (${historical.lengthOnly} from local length caps).`}
      </p> : null}
    </section>
  );
}
