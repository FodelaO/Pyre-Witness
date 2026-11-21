/** Displays the common answer cohort and all attempts using the same scoring definitions. */
import { fairMetricName, type FairComparison } from "../../eval/fairComparison";
import { exactP, pairedPoints, ratio } from "../../eval/markdown";
import { METRIC_KEYS } from "../../eval/metrics";
import { SIDES } from "../../eval/types";

export function FairMetrics({ comparison: { answered, all, exact, riskDifference } }: { comparison: FairComparison }) {
  return <details className="pw-judge-details">
    <summary>Full baseline comparison · {answered.n}/{all.n} captures answered by both</summary>
    <div className="pw-proof-table-scroll">
      <table>
        <thead><tr><th>Metric</th><th>Baseline paired</th><th>Pyre Witness paired</th><th>Baseline all</th><th>Pyre Witness all</th></tr></thead>
        <tbody>
          {METRIC_KEYS.map((key) => <tr key={key}><th scope="row">{fairMetricName(key)}</th>
            {[answered, all].flatMap(({ metrics }, index) => SIDES.map((side) => <td key={`${index}-${side}`}>{ratio(metrics[key][side])}</td>))}
          </tr>)}
          <tr><th scope="row">Rules-engine revision rate</th><td>N/A</td><td>{ratio(answered.revisions)}</td><td>N/A</td><td>{ratio(all.revisions)}</td></tr>
        </tbody>
      </table>
    </div>
    <p className="pw-judge-note">Wilson 95% intervals. Rules revisions use initial checked recommendations. The baseline has no revision stage.</p>
    {exact?.length > 0 && <div className="pw-proof-table-scroll">
      <table>
        <thead><tr><th>Exact McNemar</th><th>Both answered</th><th>All attempts</th></tr></thead>
        <tbody>{exact.map(({ key, answered: shared, all: recorded }) => <tr key={key}>
          <th scope="row">{fairMetricName(key)}</th><td>{exactP(shared.p)} (n={shared.n})</td><td>{exactP(recorded.p)} (n={recorded.n})</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {riskDifference && <p className="pw-judge-note">Key-risk recall difference, Pyre Witness minus Hydrogen, with paired bootstrap 95% intervals. Both answered {pairedPoints(riskDifference.answered)}. All attempts {pairedPoints(riskDifference.all)}.</p>}
  </details>;
}
