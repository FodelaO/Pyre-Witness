/** Displays matched changes between the two labeled evaluation runs. */
import { beforeAfterRows, comparisonRows } from "../../eval/markdown";
import type { EvaluationReport } from "../../eval/report";

export function RunComparison({ comparison }: { comparison: EvaluationReport["comparison"] }) {
  return (
    <section className="pw-proof-panel pw-proof-comparison" aria-labelledby="run-comparison">
      <div className="pw-proof-section-heading">
        <h2 id="run-comparison">Run 1 vs run 2</h2>
        {comparison.state === "ready" && <span>{comparison.n} shared paired captures</span>}
      </div>
      {comparison.state === "ready" ? (
        <>
          {comparison.baselineContractChanged && <p>The one-call baseline output constraints changed between runs.</p>}
          {comparison.reasoningThinking.every(Boolean) &&
            <p>Carbon thinking · Run 1 {comparison.reasoningThinking[0]} · Run 2 {comparison.reasoningThinking[1]}</p>}
          {comparison.policyChanged && (
            <>
              <p>Run 2 uses compact prompts, an immediate as-dropped rules check, a targeted revision, and a usability gate for any object.</p>
              <div className="pw-proof-table-scroll pw-proof-before-after">
                <table>
                  <thead><tr><th scope="col">System measure</th><th scope="col">Run 1 before</th><th scope="col">Run 2</th></tr></thead>
                  <tbody>{beforeAfterRows(comparison).map(({ label, values }) => (
                    <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
          <details className="pw-proof-more" open={comparison.policyChanged ? undefined : true}>
            <summary>All matched measures</summary>
            <div className="pw-proof-table-scroll">
              <table>
                <thead><tr>
                  <th scope="col">Measure</th><th scope="col">Run 1 baseline</th><th scope="col">Run 1 Pyre Witness</th>
                  <th scope="col">Run 2 baseline</th><th scope="col">Run 2 Pyre Witness</th><th scope="col">System change (95% CI)</th>
                </tr></thead>
                <tbody>
                  {comparisonRows(comparison).map(({ label, values, change }) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {values.map((value, index) => <td key={index}>{value}</td>)}
                      <td>{change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p>{comparison.state === "pending" ? "Run 2 measurements pending." : "The runs have no shared completed pairs."}</p>}
    </section>
  );
}
