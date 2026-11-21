/** Shows one photographed, measured example for each leading failure cause. */
import type { CaseResult, DiagnosisCategory } from "../../eval/failures";
import type { EvaluationReport } from "../../eval/report";
import { EvidenceThumb } from "./EvidenceThumb";

const human = (name: string) => name.replaceAll("_", " ");

function comparison(item: CaseResult, cause: DiagnosisCategory): { expected: string; got: string } {
  const { expected, answers: { system } } = item;
  const description = expected.deviceType ?? (expected.isDevice ? "Device identification" : "Non-device handling");
  const diagnosis = item.diagnoses.find(({ side, category }) => side === "system" && category === cause)?.detail ?? "";
  if (cause === "risk omission") {
    const missing = expected.riskTags.filter((tag) => !system?.riskTags.includes(tag)).map(human);
    const returned = system?.riskTags.slice(0, 3).map(human).join(", ");
    return { expected: missing.join(", "), got: returned || "No risk tags" };
  }
  if (cause === "perception miss" && expected.ports && diagnosis.includes("ports")) {
    return { expected: expected.ports.length ? expected.ports.join(", ") : "No ports",
      got: system?.ports?.length ? system.ports.join(", ") : "No ports reported" };
  }
  if (cause === "perception miss") return { expected: description, got: system?.deviceType ?? "No identity returned" };
  if (cause === "timeout" || cause === "gate error" || cause === "execution error" || cause === "product link retrieval") {
    const stage = system?.error?.stage ?? "Gate";
    return { expected: description, got: `${stage[0].toUpperCase()}${stage.slice(1)} ${system?.error?.timeout ? "timed out" : "failed"}` };
  }
  if (cause === "wrong zone") {
    const area = system?.area;
    const level = system?.level;
    if (area && expected.neverAreas.includes(area)) return { expected: `placement outside ${human(area)}`, got: human(area) };
    if (area && (!expected.areas.length || expected.areas.includes(area)) && expected.levels.length) {
      return { expected: `Purdue ${expected.levels.join(" or ")}`, got: level == null ? "No Purdue level" : `Purdue ${level} · ${human(area)}` };
    }
    return { expected: expected.areas.map(human).join(" or ") || "A labeled placement", got: area ? human(area) : "No placement" };
  }
  return { expected: description, got: diagnosis };
}

export function FailureHighlights({ report }: { report: EvaluationReport }) {
  const cases = new Map(report.cases.map((item) => [item.id, item]));
  return (
    <section className="pw-judge-panel pw-judge-failures" aria-labelledby="failures-question">
      <div className="pw-judge-title"><h2 id="failures-question">Where does it still fail?</h2><a className="pw-judge-link" href="#failure-gallery">All cases</a></div>
      <ul className="pw-judge-failure-list">
        {(report.leadingFailures ?? []).map(({ cause, n, id }) => {
          const item = cases.get(id)!;
          const { expected, got } = comparison(item, cause);
          return (
            <li key={cause}>
              <EvidenceThumb id={id} kind={item.file ? "photo" : item.group === "links" ? "link" : "text"}
                label={item.expected.deviceType ?? id} source={item.sourceUrl}
                credit={item.credit ? `${item.credit.author} · ${item.license}` : undefined} />
              <div>
                <strong>{human(cause)} <em>{n}</em></strong>
                <p title={`Expected ${expected} · Got ${got}`}>Expected {expected} · Got {got}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
