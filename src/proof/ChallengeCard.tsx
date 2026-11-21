/** Shows case pass rates and the hardest correct and missed inputs. */
import { CHALLENGE_METHOD, INPUT_NAMES } from "../../eval/benchmarkCases";
import type { CaseResult } from "../../eval/failures";
import type { EvaluationReport } from "../../eval/report";
import { formatPercent } from "./MetricBars";

function label(item: CaseResult) {
  return item.expected.deviceType ?? item.answers.system?.deviceType ?? item.labelNote?.split(". ")[0] ?? item.id;
}

function detail(item: CaseResult) {
  const answer = item.answers.system;
  if (answer?.error) return `${answer.error.stage} ${answer.error.timeout ? "timeout" : "error"}`;
  if (answer?.status === "rejected") return "Unusable capture stopped";
  return answer?.area?.replaceAll("_", " ") ?? answer?.physicalKind?.replaceAll("_", " ") ?? "No placement";
}

export function ChallengeCard({ report }: { report: EvaluationReport }) {
  const cases = new Map(report.cases.map((entry) => [entry.id, entry]));
  const { buckets, passed, missed } = report.challenges ?? { buckets: [], passed: [], missed: [] };
  return (
    <section className="pw-judge-panel pw-judge-challenge" aria-labelledby="hardest-question">
      <div className="pw-judge-title"><h2 id="hardest-question">Does it hold up on hard inputs?</h2><a className="pw-judge-link" href="#challenge-method">Criteria</a></div>
      <p className="pw-judge-lead">Passes match labeled kind and placement or handle a non-device correctly.</p>
      <div className="pw-judge-difficulty" aria-label="System pass rate by input group">
        {buckets.map(({ key, rate }) => (
          <div key={key}>
            <span>{INPUT_NAMES[key]}</span>
            <div className="pw-judge-spark" aria-hidden="true"><i style={{ width: `${(rate.value ?? 0) * 100}%` }} /></div>
            <strong title={rate.interval ? `Wilson 95% ${rate.interval.map(formatPercent).join("–")}` : undefined}>{rate.numerator}/{rate.n}</strong>
          </div>
        ))}
      </div>
      <div className="pw-judge-hard-cases" title={CHALLENGE_METHOD}>
        {[{ title: "Hardest correct", ids: passed }, { title: "Hardest misses", ids: missed }].map(({ title, ids }) => (
          <div key={title}>
            <h3>{title}</h3>
            <ul>{ids.map((id) => {
              const item = cases.get(id)!;
              const href = item.file ? `/proof/capture-image/${encodeURIComponent(id)}` : item.sourceUrl || undefined;
              const text = label(item);
              return <li key={id} title={`${text} · ${detail(item)}`}>{href ? <a href={href}>{text}</a> : text}</li>;
            })}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}
