/** Filters results using their kind and the shared compliance catalogue. */
import { COMPLIANCE } from "@/data/compliance";
import type { LensMode } from "@/layers/lensStore";
import type { ComplianceItem, RiskItem } from "@/pipeline/types";
import type { RuleFinding } from "@/twin/types";

type Domain = "material" | "data" | "mixed";

function normalize(text: string) {
  return text.toLowerCase().replace(/\bparts?\b/g, "").replace(/[^a-z0-9]/g, "");
}

const clauseDomains = COMPLIANCE.map(({ domain, framework, clause }) => ({
  framework: normalize(framework),
  clause: normalize(clause),
  domain: (domain === "cyber" ? "data" : "material") as Domain,
}));

// The model may cite a standard without the edition or spelling in the catalogue.
const dataStandards = /\b(?:62443|800[\s-]*82(?:r\d+)?|nist\s+csf|nis\s*2|2022\/2555|iso\s*\/?\s*iec\s*2700[12])\b/i;
const materialStandards = /\b(?:21\s*cfr|29\s*cfr|40\s*cfr|osha|fsma|niosh|haccp|iiar|iec\s*(?:61511|60079|60529)|iso\s*(?:20653|22000)|nfpa\s*70|3-a|ehedg|nsf\s*\/\s*ansi)\b/i;

function domainOf(text: string): Domain | undefined {
  const key = normalize(text);
  const data = dataStandards.test(text) || clauseDomains.some(({ framework, domain }) => domain === "data" && key.includes(framework));
  const material = materialStandards.test(text) || clauseDomains.some(({ framework, domain }) => domain === "material" && key.includes(framework));
  if (data && material) return "mixed";
  if (data || material) return data ? "data" : "material";
}

function visible(mode: LensMode, domain: Domain | undefined) {
  return mode === "both" || domain === "mixed" || domain === undefined || mode === domain;
}

export function showsCompliance(mode: LensMode, item: ComplianceItem) {
  const framework = normalize(item.framework);
  const clause = normalize(item.clause);
  const cited = clauseDomains.find((item) => item.framework === framework && item.clause === clause);
  return visible(mode, cited?.domain ?? domainOf(`${item.framework} ${item.clause}`));
}

export function showsRisk(mode: LensMode, item: RiskItem | RuleFinding) {
  if (item.kind === "physical") return visible(mode, "material");
  if (item.kind === "cyber") return visible(mode, "data");
  const source = "references" in item ? item.references.join(" ") : `${item.title} ${item.description}`;
  return visible(mode, domainOf(source) ?? (item.technique ? "data" : undefined));
}

/** Put the active lens first while keeping every answer and the original order within each group. */
export function prioritizeLens<T>(mode: LensMode, items: readonly T[], matches: (mode: LensMode, item: T) => boolean): T[] {
  return mode === "both" ? [...items] : [...items].sort((a, b) => Number(matches(mode, b)) - Number(matches(mode, a)));
}
