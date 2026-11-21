/** Covers feed classification and the drill fallback against the seeded plant. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import { missingWatchDrills } from "./drills";
import { parseKev } from "./feeds/kev";
import type { LiveItem } from "./liveTypes";
import { classifyVuln } from "./vulnType";

function advisory(title: string, summary = ""): LiveItem {
  return { source: "cisa-ics", id: title, title, summary, cves: [], published: "", url: "" };
}

describe("watch vulnerability types", () => {
  it.each([
    ["Ransomware in manufacturing", "", "ransomware"],
    ["Siemens SIMATIC S7-1200", "Affected firmware versions", "plcFirmware"],
    ["Remote desktop gateway", "Security advisory", "remoteAccess"],
    ["Industrial Wi-Fi access point", "", "wireless"],
    ["Vendor reports compromised signed update", "", "softwareUpdate"],
    ["New software found on HMI-F3", "An unapproved remote support utility", "newSoftware"],
    ["Beverage recall", "Undeclared ingredient", "foodRecall"],
    ["Communications library vulnerability", "Remote code execution. Apply the software update.", "advisory"],
  ] as const)("classifies %s", (title, summary, type) => {
    expect(classifyVuln(advisory(title, summary))).toBe(type);
  });

  it("uses openFDA provenance when the headline lacks a recall keyword", () => {
    const item = { ...advisory("Orange drink"), source: "openfda", firm: "Example maker" } as const;
    expect(classifyVuln(item)).toBe("foodRecall");
  });

  it("credits explicit KEV ransomware campaign use only", () => {
    const record = {
      cveID: "CVE-2099-1000", vendorProject: "Example", product: "Gateway",
      vulnerabilityName: "Gateway flaw", dateAdded: "2099-01-01", shortDescription: "Apply vendor fixes.",
    };
    const published = parseKev(JSON.stringify({ vulnerabilities: [
      { ...record, knownRansomwareCampaignUse: "Known" },
      { ...record, knownRansomwareCampaignUse: "Unknown" },
    ] }));
    expect(published.map(classifyVuln)).toEqual(["ransomware", "advisory"]);
  });

  it("supplies one priced drill per missing type, with live items taking precedence", () => {
    const drills = missingWatchDrills([], SEED_TWIN);
    expect(drills).toHaveLength(7);
    expect(new Set(drills.map(({ type }) => type)).size).toBe(7);
    for (const { asset, estimate } of drills) {
      expect(estimate.asset.id).toBe(asset.id);
      expect(estimate.lossIfManifests).toBeGreaterThan(0);
    }
    const wifi = advisory("Wireless advisory");
    expect(missingWatchDrills([wifi, wifi], SEED_TWIN).map(({ type }) => type))
      .toEqual(drills.map(({ type }) => type).filter((type) => type !== "wireless"));
  });

  it("omits a drill whose asset has been removed", () => {
    const twin = { ...SEED_TWIN, assets: SEED_TWIN.assets.filter(({ id }) => id !== "HMI-F3") };
    expect(missingWatchDrills([], twin).some(({ type }) => type === "newSoftware")).toBe(false);
  });
});
