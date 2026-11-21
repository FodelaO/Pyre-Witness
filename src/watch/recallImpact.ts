/** Maps stated beverage recall reasons to comparable controls in the simulated line. */
export interface RecallImpact {
  reason: string;
  assetIds: readonly string[];
}

const rules: ReadonlyArray<RecallImpact & { pattern: RegExp }> = [
  {
    pattern: /\b(?:foreign (?:material|matter|object)|extraneous (?:material|matter)|(?:glass|metal|plastic) (?:pieces?|fragments?|shards?|particles?))\b/i,
    reason: "Foreign material", assetIds: ["VIS-F3", "FIL-3"],
  },
  {
    pattern: /\b(?:undeclared|mislabel(?:ed|led|ing|ling)?|label(?:ing|ling)? (?:error|mix[ -]?up)|(?:incorrect|wrong|missing) (?:label|nutrition facts|ingredient)|(?:not|never) declared)\b/i,
    reason: "Labeling", assetIds: ["LBL-3"],
  },
  {
    pattern: /\b(?:microbi(?:al|ological)|pathogens?|bacteri(?:a|al)|salmonella|listeria|e\.?\s*coli|botuli(?:num|sm)|bacillus|yeast|mou?ld|pasteuri[sz](?:ation|ed))\b/i,
    reason: "Microbial control", assetIds: ["FIL-3", "PLC-BL"],
  },
  {
    pattern: /\b(?:chemical (?:contaminat\w*|residue)|cleaning (?:agent|solution)|caustic|saniti[sz]er|(?:elevated|excessive) (?:levels? of )?(?:lead|arsenic|nitrite)|(?:lead|arsenic|pesticide) (?:contaminat\w*|residue)|patulin|aflatoxins?|mycotoxins?|unapproved colou?rs?)\b/i,
    reason: "Chemical control · CIP dosing", assetIds: ["TK-311", "CT-210"],
  },
];

export function recallImpact(reason: string): RecallImpact | undefined {
  const rule = rules.find(({ pattern }) => pattern.test(reason));
  if (rule) return { reason: rule.reason, assetIds: rule.assetIds };
}
