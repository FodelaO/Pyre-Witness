/** Contrasts an actual photo with its exactly paired one-line input and scores when ready. */
import type { EvaluationReport } from "../../eval/report";
import { onlyNegativeCredentialLabels } from "../../eval/benchmarkCases";
import { ratio } from "../../eval/markdown";
import { EvidenceThumb } from "./EvidenceThumb";

export function ModalityCard({ report }: { report: EvaluationReport }) {
  const result = report.modality;
  const example = report.cases.find(({ id }) => id === "photo-011")
    ?? report.cases.find(({ file, expected }) => file && expected.deviceType);
  const material = result?.metrics.find(({ label }) => label === "Material reported");
  const headline = result?.paired && material ? `${material.photo.numerator} photo · ${material.text.numerator} text` : "Pending";
  const port = report.modalityFrom ? undefined : example?.answers.system?.ports?.[0];
  const archived = report.modalityFrom?.replace(/^run-(\d+)$/, "Run $1");
  return (
    <section className="pw-judge-panel pw-judge-modality" aria-labelledby="photo-question">
      <div>
        <div className="pw-judge-title"><h2 id="photo-question">What does a photo give us?</h2><strong className="pw-judge-number">{headline}</strong></div>
        <p className="pw-judge-lead">{result?.paired
          ? `Captures reporting material across ${result.paired}/${result.eligible} matched device photos${archived ? ` in ${archived}` : ""}. `
          : `${result?.eligible ?? "Device"} photo/text pairs planned. `}
          {result?.paired ? <a className="pw-judge-link" href="#modality-measurements">Attribute scores</a>
            : "Compare ports, ratings, evidence and the rules verdict."}</p>
      </div>
      {example && <div className="pw-judge-modality-example">
        <EvidenceThumb id={example.id} kind="photo" label={example.expected.deviceType ?? example.id} source={example.sourceUrl}
          credit={example.credit ? `${example.credit.author} · ${example.license}` : undefined} />
        <div>
          <small>One-line input</small><span>{example.expected.deviceType?.trim().replace(/\s+/g, " ")}</span>
          {port && <small>Photo reported {port}</small>}
        </div>
      </div>}
    </section>
  );
}

export function ModalityMeasurements({ report }: { report: EvaluationReport }) {
  const result = report.modality;
  if (!result?.paired) return null;
  return <details id="modality-measurements" className="pw-judge-details" open>
    <summary>Photo vs one-line description · {result.paired}/{result.eligible} pairs</summary>
    <div className="pw-proof-table-scroll">
      <table>
        <thead><tr><th>Attribute</th><th>Photo [95% CI]</th><th>One-line description [95% CI]</th></tr></thead>
        <tbody>
          {[...result.metrics, { label: "As-dropped rules verdict returned", ...result.verdictReturned }].map(({ label, photo, text }) =>
            <tr key={label}><th scope="row">{label}</th><td>{ratio(photo)}</td><td>{ratio(text)}</td></tr>)}
          <tr><th scope="row">Evidence items per capture</th>{[result.evidenceItems.photo, result.evidenceItems.text].map(({ value, interval, n }, index) =>
            <td key={index}>{value?.toFixed(2)} [{interval?.map((bound) => bound.toFixed(2)).join("–")}] (n={n})</td>)}</tr>
        </tbody>
      </table>
    </div>
    <p className="pw-judge-note">As-dropped verdict agreement {ratio(result.verdictAgreement)} on pairs with two verdicts. Materials, ratings and evidence count reported observations.
      {onlyNegativeCredentialLabels(report.cases) && " All known credential labels mark no visible defaults."}</p>
    <p className="pw-judge-note">Execution errors · {result.errors.photo} photo · {result.errors.text} text. The text arm used {result.textCalls} extra HTTP attempts.</p>
  </details>;
}
