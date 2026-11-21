/** Keeps product evidence focused on facts that affect placement. */
export const CAPTURE_SPEC_CHARS = 3_000;

const IDENTITY = /^(?:brand|model|product|sku|manufacturer|mpn)\s*:/i;
const DESCRIPTION = /^(?:description|details)\s*:/i;
const DOWNLOAD_METADATA = /^(?:language|version|file (?:size|name)|download)\s*:|^(?:EN|DE|FR|ES|IT|ZH)(?:\s*:|$)/i;
const SPEC_FAMILIES = [
  /\b(?:IP\d{2}K?|ATEX|IECEx|NEMA\s+\d|EHEDG|washdown|certificat\w*|approvals?)\b/i,
  /\b(?:PoE|Ethernet|RJ-?45|RS-?485|USB|Wi-Fi|Bluetooth|IO-Link|PROFINET|Modbus|LTE)\b/i,
  /\b(?:316L?|304 stainless|wetted parts|food[- ]grade|hygienic|material)\b/i,
  /\b(?:pressure|temperature|voltage|power|capacity|dimensions?|\d+(?:\.\d+)?\s*(?:mm|bar|psi|volts|watts|liters))\b/i,
  /\b(?:cloud|remote access|memory card|local storage|default credentials)\b/i,
];

function priority(line: string): number {
  if (IDENTITY.test(line)) return 0;
  if (DESCRIPTION.test(line)) return 3;
  if (SPEC_FAMILIES.some((pattern) => pattern.test(line))) return 1;
  return 2;
}

export function compactProductSpecs(lines: readonly string[]): string {
  const facts = lines.map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => line && !DOWNLOAD_METADATA.test(line));
  const ordered = facts.toSorted((first, second) => priority(first) - priority(second));
  const selected: string[] = [];
  const seen = new Set<string>();
  let remaining = CAPTURE_SPEC_CHARS;
  for (const fact of ordered) {
    const line = fact.slice(0, Math.min(350, remaining)).trimEnd();
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(line);
    remaining -= line.length + 1;
    if (remaining <= 0) break;
  }
  return selected.join("\n");
}

export function hasDocumentedProductSpecs(title: string, specs: string): boolean {
  const model = /^(?:model|sku):\s*\S/im.test(specs)
    || /\b[A-Z]+\d+[A-Z0-9]*(?:-[A-Z0-9]+)+\b/.test(title);
  return model && SPEC_FAMILIES.filter((pattern) => pattern.test(specs)).length >= 2;
}
