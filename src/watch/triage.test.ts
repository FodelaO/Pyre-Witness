/** Verifies shortlist ordering, concurrent batch bounds and per-batch failure recovery. */
import { describe, expect, it } from "vitest";
import { triageCandidates } from "./triage";
import type { Candidate } from "./types";

function candidate(score: number): Candidate {
  return {
    threat: { id: `fixture-${score}`, source: "cisa-ics", title: "Fixture advisory", cves: [], published: "2026-11-21", url: "https://www.cisa.gov/", summary: "" },
    inventory: {
      assetId: "HMI-F3", vendor: "Fixture", product: "Test device", identity: "assumed", criticality: 3,
      exposure: { level: 2, zone: "Cell F3", conduit: null, protocols: [], internetFacing: false, remoteAccess: false, cloudConnected: false, radios: [] },
    },
    score, reasons: [], versionMentioned: false,
  };
}

describe("Decisions batch scheduling", () => {
  it("runs two batches of at most eight and keeps the successful batch's dispositions", async () => {
    const release = Promise.withResolvers<void>();
    const calls: number[][] = [];
    const all = [candidate(8), ...Array.from({ length: 18 }, (_, index) => candidate(index + 9))];
    const pending = triageCandidates(all, new AbortController().signal, async (batch) => {
      const scores = batch.map(({ score }) => score);
      calls.push(scores);
      await release.promise;
      if (scores.includes(26)) throw Object.assign(new Error("Fixture batch failure"), { status: 429 });
      return batch.map((item) => ({ ...item, disposition: "supported" }));
    });
    expect(calls).toEqual([[26, 25, 24, 23, 22, 21, 20, 19], [18, 17, 16, 15, 14, 13, 12, 11]]);
    release.resolve();
    const result = await pending;
    expect(result.batches).toBe(2);
    expect(result.reviewed.map(({ disposition }) => disposition)).toEqual([
      ...Array(8).fill("uncertain"), ...Array(8).fill("supported"),
    ]);
    expect(result.warnings).toEqual([expect.stringContaining("Decisions batch 1 · 8 pairs escalated as uncertain")]);
  });

  it("skips the provider when all matches fall below the evidence threshold", async () => {
    const result = await triageCandidates([candidate(6), candidate(8)], new AbortController().signal, () => {
      throw new Error("The shortlist should be empty");
    });
    expect(result).toEqual({ reviewed: [], batches: 0, warnings: [] });
  });
});
