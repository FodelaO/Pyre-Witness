/** Checks source citations and deduplicates repeat sightings conservatively. */
import type { Twin } from "@/twin/types";
import type { PreparedSource } from "./media";
import type { RawObservation } from "./schemas";
import type { CitedEvidence, ModelDrop, ObservedItem } from "./types";

export function referenceKey(text: string): string {
  return text.normalize("NFKC").replace(/[‐‑‒–—−]/g, "-").trim().replace(/\s+/g, " ").toUpperCase();
}

export function citedSeconds(locator: string): number | undefined {
  const parts = /^(\d{2}):([0-5]\d)$/.exec(locator);
  if (parts) return Number(parts[1]) * 60 + Number(parts[2]);
}

function inventoryLine(locator: string, lines: string[]) {
  const location = /^line (\d+)$/i.exec(locator);
  return location ? lines[Number(location[1]) - 1] : undefined;
}

function includesReference(line: string, reference: string): boolean {
  const source = referenceKey(line);
  const target = referenceKey(reference);
  if (!target) return false;
  const partOfWord = (character: string, adjacent: string) => /[\p{L}\p{N}\/_-]/u.test(character)
    || (character === "." && /[\p{L}\p{N}]/u.test(adjacent));
  for (let start = source.indexOf(target); start >= 0; start = source.indexOf(target, start + target.length)) {
    const end = start + target.length;
    if (!partOfWord(source.charAt(start - 1), source.charAt(start - 2))
      && !partOfWord(source.charAt(end), source.charAt(end + 1))) return true;
  }
  return false;
}

function validCitation({ evidence, tag }: RawObservation, prepared: PreparedSource): boolean {
  const { source, inventoryLines, parts } = prepared;
  const { locator, detail } = evidence;
  if (source.kind === "video") {
    const seconds = citedSeconds(locator);
    return seconds !== undefined && seconds < (source.durationSeconds ?? 0);
  }
  if (inventoryLines) {
    const line = inventoryLine(locator, inventoryLines);
    if (!line || !referenceKey(line).includes(referenceKey(detail))) return false;
    return tag === null || includesReference(line, tag);
  }
  if (source.kind === "document") {
    const page = parts[0]?.type === "document" ? "page" : "image";
    return new RegExp(`^${page} 1\\s*[·:–—-]\\s*\\S`, "i").test(locator);
  }
  const photo = /^photo (\d+)$/i.exec(locator);
  return Boolean(photo && Number(photo[1]) >= 1 && Number(photo[1]) <= source.files.length);
}

function sameItem(a: ObservedItem, b: ObservedItem, isVideo: boolean): boolean {
  if (a.tag && b.tag) return referenceKey(a.tag) === referenceKey(b.tag);
  return a.kind === b.kind && a.area_guess === b.area_guess && referenceKey(a.label) === referenceKey(b.label)
    && a.evidence.some((first) => b.evidence.some((second) =>
      referenceKey(first.detail) === referenceKey(second.detail) && (isVideo || first.locator === second.locator)));
}

function mergeEvidence(first: CitedEvidence[], second: CitedEvidence[], video: boolean) {
  const unique = new Map([...first, ...second].map((citation) => [citation.locator, citation]));
  const citations = [...unique.values()];
  if (video) citations.sort((a, b) => (citedSeconds(a.locator) ?? 0) - (citedSeconds(b.locator) ?? 0));
  return citations.slice(0, 3);
}

export function observeItems(raw: RawObservation[], prepared: PreparedSource, twin: Twin) {
  const items: ObservedItem[] = [];
  const dropped: ModelDrop[] = [];
  const isVideo = prepared.source.kind === "video";
  for (const [index, item] of raw.entries()) {
    const id = `item-${index + 1}`;
    if (!validCitation(item, prepared)) {
      dropped.push({ itemId: id, reason: `${item.label}: source citation could not be verified.` });
      continue;
    }
    const area = twin.areas.find(({ id }) => id === item.area_guess);
    if (item.area_guess && !area) dropped.push({ itemId: id, reason: `${item.label}: unknown room hint ${item.area_guess}.` });
    const line = prepared.inventoryLines && inventoryLine(item.evidence.locator, prepared.inventoryLines);
    const connects_to = item.connects_to.filter(({ to }) => {
      if (!line || includesReference(line, to)) return true;
      dropped.push({ itemId: id, reason: `Ignored connection to ${to}, which is absent from ${item.evidence.locator}.` });
      return false;
    });
    const observed: ObservedItem = { ...item, id, area_guess: area?.id ?? null, evidence: [item.evidence], connects_to };
    const duplicate = items.findIndex((candidate) => sameItem(candidate, observed, isVideo));
    if (duplicate === -1) {
      items.push(observed);
      continue;
    }
    const first = items[duplicate];
    const preferred = first.confidence >= observed.confidence ? first : observed;
    const links = new Map([...first.connects_to, ...observed.connects_to].map((link) =>
      [`${referenceKey(link.to)}:${link.medium}`, link]));
    items[duplicate] = {
      ...preferred,
      id: first.id,
      tag: first.tag ?? observed.tag,
      evidence: mergeEvidence(first.evidence, observed.evidence, isVideo),
      connects_to: [...links.values()],
    };
  }
  return { items, dropped };
}
