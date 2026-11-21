/** Verifies partial recovery from sandbox report fixtures and safe effect validation. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { managedArtifactSchema, parseManagedArtifact } from "./managedArtifact";

describe("managed watch report extraction", () => {
  const threatId = "cisa-ics:fixture";

  it("keeps usable rows when a fenced report has incomplete feeds and malformed rows", () => {
    const file = {
      headline: "Fixture report",
      items: [{ threatId, affectedAssetIds: ["HMI-F3"] }, { affectedAssetIds: [] }],
      recommendations: [
        { threatId, title: "Lock the port", effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "port-lock" }] },
        { threatId, title: "Unsupported change", effects: [{ type: "remove_asset", assetId: "HMI-F3" }] },
      ],
      feedResults: [{ source: "cisa-kev", status: "fetched", count: 4 }, { source: "cisa-ics", status: "failed" }, { source: "unknown" }],
    };
    const result = parseManagedArtifact(`Created the artifact.\n\n\`\`\`json\n${JSON.stringify(file)}\n\`\`\`\n`);
    expect(result.partial).toBe(true);
    expect(result.feedResults).toMatchObject([{ source: "cisa-kev", count: 4 }, { source: "cisa-ics", status: "failed" }]);
    expect(result.draft.items).toEqual([{
      threatId, affectedAssetIds: ["HMI-F3"], techniqueId: null, riskDelta: null, why: "Reason unavailable in the managed report.",
    }]);
    expect(result.draft.recommendations).toMatchObject([{ title: "Lock the port", kind: "physical" }]);
    expect(result.warnings.join(" ")).toMatch(/CISA ICS, NCSC news.*Omitted 3/);
  });

  it("extracts JSON embedded in prose with quoted braces and handles complete coverage", () => {
    const file = {
      headline: 'Fixture contains a quoted "}"', items: [], recommendations: [],
      feedResults: ["cisa-kev", "cisa-ics", "ncsc-news"].map((source) => ({ source, status: "fetched", count: 0 })),
    };
    const result = parseManagedArtifact(`Saved {report}. ${JSON.stringify(file)} Finished.`);
    expect(result.partial).toBe(false);
    expect(result.draft.headline).toBe(file.headline);
    expect(result.warnings).toEqual([]);
  });

  it("accepts an empty feed list or absent fields and still rejects unrecognized content", () => {
    expect(parseManagedArtifact('{"feedResults": []}')).toMatchObject({ partial: true, feedResults: [], draft: { items: [], recommendations: [] } });
    expect(parseManagedArtifact('{"headline": "Review pending"}')).toMatchObject({ partial: true, feedResults: [] });
    expect(() => parseManagedArtifact("No JSON here")).toThrow("no recognizable JSON object");
    expect(z.toJSONSchema(managedArtifactSchema, { target: "draft-07", io: "input" }).required ?? []).toEqual([]);
  });
});
