/** Shows the saved held-out comparison above the development-set results. */
import { ArrowUpRight } from "lucide-react";
import { formatPercent, MetricBar } from "./MetricBars";

type Score = { value?: number | null; numerator?: number; n?: number; interval?: readonly number[] | null };
type Metric = { key: string; baseline?: Score; system?: Score; difference?: Score };
type HeldoutResults = {
  label?: string;
  selected?: number;
  models?: { baseline?: string };
  items?: readonly { input: string }[];
  inputs?: readonly { key: string; n?: number }[];
  metrics?: readonly Metric[];
  timing?: { baseline?: Timing; system?: Timing };
};
type Timing = Partial<Record<"p50" | "p95", number | null>>;

const headlines = [
  ["riskRecall", "Key-risk recall"],
  ["deviceTypeMatch", "Device naming"],
] as const;

const rates = [
  ["ruleConsistency", "Offline rules-engine pass rate"],
  ["neverPlaceViolation", "Forbidden-area recommendations"],
  ["gateAccuracy", "Device vs non-device accuracy"],
  ["physicalAreaAccuracy", "Plant area accuracy"],
  ["purdueAccuracy", "Purdue level accuracy"],
] as const;

const times = [
  ["p50", "Median time per capture"],
  ["p95", "p95 time per capture"],
] as const;

const points = (value: number) => `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}`;

function pairedSummary(difference?: Score) {
  const [low, high] = difference?.interval ?? [];
  if (difference?.value == null || low == null || high == null) return null;
  const significant = difference.n != null && difference.n >= 2 && (low > 0 || high < 0);
  return `${points(difference.value)} pp [${points(low)}, ${points(high)}]${significant ? " · Significant" : ""}`;
}

function rateValue(value: number, score: Score) {
  const count = score.numerator != null && score.n != null ? ` (${score.numerator}/${score.n})` : "";
  return `${formatPercent(value)}${count}`;
}

export function HeldoutProof({ results }: { results: HeldoutResults }) {
  const { items, timing } = results;
  const metric = (key: string) => results.metrics?.find((entry) => entry.key === key);
  const baselineLabel = results.models?.baseline?.endsWith("-hydrogen") ? "Hydrogen" : results.models?.baseline ?? "Baseline";
  const nonDevices = results.inputs?.find(({ key }) => key === "negatives")?.n;
  const photos = items?.filter(({ input }) => input === "photo").length;
  const descriptions = items?.filter(({ input }) => input === "text").length;
  const links = items?.filter(({ input }) => input === "link").length;
  const coverage = [
    results.selected != null && `${results.selected} captures outside the development set`,
    photos != null && `${photos} Wikimedia Commons photos${nonDevices != null ? ` (${nonDevices} non-devices)` : ""}`,
    descriptions != null && `${descriptions} descriptions`,
    links != null && `${links} product links`,
    results.label,
  ].filter(Boolean).join(" · ");
  const rows: { label: string; baseline: string; system: string }[] = rates.flatMap(([key, label]) => {
    const { baseline, system } = metric(key) ?? {};
    if (baseline?.value == null || system?.value == null) return [];
    return [{ label, baseline: rateValue(baseline.value, baseline), system: rateValue(system.value, system) }];
  });
  for (const [key, label] of times) {
    const baseline = timing?.baseline?.[key];
    const system = timing?.system?.[key];
    if (baseline != null && system != null) {
      rows.push({ label, baseline: `${(baseline / 1000).toFixed(2)} s`, system: `${(system / 1000).toFixed(2)} s` });
    }
  }

  const accuracyLosses = [
    ["physicalAreaAccuracy", "plant area"],
    ["purdueAccuracy", "Purdue level"],
    ["cloudAccuracy", "cloud flags"],
  ].flatMap(([key, label]) => {
    const { baseline, system } = metric(key) ?? {};
    return baseline?.value != null && system?.value != null && baseline.value > system.value ? [label] : [];
  });
  const slower = times.some(([key]) => {
    const baseline = timing?.baseline?.[key];
    const system = timing?.system?.[key];
    return baseline != null && system != null && system > baseline;
  });
  const losses = [
    accuracyLosses.length > 0 && `scored higher on ${new Intl.ListFormat("en").format(accuracyLosses)}`,
    slower && "was faster",
  ].filter(Boolean);

  const bars = headlines.flatMap(([key, label]) => {
    const { baseline, system, difference } = metric(key) ?? {};
    if (baseline?.value == null || baseline.n == null || system?.value == null || system.n == null) return [];
    return (
      <div className="pw-proof-metric" key={key}>
        <div className="pw-proof-metric-heading"><h3>{label}</h3><span>{pairedSummary(difference)}</span></div>
        <MetricBar side="baseline" label={baselineLabel} value={{ value: baseline.value, n: baseline.n, interval: baseline.interval }} ran />
        <MetricBar side="system" value={{ value: system.value, n: system.n, interval: system.interval }} ran />
      </div>
    );
  });

  return (
    <section className="pw-proof-panel pw-proof-heldout" aria-labelledby="pw-proof-heldout-title">
      <header className="pw-proof-section-heading">
        <h2 id="pw-proof-heldout-title">Held-out test</h2>
        <a href="https://github.com/FodelaO/Pyre-Witness/blob/main/eval/heldout/REPORT.md">Full report on GitHub <ArrowUpRight size={13} aria-hidden /></a>
      </header>
      {coverage && <p className="pw-proof-heldout-note">{coverage}</p>}
      {bars.length > 0 && <>
        <div className="pw-proof-heldout-bars">{bars}</div>
        <p className="pw-proof-heldout-note">Whiskers show Wilson 95% intervals. Gains use paired bootstrap 95% intervals. Significance is exploratory.</p>
      </>}
      {rows.length > 0 && <div className="pw-proof-table-scroll">
        <table aria-label="Additional held-out metrics">
          <thead><tr><th scope="col">Metric</th><th scope="col">Single-call {baselineLabel}</th><th scope="col">Pyre Witness</th></tr></thead>
          <tbody>
            {rows.map(({ label, baseline, system }) => (
              <tr key={label}><th scope="row">{label}</th><td>{baseline}</td><td>{system}</td></tr>
            ))}
          </tbody>
        </table>
      </div>}
      {losses.length > 0 && <p className="pw-proof-heldout-note">{baselineLabel} {losses.join(" and ")} on this run.</p>}
    </section>
  );
}
