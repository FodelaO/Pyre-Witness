/** Verifies relevance, plant mapping, and the provenance of model-reviewed matches. */
import { SEED_TWIN } from "@/twin/seed";
import { describe, expect, it } from "vitest";
import { inventoryForTwin } from "./inventory";
import type { BeverageRecall, LiveItem } from "./liveTypes";
import { matchThreats } from "./match";
import { itemAge, rankWatchItems } from "./relevance";
import type { ThreatItem } from "./types";
import { estimateWatchLoss } from "./watchLoss";

const now = Date.parse("2026-11-21T18:00:00Z");
const advisory: ThreatItem = {
  id: "ICSA-26-325-01", source: "cisa-ics", title: "Siemens SIMATIC S7-1500 advisory", cves: ["CVE-2099-1061"],
  published: "2026-11-21T16:00:00Z", summary: "Industrial control software. Versions before v3.1.4. CVSS v3.1 base score: 9.8.",
  url: "https://www.cisa.gov/",
};
const news: ThreatItem = {
  ...advisory, id: "general-news", source: "ncsc-news", title: "Why threat hunting matters to boards", cves: [], summary: "General guidance for board members.",
};
const recall: BeverageRecall = {
  id: "test-recall", source: "openfda", firm: "Test publisher", title: "Bottled beverage", cves: [],
  published: "2026-11-15T00:00:00.000Z", summary: "Foreign material found in a batch.", url: "https://api.fda.gov/food/enforcement.json",
};

describe("plant watch relevance", () => {
  it("orders plant matches first and credits inventory, range, CVSS, KEV and age", () => {
    const kev: LiveItem = { ...news, id: advisory.cves[0], source: "cisa-kev", cves: advisory.cves };
    const rows = rankWatchItems([news, recall, kev, advisory], SEED_TWIN, now);
    expect(rows.map(({ item }) => item.id)).toEqual([advisory.id, recall.id, kev.id, news.id]);
    expect(rows[0]).toMatchObject({ assetIds: ["PLC-BL"], age: "2 h ago", knownExploited: true, cvss: 9.8 });
    expect(rows[0].reasons).toEqual(["PLC-BL · SIMATIC S7-1500", "Version within cited range", "KEV", "CVSS 9.8", "OT / ICS"]);
    expect(rows[1]).toMatchObject({ assetIds: ["VIS-F3", "FIL-3"], reasons: ["Foreign material", "Food & beverage"] });
    expect(rows[3].assetIds).toEqual([]);
  });

  it("does not assign an OT article to a device on a vendor name alone", () => {
    const [row] = rankWatchItems([{ ...news, title: "Siemens industrial automation update" }], SEED_TWIN, now);
    expect(row.assetIds).toEqual([]);
    expect(row.reasons).toContain("OT / ICS");
  });

  it("uses an added asset's modeled vendor, product and firmware", () => {
    const template = SEED_TWIN.assets.find(({ id }) => id === "PLC-BL")!;
    const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, {
      ...template, id: "PLC-DEMO", origin: "added" as const,
      cyber: { ...template.cyber!, vendor: "Test Controls", model: "Test PLC X20", firmware: "2.1.4" },
    }] };
    const item = { ...advisory, title: "Test Controls Test PLC X20", summary: "Firmware 2.1.4 is cited. CVSS v3.1 information." };
    const [row] = rankWatchItems([item], twin, now);
    expect(row.assetIds).toEqual(["PLC-DEMO"]);
    expect(row.reasons).toContain("Version cited");
    expect(row.cvss).toBeUndefined();
  });

  it("uses named cyber inventory on a simulated seed asset when available", () => {
    const twin = { ...SEED_TWIN, assets: SEED_TWIN.assets.map((asset) => asset.id === "PLC-BL" ? {
      ...asset, cyber: { ...asset.cyber!, vendor: "Siemens", model: "SIMATIC S7-1500", firmware: "3.1.9" },
    } : asset) };
    const [row] = rankWatchItems([advisory], twin, now);
    expect(row.assetIds).toEqual(["PLC-BL"]);
    expect(row.reasons).not.toContain("Version within cited range");
  });

  it("credits security relevance factors independently and keeps missing versions uncertain", () => {
    const old = { ...advisory, id: "older", published: "2026-11-15T00:00:00Z", summary: "CVSS 3.1." };
    const newItem = { ...old, id: "newer", published: advisory.published, summary: "CVSS 3.1. For use in food & beverage." };
    const rows = rankWatchItems([old, newItem], SEED_TWIN, now);
    expect(rows[0].item.id).toBe("newer");
    expect(rows[0].reasons).toContain("Food & beverage");
    expect(rows[0].cvss).toBeUndefined();
    expect(rows[0].score).toBeGreaterThan(rows[1].score);
    expect(itemAge("unknown", now)).toBe("Date unavailable");
  });

  it("labels Decisions only with actual answers and keeps excluded matches in the remainder", () => {
    const [candidate] = matchThreats([advisory], inventoryForTwin(SEED_TWIN));
    const [fallback] = rankWatchItems([advisory], SEED_TWIN, now, [{ ...candidate, disposition: "uncertain" }]);
    expect(fallback.triage).toBeUndefined();
    const [excluded] = rankWatchItems([advisory], SEED_TWIN, now, [{
      ...candidate, disposition: "excluded", decisions: { applicability: 0, exposure: 0, severity: 0 },
    }]);
    expect(excluded).toMatchObject({ assetIds: [], triage: "excluded" });
  });

  it.each([
    ["There may be glass fragments", ["VIS-F3", "FIL-3"]],
    ["Milk is an undeclared allergen", ["LBL-3"]],
    ["Product was not processed to achieve pathogen reduction", ["FIL-3", "PLC-BL"]],
    ["Chemical contamination from cleaning solution", ["TK-311", "CT-210"]],
    ["Quality issue under investigation", []],
  ] as const)("links a recall based on its stated reason: %s", (summary, expected) => {
    const [row] = rankWatchItems([{ ...recall, summary }], SEED_TWIN, now);
    expect(row.assetIds).toEqual(expected);
  });

  it("drops a removed asset from a recall's mappings", () => {
    const twin = { ...SEED_TWIN, assets: SEED_TWIN.assets.filter(({ id }) => id !== "VIS-F3") };
    expect(rankWatchItems([recall], twin, now)[0].assetIds).toEqual(["FIL-3"]);
  });

  it("prices a comparable recall as one loss event and leaves unrelated news unpriced", () => {
    const [matched, unrelated] = rankWatchItems([news, recall], SEED_TWIN, now);
    const loss = estimateWatchLoss(SEED_TWIN, matched);
    expect(loss).toMatchObject({ consequence: "productRecall", asset: { id: "VIS-F3" } });
    expect(loss?.lossIfManifests).toBeGreaterThan(0);
    expect(loss?.components.find(({ key }) => key === "product")?.mean).toBeGreaterThan(0);
    expect(estimateWatchLoss(SEED_TWIN, unrelated)).toBeUndefined();
  });
});
