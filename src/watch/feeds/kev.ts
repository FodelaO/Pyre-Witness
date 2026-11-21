/** Normalizes CISA Known Exploited Vulnerabilities using dateAdded as the feed date. */
import { z } from "zod";
import type { ThreatItem } from "../types";

const catalog = z.object({ vulnerabilities: z.array(z.unknown()) });
const record = z.object({
  cveID: z.string().regex(/^CVE-\d{4}-\d{4,}$/),
  vendorProject: z.string().trim().min(1),
  product: z.string().trim().min(1),
  vulnerabilityName: z.string().trim().min(1),
  dateAdded: z.iso.date(),
  shortDescription: z.string(),
  knownRansomwareCampaignUse: z.unknown().optional(),
});

export function parseKev(json: string): ThreatItem[] {
  const { vulnerabilities } = catalog.parse(JSON.parse(json));
  const items = vulnerabilities.flatMap((row): ThreatItem[] => {
    const parsed = record.safeParse(row);
    if (!parsed.success) return [];
    const { cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, knownRansomwareCampaignUse } = parsed.data;
    return [{
      id: cveID,
      source: "cisa-kev",
      title: vulnerabilityName.slice(0, 360),
      vendor: vendorProject,
      product,
      ...(knownRansomwareCampaignUse === "Known" && { ransomwareCampaign: true }),
      cves: [cveID],
      published: `${dateAdded}T00:00:00.000Z`,
      url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${cveID}`,
      summary: shortDescription.slice(0, 1400),
    }];
  });
  if (vulnerabilities.length && !items.length) throw new Error("No parseable catalog entries");
  return items;
}
