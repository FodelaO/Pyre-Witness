/**
 * Unit tests for the compliance reference catalogue (src/data/compliance.ts).
 * Verifies integrity, tag coverage, official HTTPS URLs, and lookup helpers.
 */
import { describe, expect, it } from "vitest";
import {
  COMPLIANCE,
  COMPLIANCE_TAGS,
  clauseById,
  clausesFor,
  type ComplianceTag,
} from "./compliance";

const VALID_TAGS = new Set<string>(COMPLIANCE_TAGS);
const VALID_DOMAINS = new Set(["cyber", "process_safety", "food_safety", "electrical"]);
const OFFICIAL_HOSTS = new Set([
  "www.isa.org",
  "www.iec.ch",
  "webstore.iec.ch",
  "csrc.nist.gov",
  "www.nist.gov",
  "eur-lex.europa.eu",
  "www.osha.gov",
  "www.epa.gov",
  "www.iiar.org",
  "www.cdc.gov",
  "www.nfpa.org",
  "www.iso.org",
  "www.ecfr.gov",
  "www.fda.gov",
  "www.3-a.org",
  "www.ehedg.org",
  "www.nsf.org",
]);

describe("compliance catalogue", () => {
  it("contains between 40 and 60 clauses", () => {
    expect(COMPLIANCE.length).toBeGreaterThanOrEqual(40);
    expect(COMPLIANCE.length).toBeLessThanOrEqual(60);
  });

  it("has unique, stable lowercase slug ids", () => {
    const seen = new Set<string>();
    for (const c of COMPLIANCE) {
      expect(c.id).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
      expect(seen.has(c.id)).toBe(false);
      seen.add(c.id);
    }
  });

  it("validates every clause has non-empty fields, valid domain, valid tags, and official https url", () => {
    for (const c of COMPLIANCE) {
      expect(c.framework.trim().length).toBeGreaterThan(0);
      expect(c.clause.trim().length).toBeGreaterThan(0);
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.summary.trim().length).toBeGreaterThan(15);
      expect(VALID_DOMAINS.has(c.domain)).toBe(true);
      expect(["high", "medium"]).toContain(c.confidence);

      expect(c.appliesWhen.length).toBeGreaterThanOrEqual(1);
      const uniqueTags = new Set(c.appliesWhen);
      expect(uniqueTags.size).toBe(c.appliesWhen.length);
      for (const tag of c.appliesWhen) {
        expect(VALID_TAGS.has(tag)).toBe(true);
      }

      const parsed = new URL(c.url);
      expect(parsed.protocol).toBe("https:");
      expect(OFFICIAL_HOSTS.has(parsed.hostname)).toBe(true);
    }
  });

  it("covers every ComplianceTag in the union", () => {
    for (const tag of COMPLIANCE_TAGS) {
      const matches = clausesFor([tag]);
      expect(matches.length, `expected at least one clause for tag "${tag}"`).toBeGreaterThan(0);
    }
  });

  it("clausesFor(['wireless']) returns the expected wireless clauses without duplicates", () => {
    const wireless = clausesFor(["wireless"]);
    const ids = wireless.map((c) => c.id);
    expect(ids).toContain("iec62443-3-3-sr-1.6");
    expect(ids).toContain("iec62443-3-3-sr-2.2");
    expect(ids).toContain("nist-800-82r3-6.2.9");
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of wireless) {
      expect(c.appliesWhen).toContain("wireless");
    }
  });

  it("clausesFor deduplicates when multiple tags match the same clause and handles empty input", () => {
    expect(clausesFor([])).toEqual([]);
    const combined = clausesFor(["network_segmentation", "zone_boundary"]);
    const ids = combined.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("iec62443-3-3-sr-5.1");
    expect(ids).toContain("iec62443-3-3-sr-5.2");
    expect(ids).toContain("nist-800-82r3-5.2.3");
  });

  it("clauseById finds entries case-insensitively and returns undefined for unknown ids", () => {
    const sr51 = clauseById("iec62443-3-3-sr-5.1");
    expect(sr51?.framework).toBe("IEC 62443-3-3");
    expect(sr51?.clause).toBe("SR 5.1");
    expect(clauseById("  IEC62443-3-3-SR-5.1 ")).toEqual(sr51);
    expect(clauseById("nonexistent-clause")).toBeUndefined();
  });

  it("includes key domain data points (NH3 IDLH 300 ppm, IP69 vs IP69K, NIS2 reporting)", () => {
    const nh3 = clauseById("niosh-idlh-nh3");
    expect(nh3?.summary).toContain("300 ppm");
    expect(clauseById("iec60529-ip-code")?.summary).toContain("IP69");
    expect(clauseById("iso20653-ip69k")?.framework).toBe("ISO 20653");
    expect(clauseById("eu-nis2-art-23")?.appliesWhen).toContain("incident_reporting" satisfies ComplianceTag);
  });
});
