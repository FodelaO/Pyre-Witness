/** Fixed-size card for the selected asset's location and available telemetry. */
import { memo } from "react";
import type { Asset } from "@/twin/types";
import { formatTelemetry } from "./telemetryFormat";

interface Reading {
  key: string;
  label: string;
  value: string;
  abnormal?: boolean;
}

function readingsFor(asset: Asset): Reading[] {
  const { process } = asset;
  const telemetry = process?.telemetry ?? [];
  const readings: Reading[] = telemetry.slice(0, 3).map(({ tag, label, value, unit, lo, hi }) => ({
    key: tag,
    label,
    value: formatTelemetry(value, unit),
    abnormal: (lo !== undefined && value < lo) || (hi !== undefined && value > hi),
  }));

  if (readings.length < 3 && process?.levelPct !== undefined && !telemetry.some((point) => point.unit === "%" && point.value === process.levelPct)) {
    readings.push({ key: "level", label: "Level", value: formatTelemetry(process.levelPct, "%") });
  }
  if (readings.length < 3 && process?.running !== undefined) {
    readings.push({ key: "operation", label: "Operation", value: process.running ? "Running" : "Stopped" });
  }
  return readings;
}

export default memo(function SelectionCard({ asset, area }: { asset: Asset; area: string }) {
  const readings = readingsFor(asset);
  return (
    <aside className="pw-floor-tag" aria-label="Selected equipment">
      <header className="pw-floor-tag-header">
        <span className="pw-floor-tag-id">{asset.id}</span>
        <strong>{asset.name}</strong>
      </header>
      <div className="pw-floor-tag-location"><span>{area}</span><span>Purdue L{asset.network.level}</span></div>
      {readings.length > 0 ? (
        <dl className="pw-floor-tag-readings">
          {readings.map((reading) => (
            <div key={reading.key}>
              <dt>{reading.label}</dt>
              <dd data-abnormal={reading.abnormal || undefined}>{reading.value}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="pw-floor-tag-empty">No telemetry</p>}
    </aside>
  );
});
