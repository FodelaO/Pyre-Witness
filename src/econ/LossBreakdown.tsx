/** Itemizes the asset losses, response costs, and route behind one economic estimate. */
import { ArrowRight, ChevronDown } from "lucide-react";
import type { displayLedger, LossDifference } from "./displayLedger";
import { formatFormulaUsd, formatUsd, METHOD_FOOTER, roundHours } from "./format";
import { LossGlyph } from "./LossGlyph";
import type { LossAssumption, LossEstimate } from "./types";
import styles from "./LossFigure.module.css";

type ItemRow = ReturnType<typeof displayLedger>["rows"][number];

function AssetItem({ row, amount }: { row: ItemRow; amount: number }) {
  const { asset, origin, installedReplacement } = row.item;
  const shareOnly = row.formulas.length === 1 && row.formulas[0].shareOnly;
  return (
    <li className={styles.item} data-loss-item={asset.id} data-loss-contribution={amount}>
      <LossGlyph kind={asset.kind} size={32} />
      <div className={styles.itemBody}>
        <div className={styles.itemTitle}><strong>{asset.tag}</strong> · {asset.name}</div>
        <div className={styles.method}>{formatUsd(installedReplacement)} installed{origin && " · origin"}</div>
        {!shareOnly && row.formulas.map(({ label, formula, shareOnly }, index) => (
          <div className={styles.formula} key={index}>{!shareOnly && <><span>{label}</span> · </>}{formula}</div>
        ))}
      </div>
      <strong className={styles.itemAmount}>{shareOnly ? <>
        <span data-loss-line-share-amount>{row.formulas[0].formula}</span>
        <span className={styles.shareLabel} data-loss-line-share-label title={row.formulas[0].formula}>Line share</span>
      </> : formatFormulaUsd(amount)}</strong>
    </li>
  );
}

function eventRate(count: number) {
  return count > 0 && count < 0.1 ? "<0.1" : roundHours(count).toString();
}

/** Rare events read as a return period. */
function yearly(count: number) {
  if (count <= 0) return "0/yr";
  return count >= 1 ? `${roundHours(count)}/yr` : `1 in ${roundHours(1 / count)} yr`;
}

function percent(fraction: number) {
  return fraction > 0 && fraction < 0.005 ? "<1%" : `${Math.round(fraction * 100)}%`;
}

function Frequency({ estimate }: { estimate: LossEstimate }) {
  const { frequency } = estimate;
  const tef = Number(frequency.tef.toPrecision(3));
  const vulnerability = Number((frequency.vulnerability * 100).toPrecision(3));
  const lef = tef * vulnerability / 100;
  const path = frequency.path;
  const caption = path.basis === "rules" ? "Rules engine path" : path.basis === "internal" ? "Internal access" : "Modeled contact";
  return (
    <div className={styles.frequencyBlock}>
      <div className={styles.method}>{caption}</div>
      <ol className={styles.route} aria-label={caption}>
        <li>{path.entryLabel}</li>
        {path.assets.map((asset, index) => (
          <li key={`${asset.id}:${index}`} title={asset.name}>
            <ArrowRight size={12} aria-hidden="true" />
            <LossGlyph kind={asset.kind} size={23} />
            <span>{asset.tag}</span>
          </li>
        ))}
      </ol>
      <div className={styles.frequency}>
        TEF {tef}/yr × Vuln {vulnerability}% ≈ {yearly(lef)}
      </div>
      <div className={styles.method}>{frequency.drivers.join(" · ")}</div>
    </div>
  );
}

function assumptionText({ value, unit }: LossAssumption): string {
  if (typeof value === "string") return value;
  const values = typeof value === "number" ? [value] : value;
  if (/fraction|multiplier|probability/.test(unit)) return values.map(percent).join(" / ");
  if (unit.startsWith("USD")) {
    const suffix = unit.slice(3);
    return `${values.map(formatFormulaUsd).join(" / ")}${suffix}`;
  }
  if (unit === "events/yr") return `${values.map(eventRate).join(" / ")} ${unit}`;
  return `${values.map((number) => roundHours(number).toLocaleString("en-US")).join(" / ")} ${unit}`;
}

function assetContributions(estimate: LossEstimate, difference?: LossDifference) {
  const cases = difference ? [[difference.before, -1], [difference.after, 1]] as const : [[estimate, 1]] as const;
  const amounts = new Map<string, number>();
  for (const [basis, sign] of cases) {
    for (const { asset, roles } of basis?.items ?? []) {
      // Downtime shares are already included in the line-wide pool.
      const amount = roles.reduce((sum, role) => role.key === "downtime" ? sum : sum + role.displayAmount, 0);
      amounts.set(asset.id, (amounts.get(asset.id) ?? 0) + sign * amount);
    }
  }
  return amounts;
}

export function LossBreakdown({ estimate, difference, comparison, ledger }: {
  estimate: LossEstimate;
  ledger: ReturnType<typeof displayLedger>;
  difference?: LossDifference;
  comparison?: readonly { label: string; amount: number }[];
}) {
  const { rows, other, pools, total } = ledger;
  const originRows = pools.length ? rows.filter(({ item, stopped }) => item.origin && !stopped) : [];
  const groupedRows = rows.filter((row) => !originRows.includes(row));
  const visibleGroupRows = 6 - originRows.length;
  const remainingRows = groupedRows.slice(visibleGroupRows);
  const amounts = assetContributions(estimate, difference);
  const contribution = (row: ItemRow) => amounts.get(row.item.asset.id) ?? 0;
  const remainingAmount = remainingRows.reduce((sum, row) => sum + contribution(row), 0);
  const renderRow = (row: ItemRow) => <AssetItem row={row} amount={contribution(row)} key={row.item.asset.id} />;
  const involved = rows.reduce((total, { item }) => total + item.installedReplacement, 0);
  const { asset, assetValue, p10, p50, p90, annualised, assumptions, primaryLoss, secondaryLoss } = estimate;
  const tick = p90 === p10 ? 50 : 100 * (p50 - p10) / (p90 - p10);
  const rangeLabel = difference ? (difference.before ? "As-dropped event range" : "Recommended event range") : undefined;

  return (
    <div className={styles.calculation}>
      <div className={styles.moneyRow} data-loss-involved><span>Assets involved · {rows.length}</span><span>Installed value <strong>{formatUsd(involved)}</strong></span></div>
      {originRows.length > 0 && <ul className={styles.items} aria-label="Originating assets">
        {originRows.map(renderRow)}
      </ul>}
      {pools.map(({ label, formula }) => (
        <div key={label} className={styles.pool} data-loss-downtime><strong>{label}</strong> · <span className={styles.formula}>{formula}</span></div>
      ))}
      <ul className={styles.items} aria-label="Asset losses">
        {groupedRows.slice(0, visibleGroupRows).map(renderRow)}
      </ul>
      {remainingRows.length > 0 && (
        <details className={styles.remaining}>
          <summary><span>+{remainingRows.length} more<span className={styles.remainingAmount}> · {formatFormulaUsd(remainingAmount)}</span></span><ChevronDown size={13} aria-hidden="true" /></summary>
          <ul className={styles.items}>
            {remainingRows.map(renderRow)}
          </ul>
        </details>
      )}
      {other.map(({ key, label, formula, displayAmount }) => (
        <div key={key} className={styles.nonAsset} data-loss-other={key} data-loss-contribution={displayAmount}>
          <div className={styles.moneyRow}><span>{label}</span><strong>{formatFormulaUsd(displayAmount)}</strong></div>
          <div className={styles.formula}>{formula}</div>
        </div>
      ))}
      {rangeLabel && <div className={styles.method}>Frequency and range · {rangeLabel}</div>}
      <Frequency estimate={estimate} />
      {comparison?.map(({ label, amount }) => (
        <div className={styles.moneyRow} key={label}><span>{label}</span><strong>{formatUsd(amount)}</strong></div>
      ))}
      <div className={styles.total} data-loss-total>
        <span>{difference ? "Total placement change" : "Total single-event loss"}</span><strong>{formatUsd(total)} est.</strong>
      </div>
      <div className={styles.range} aria-hidden="true"><span style={{ left: `${tick}%` }} /></div>
      <div className={styles.percentiles}>
        <span>P10 {formatUsd(p10)}</span><span>P50 {formatUsd(p50)}</span><span>P90 {formatUsd(p90)}</span>
      </div>
      {!difference && secondaryLoss > 0 && (
        <div className={styles.moneyRow} data-loss-split>
          <span>Primary · secondary loss</span><strong>{formatUsd(primaryLoss)} · {formatUsd(secondaryLoss)}</strong>
        </div>
      )}
      <div className={styles.moneyRow}><span>Annualized loss (ALE)</span><strong>{formatUsd(annualised)} / yr</strong></div>
      <div className={styles.moneyRow}><span>{asset.tag} line dependency</span><strong>{Math.round(assetValue.dependency * 100)}%</strong></div>
      <div className={styles.moneyRow}><span>Line throughput value</span><strong>{formatUsd(assetValue.throughputPerHour)} / hr</strong></div>
      <div className={styles.assumptionHeading}>Method and inputs</div>
      <div className={styles.method} data-loss-method>{METHOD_FOOTER}</div>
      <dl className={styles.assumptions}>
        {assumptions.map((input, index) => (
          <div key={`${input.label}:${index}`}>
            <dt>{input.label}</dt>
            <dd>{assumptionText(input)}<small>{input.source ? <a href={input.source} target="_blank" rel="noreferrer">{input.basis}</a> : input.basis}</small></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
