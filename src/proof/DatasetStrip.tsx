/** Introduces the benchmark with actual photo, text, and product-link samples. */
import { INPUT_NAMES } from "../../eval/benchmarkCases";
import type { EvaluationReport } from "../../eval/report";
import { EvidenceThumb } from "./EvidenceThumb";

export function DatasetStrip({ report }: { report: EvaluationReport }) {
  const samples = report.inputs ?? [];
  const numPhotos = samples.filter(({ key }) => key !== "links" && key !== "text").reduce((sum, { n }) => sum + n, 0);
  return (
    <section className="pw-judge-panel pw-judge-dataset" aria-labelledby="dataset-question">
      <div className="pw-judge-title"><h2 id="dataset-question">Does the test set reflect real use?</h2><strong className="pw-judge-number">{report.dataset.available} inputs</strong></div>
      <div className="pw-judge-samples">
        {samples.map(({ key, n, example }) => (
          <div key={key} className="pw-judge-sample">
            {example && <EvidenceThumb id={example.id} kind={example.kind} label={example.label} text={example.text}
              source={example.sourceUrl} credit={example.credit ? `${example.credit.author} · ${example.license}` : undefined} />}
            <span>{INPUT_NAMES[key]} <strong>{n}</strong></span>
          </div>
        ))}
      </div>
      <p className="pw-judge-note">{numPhotos || "The"} Wikimedia Commons photos were taken by other people and selected without staging. <a href="/proof/sources">Credits and licences</a></p>
    </section>
  );
}
