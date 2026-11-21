/** Shows version regressions upfront and keeps the full matched comparison inspectable. */
import { FOCUS_METRICS, regressionHighlights, type VersionDelta } from "../../eval/versionDelta";
import { deltaRowCells, measureValue, regressionText } from "../../eval/versionDeltaFormat";

export function VersionDeltaNotice({ delta }: { delta: VersionDelta }) {
  const regressions = regressionText(delta, 2);
  const highlighted = new Set(regressionHighlights(delta).slice(0, 2).map(({ row }) => row.key));
  const focus = delta.rows.filter(({ key }) => (key === "radiosRecall" || key === "cloudAccuracy") && !highlighted.has(key))
    .map(({ label, answered: { before, after } }) => `${label} ${measureValue(before.value, "rate")} → ${measureValue(after.value, "rate")}`);
  return <p className="pw-proof-version-notice">
    <a className="pw-judge-link" href="#run-4-vs-run-5">Run 4 → Run 5</a>
    {regressions && <span><strong>Regressions</strong> · {regressions}</span>}
    {focus.length > 0 && <span>{focus.join(" · ")}</span>}
  </p>;
}

export function VersionDeltaTable({ delta }: { delta: VersionDelta }) {
  const focus = FOCUS_METRICS.flatMap((key) => delta.rows.filter((row) => row.key === key));
  const rest = delta.rows.filter((row) => !focus.includes(row));
  return <details id="run-4-vs-run-5" className="pw-judge-details">
    <summary>Run 4 vs Run 5 · {delta.n.answered} common answered captures</summary>
    <div className="pw-proof-table-scroll">
      <table>
        <thead>
          <tr><th rowSpan={2}>System metric</th><th colSpan={3}>Common answers</th><th colSpan={3}>All {delta.n.all} attempts</th></tr>
          <tr>{["common", "all"].flatMap((scope) => [<th key={`${scope}-4`}>Run 4</th>, <th key={`${scope}-5`}>Run 5</th>, <th key={`${scope}-change`}>Δ</th>])}</tr>
        </thead>
        <tbody>{[...focus, ...rest].map((row) => <tr key={row.key}>
          <th scope="row">{row.label}</th>{deltaRowCells(row).map((value, index) => <td key={index}>{value}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="pw-judge-note">Common answers use the same captures for both versions and Hydrogen. Run 4 used six workers and Run 5 used four.</p>
  </details>;
}
