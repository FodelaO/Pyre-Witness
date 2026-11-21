/** Builds disjoint input buckets and reproducible challenge examples from saved case results. */
import type { CaseResult, DiagnosisCategory } from "./failures";
import { proportion } from "./statistics";
import type { EvaluationItem } from "./types";

export const INPUT_BUCKETS = ["clean", "messy", "edge", "negatives", "links", "text"] as const;
export type InputBucket = typeof INPUT_BUCKETS[number];
export const INPUT_NAMES: Record<InputBucket, string> = {
  clean: "Clean", messy: "Messy", edge: "Edge", negatives: "Non-devices", links: "Links", text: "Text",
};

function bucket(kind: EvaluationItem["input"]["kind"], group: EvaluationItem["group"], isDevice: boolean): InputBucket {
  if (!isDevice) return "negatives";
  if (kind === "text") return "text";
  if (kind === "link" || group === "links") return "links";
  return group;
}

const representative: Record<InputBucket, string> = {
  clean: "photo-006", messy: "photo-001", edge: "photo-048", negatives: "photo-028", links: "link-indoor-camera", text: "text-02",
};

export function sampleInputs(items: readonly EvaluationItem[]) {
  return INPUT_BUCKETS.map((key) => {
    const rows = items.filter(({ input, group, expected }) => bucket(input.kind, group, expected.isDevice) === key);
    const example = rows.find(({ id }) => id === representative[key]) ?? rows[0];
    return { key, n: rows.length, example: example ? {
      id: example.id, label: example.expected.deviceType ?? example.notes.split(". ")[0] ?? example.id,
      kind: example.input.kind, sourceUrl: example.sourceUrl, credit: example.credit, license: example.license,
      text: example.input.kind === "text" ? example.input.description
        : example.input.kind === "link" ? new URL(example.input.url).hostname.replace(/^www\./, "") : undefined,
    } : null };
  });
}

export function onlyNegativeCredentialLabels(cases: readonly CaseResult[]) {
  const known = cases.filter(({ file, expected }) => file && expected.isDevice && expected.deviceType?.trim()
    && expected.defaultCredentials !== undefined);
  return known.length > 0 && known.every(({ expected }) => expected.defaultCredentials === false);
}

export const CHALLENGE_METHOD = "A pass requires a usable result matching labeled kind and placement, or correct non-device handling. Edge captures rank first, then messy, links and clean.";
const difficulty = { edge: 0, messy: 1, links: 2, clean: 3 } as const;

export function passedChallenge(item: CaseResult): boolean {
  const { expected, answers: { system: answer } } = item;
  if (!answer || answer.status === "error") return false;
  if (!expected.isDevice) {
    const object = answer.objectAssessment;
    return object ? object.isDevice === false && !object.cyberClaims.length
      && (answer.status === "rejected" || !object.safetyDrop || object.safetyDrop.concerns.length > 0)
      : answer.accepted === false;
  }
  return answer.status === "ok"
    && (!expected.physicalKind || answer.physicalKind === expected.physicalKind)
    && (!expected.areas.length || (answer.area !== null && expected.areas.includes(answer.area)))
    && (!expected.levels.length || (answer.level !== null && expected.levels.includes(answer.level)))
    && (answer.area === null || !expected.neverAreas.includes(answer.area));
}

export function challengeResults(cases: readonly CaseResult[]) {
  const items = cases.filter(({ answers }) => answers.system);
  const ranked = [...items].sort((a, b) => difficulty[a.group] - difficulty[b.group]
    || Number(Boolean(b.file)) - Number(Boolean(a.file)) || a.id.localeCompare(b.id));
  const select = (passed: boolean) => ranked.filter((item) => passedChallenge(item) === passed).slice(0, 3).map(({ id }) => id);
  return {
    buckets: INPUT_BUCKETS.map((key) => ({
      key,
      rate: proportion(items.filter((entry) => bucket(entry.file ? "photo" : entry.group === "links" ? "link" : "text",
        entry.group, entry.expected.isDevice) === key).map((entry) => ({ numerator: Number(passedChallenge(entry)), n: 1 }))),
    })),
    passed: select(true),
    missed: select(false),
  };
}

export function leadingFailures(cases: readonly CaseResult[]) {
  const byCause = new Map<DiagnosisCategory, CaseResult[]>();
  for (const item of cases) {
    for (const cause of new Set(item.diagnoses.filter(({ side }) => side === "system").map(({ category }) => category))) {
      const bucket = byCause.get(cause) ?? [];
      bucket.push(item);
      byCause.set(cause, bucket);
    }
  }
  const used = new Set<string>();
  const samples = new Set(Object.values(representative));
  const preferred: Partial<Record<DiagnosisCategory, string>> = { "perception miss": "photo-003", "gate error": "photo-018" };
  return [...byCause].sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0])).slice(0, 3)
    .map(([cause, items]) => {
      const example = items.find(({ id }) => id === preferred[cause] && !used.has(id))
        ?? items.find(({ file, id }) => file && !samples.has(id) && !used.has(id))
        ?? items.find(({ id }) => !used.has(id)) ?? items[0];
      used.add(example.id);
      return { cause, n: items.length, id: example.id };
    });
}
