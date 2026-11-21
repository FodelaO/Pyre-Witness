/** Verifies that the visible cost equations use rounded inputs and reconcile. */
import { describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { displayDowntime } from "./allocations";
import { displayLedger, displayedEventLoss } from "./displayLedger";
import { formatFormulaUsd, formatUsd, roundHours, roundUsd } from "./format";
import { estimateLoss } from "./model";
import { scenarioFromFinding } from "./scenarios";
import type { LossScenario } from "./types";

const report = evaluateTwin(SEED_TWIN);
const finding = report.findings.find(({ assetId }) => assetId === "PLC-F3")!;
const baseline = scenarioFromFinding(SEED_TWIN, finding);

describe("rounded disclosure", () => {
  it("uses a single downtime equation and shows equal fractional shares underneath", () => {
    const estimate = estimateLoss(SEED_TWIN, baseline);
    const ledger = displayLedger(estimate);
    const stopped = estimate.items.flatMap(({ roles }) =>
      roles.filter(({ key }) => key === "downtime"));
    expect(ledger.pools).toHaveLength(1);
    expect(stopped.length).toBeGreaterThan(6);
    const hrs = roundHours(stopped[0].hours!);
    const rate = roundUsd(stopped[0].rate!);
    const pool = displayDowntime(stopped[0].hours!, stopped[0].rate!, stopped[0].dependency!);
    expect(pool.amount).toBe(roundUsd(hrs * rate));
    expect(pool.formula).toBe(`${hrs} h × ${formatUsd(rate)}/h ≈ ${formatUsd(pool.amount)}`);
    expect(stopped.every((role) => role.formula === `1/${stopped.length} · ${formatUsd(role.displayAmount)}`)).toBe(true);
    expect(stopped.reduce((sum, role) => sum + role.amount, 0))
      .toBeCloseTo(estimate.components.find(({ key }) => key === "downtime")!.mean);
    expect(ledger.total).toBe(displayedEventLoss(estimate));
  });

  it("uses no formula factors with more than one decimal or a fractional percentage", () => {
    const scenarios: LossScenario[] = [
      ...report.findings.map((finding) => scenarioFromFinding(SEED_TWIN, finding)),
      ...(["device", "processStop", "productHold", "productRecall", "ammoniaRelease"] as const)
        .map((consequence) => ({ ...baseline, consequence })),
    ];
    for (const scenario of scenarios) {
      const estimate = estimateLoss(SEED_TWIN, scenario);
      const ledger = displayLedger(estimate);
      const difference = displayLedger(estimate, { before: estimate, after: estimate });
      const formulas = [
        ...estimate.items.flatMap(({ roles }) => roles),
        ...estimate.otherLines, ...ledger.pools, ...difference.other,
      ];
      for (const { formula } of formulas) {
        expect(formula).not.toMatch(/\d\.\d{2,}/);
        expect(formula).not.toMatch(/\d\.\d+\s*%/);
      }

      for (const item of estimate.items) for (const role of item.roles) {
        if (role.key === "replacement") {
          expect(role.displayAmount).toBe(roundUsd(roundUsd(item.installedReplacement) * Math.round(role.factor! * 100) / 100));
        } else if (role.key === "product") {
          expect(role.displayAmount).toBe(roundUsd(Math.round(role.quantity!) * roundUsd(role.rate!)));
        }
        expect(role.formula.endsWith(formatFormulaUsd(role.displayAmount)) || role.displayAmount === 0).toBe(true);
      }
      for (const line of estimate.otherLines) expect(line.formula.endsWith(formatFormulaUsd(line.displayAmount))).toBe(true);
      expect(ledger.total).toBe(roundUsd(
        ledger.pools.reduce((sum, pool) => sum + pool.amount, 0)
        + estimate.items.flatMap(({ roles }) => roles).reduce((sum, role) => sum
          + (role.key === "downtime" ? 0 : role.displayAmount), 0)
        + estimate.otherLines.reduce((sum, line) => sum + line.displayAmount, 0),
      ));
      expect(difference.total).toBe(0);
    }
  });
});
