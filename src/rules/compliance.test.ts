/** Verifies Inspector references use readable labels from the shared catalogue. */
import { COMPLIANCE } from "@/data/compliance";
import { SEED_TWIN } from "@/twin/seed";
import { describe, expect, it } from "vitest";
import { complianceReferences } from "./compliance";
import { createContext } from "./context";
import { explainRule, placementFindings, RULES } from "./registry";

describe("Inspector compliance references", () => {
  it("uses a stable, readable label for each form of catalogue citation", () => {
    expect(complianceReferences(
      "iec62443-3-3-sr-1.6", "nist-800-82r3-6.2.9", "osha-1910.119-d", "fda-21cfr117-40",
      "iec60079-14", "ehedg-doc-13", "iec60529-ip-code",
    )).toEqual([
      "IEC 62443-3-3 SR 1.6", "NIST SP 800-82 Rev. 3 Section 6.2.9", "OSHA 29 CFR 1910.119(d)",
      "FDA 21 CFR 117.40", "IEC 60079-14", "EHEDG Doc. 13", "IEC 60529",
    ]);
    expect(() => complianceReferences("unknown-clause")).toThrow("Unknown rule compliance clause");
  });

  it("attaches catalogue citations to every rule and to emitted findings", () => {
    const knownLabels = new Set(COMPLIANCE.flatMap(({ id, framework }) => [framework, ...complianceReferences(id)]));
    for (const rule of RULES) {
      expect(rule.references.length, rule.id).toBeGreaterThan(0);
      expect(new Set(rule.references).size, rule.id).toBe(rule.references.length);
      for (const reference of rule.references) expect(knownLabels.has(reference), rule.id).toBe(true);
    }

    const findings = placementFindings(createContext(SEED_TWIN));
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.references).toEqual(explainRule(finding.ruleId)?.references);
    }
  });
});
