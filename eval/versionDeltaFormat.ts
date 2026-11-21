/** Formats the same version deltas for the report, proof page and quoted summary. */
import { regressionHighlights, type DeltaRow, type DeltaUnit, type Measure, type VersionDelta } from "./versionDelta";

export function measureValue(value: number | null, unit: DeltaUnit): string {
  if (value === null) return "—";
  if (unit === "rate") return `${(value * 100).toFixed(1)}%`;
  if (unit === "ms") return `${Math.round(value)} ms`;
  return value.toFixed(2);
}

export function measured(value: Measure, unit: DeltaUnit) {
  return value.value === null ? "—" : `${measureValue(value.value, unit)} (n=${value.n})`;
}

export function deltaValue(value: number | null, unit: DeltaUnit) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  if (unit === "rate") {
    const points = value * 100;
    return `${sign}${points.toFixed(points !== 0 && Math.abs(points) < 0.05 ? 2 : 1)} pp`;
  }
  return `${sign}${measureValue(value, unit)}`;
}

export function regressionText(delta: VersionDelta, limit = 4) {
  return regressionHighlights(delta).slice(0, limit).map(({ row, scope }) => {
    const { before, after } = row[scope];
    const smallSample = row.unit === "rate" && Math.min(before.n, after.n) < 10;
    const sample = smallSample ? `, n=${before.n === after.n ? before.n : `${before.n}→${after.n}`}` : "";
    return `${row.label} (${measureValue(before.value, row.unit)} → ${measureValue(after.value, row.unit)}${scope === "all" ? " across all attempts" : ""}${sample})`;
  }).join(", ");
}

export function deltaRowCells(row: DeltaRow) {
  return [row.answered, row.all].flatMap(({ before, after, change }) =>
    [measured(before, row.unit), measured(after, row.unit), deltaValue(change, row.unit)]);
}

export function versionDeltaTable(delta: VersionDelta) {
  return [
    "| System metric | Run 4 common | Run 5 common | Δ common | Run 4 all | Run 5 all | Δ all |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...delta.rows.map((row) => `| ${row.label} | ${deltaRowCells(row).join(" | ")} |`),
  ];
}
