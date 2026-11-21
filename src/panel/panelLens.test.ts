/** Verifies that physical, digital and mixed evidence stay reachable in the results rail. */
import { describe, expect, it } from "vitest";
import type { RuleFinding } from "@/twin/types";
import { showsCompliance, showsRisk } from "./panelLens";

const finding: RuleFinding = {
  assetId: "PLC-F3", ruleId: "example", kind: "compliance", severity: 3,
  title: "Placement conditions", detail: "Check the references", references: [],
};

describe("results lens", () => {
  it("uses a rule's kind before its compliance citations", () => {
    const cyber = { ...finding, kind: "cyber" as const, references: ["OSHA 29 CFR 1910.119"] };
    expect(showsRisk("material", cyber)).toBe(false);
    expect(showsRisk("data", cyber)).toBe(true);
    expect(showsRisk("both", cyber)).toBe(true);
  });

  it("keeps mixed and unclassified compliance visible", () => {
    for (const references of [[], ["IEC 62443-3-3 SR 5.1", "FDA 21 CFR Part 117"]]) {
      expect(showsRisk("material", { ...finding, references })).toBe(true);
      expect(showsRisk("data", { ...finding, references })).toBe(true);
    }
  });

  it("recognizes the catalogue's physical framework and digital edition variants", () => {
    const item = { status: "gap" as const, note: "", clause: "§117.40", framework: "FDA 21 CFR 117" };
    expect(showsCompliance("material", item)).toBe(true);
    expect(showsCompliance("data", item)).toBe(false);
    const digital = { ...item, clause: "Section 5.2.3", framework: "NIST SP 800-82r3" };
    expect(showsCompliance("material", digital)).toBe(false);
    expect(showsCompliance("data", digital)).toBe(true);
  });
});
