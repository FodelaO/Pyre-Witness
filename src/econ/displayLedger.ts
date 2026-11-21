/** Presents rounded arithmetic while keeping the underlying FAIR estimates at full precision. */
import { displayDowntime, type AssetLossAllocation } from "./allocations";
import { formatFormulaUsd, roundUsd } from "./format";
import type { LossEstimate, LossOtherLine } from "./types";

export interface LossDifference {
  before: LossEstimate | undefined;
  after: LossEstimate | undefined;
}

interface Formula {
  label: string;
  formula: string;
  shareOnly: boolean;
}

interface ItemRow {
  item: AssetLossAllocation;
  amount: number;
  stopped: boolean;
  formulas: Formula[];
}

interface DisplayPool {
  label: string;
  formula: string;
  amount: number;
}

function eventPools(estimate?: LossEstimate): DisplayPool[] {
  const role = estimate?.items.flatMap(({ roles }) => roles)
    .find(({ key, shareCount }) => key === "downtime" && shareCount);
  if (!role || role.hours === undefined || role.rate === undefined || role.dependency === undefined) return [];
  return [displayDowntime(role.hours, role.rate, role.dependency)];
}

export function displayedEventLoss(estimate?: LossEstimate): number {
  if (!estimate) return 0;
  const pool = eventPools(estimate)[0]?.amount ?? 0;
  const assets = estimate.items.reduce((total, item) => total + item.roles.reduce((subtotal, role) =>
    subtotal + (role.key === "downtime" ? 0 : role.displayAmount), 0), 0);
  const other = estimate.otherLines.reduce((sum, line) => sum + line.displayAmount, 0);
  return roundUsd(pool + assets + other);
}

function itemRows(estimate: LossEstimate, difference?: LossDifference): ItemRow[] {
  const rows = new Map<string, ItemRow>();
  const cases = difference
    ? [["As dropped", difference.before, -1], ["Recommended", difference.after, 1]] as const
    : [["", estimate, 1]] as const;
  for (const [placement, basis, sign] of cases) {
    for (const item of basis?.items ?? []) {
      const row = rows.get(item.asset.id) ?? { item, amount: 0, stopped: false, formulas: [] };
      for (const role of item.roles) {
        const stopped = role.key === "downtime";
        row.stopped ||= stopped;
        row.amount += sign * role.displayAmount;
        row.formulas.push({
          label: placement ? `${placement}${stopped ? "" : ` · ${role.label}`}` : role.label,
          formula: role.formula,
          shareOnly: !placement && stopped && Boolean(role.shareCount),
        });
      }
      rows.set(item.asset.id, row);
    }
  }
  return [...rows.values()].sort((a, b) =>
    Number(b.stopped) - Number(a.stopped) || Math.abs(b.amount) - Math.abs(a.amount));
}

function otherRows(estimate: LossEstimate, difference?: LossDifference): LossOtherLine[] {
  if (!difference) return estimate.otherLines;
  return (["recovery", "regulatory"] as const).flatMap((key) => {
    const before = difference.before?.otherLines.find((line) => line.key === key);
    const after = difference.after?.otherLines.find((line) => line.key === key);
    const label = after?.label ?? before?.label;
    if (!label) return [];
    const dropped = before?.displayAmount ?? 0;
    const recommended = after?.displayAmount ?? 0;
    const displayAmount = roundUsd(recommended - dropped);
    return [{
      key, label, amount: (after?.amount ?? 0) - (before?.amount ?? 0), displayAmount,
      formula: `${formatFormulaUsd(recommended)} recommended − ${formatFormulaUsd(dropped)} as dropped ≈ ${formatFormulaUsd(displayAmount)}`,
    }];
  });
}

export function displayLedger(estimate: LossEstimate, difference?: LossDifference) {
  const rows = itemRows(estimate, difference);
  const other = otherRows(estimate, difference);
  const pools = difference
    ? [...eventPools(difference.before).map((pool) => ({ ...pool, label: `As dropped · ${pool.label}` })),
      ...eventPools(difference.after).map((pool) => ({ ...pool, label: `Recommended · ${pool.label}` }))]
    : eventPools(estimate);
  const total = difference
    ? displayedEventLoss(difference.after) - displayedEventLoss(difference.before)
    : displayedEventLoss(estimate);
  return { rows, other, pools, total };
}
