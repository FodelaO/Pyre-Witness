/** Verifies the assumed inventory join and pure advisory matching. */
import { SEED_TWIN } from "@/twin/seed";
import { describe, expect, it } from "vitest";
import { ASSUMED_BOM, inventoryForTwin } from "./inventory";
import { matchThreats } from "./match";
import type { ThreatItem } from "./types";

const forti: ThreatItem = {
  id: "CVE-2099-1234", source: "cisa-kev", title: "Fortinet FortiOS advisory", vendor: "Fortinet", product: "FortiOS",
  cves: ["CVE-2099-1234"], published: "2026-11-20T00:00:00.000Z", url: "https://www.cisa.gov/",
  summary: "Review v7.2.9 for remote IKEv2 exposure.",
};

describe("watch matcher", () => {
  const inventory = inventoryForTwin(SEED_TWIN);

  it("binds each assumed component to a real seed tag without changing the twin", () => {
    expect(inventory.filter(({ identity }) => identity === "assumed")).toHaveLength(Object.keys(ASSUMED_BOM).length);
    expect(inventory.find(({ assetId }) => assetId === "FW-EDGE")?.exposure.internetFacing).toBe(true);
    expect(inventory.find(({ assetId }) => assetId === "GW-PK")?.exposure).toMatchObject({
      internetFacing: false, cloudConnected: true, remoteAccess: true, radios: ["cellular"],
    });
  });

  it("uses product, an exact firmware mention and modeled protocol and edge evidence", () => {
    const [match, ...others] = matchThreats([forti], inventory);
    expect(others).toEqual([]);
    expect(match.inventory.assetId).toBe("FW-EDGE");
    expect(match.versionMentioned).toBe(true);
    expect(match.reasons).toContain("Protocol · IKEv2");
    expect(match.reasons).toContain("Internet boundary");
    const [mismatch] = matchThreats([{ ...forti, summary: "IKEv2 on version v7.2.90." }], inventory);
    expect(mismatch.versionMentioned).toBe(false);
    expect(mismatch.score).toBeLessThan(match.score);
  });

  it("handles ICS title aliases while avoiding a vendor-only or exposure-only hit", () => {
    const cisa = { ...forti, source: "cisa-ics" as const, vendor: undefined, product: undefined,
      title: "Siemens S7-1500 security advisory", summary: "OPC UA affected interface." };
    const [candidate, ...others] = matchThreats([cisa], inventory);
    expect(others).toEqual([]);
    expect(candidate.inventory.assetId).toBe("PLC-BL");
    expect(candidate.reasons).toContain("Control network · L1");
    expect(matchThreats([{ ...cisa, title: "Siemens security advisory" }], inventory)).toEqual([]);
    expect(matchThreats([{ ...forti, vendor: "Unrelated vendor" }], inventory)).toEqual([]);
  });

  it("uses the current twin to rerank an advisory after cellular is disabled", () => {
    const advisory = { ...forti, vendor: "Sierra Wireless", product: "AirLink ALEOS", title: "Gateway advisory", summary: "LTE interface impacted" };
    const [before] = matchThreats([advisory], inventory);
    const changed = {
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset.id === "GW-PK" && asset.cyber
        ? { ...asset, cyber: { ...asset.cyber, radios: [] } } : asset),
    };
    const [after] = matchThreats([advisory], inventoryForTwin(changed));
    expect(before.reasons).toContain("Radio · cellular");
    expect(after.score).toBeLessThan(before.score);
  });
});
