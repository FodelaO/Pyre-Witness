/** Checks dataset rows against the seed inventory and shared capture enums. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DEVICE_CATEGORIES } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { EQUIPMENT_KINDS, PURDUE_LEVELS, RADIOS } from "@/twin/types";
import { parseCsv } from "./csv";
import { datasetImageMime } from "./image";
import { DIFFICULTIES, GROUPS, RISK_TAGS, type EvaluationItem } from "./types";

export const DATASET_ROOT = path.join(process.cwd(), "eval", "dataset");
const YES_NO = z.enum(["yes", "no"]);
const LEVELS = new Map(PURDUE_LEVELS.map(({ level }) => [String(level), level]));
const AREA = z.enum(SEED_TWIN.areas.map(({ id }) => id));
const KIND = z.enum(EQUIPMENT_KINDS);
const list = <T extends string>(schema: z.ZodType<T>) => z.preprocess(
  (value) => typeof value === "string" ? splitList(value) : value, z.array(schema),
);
const optionalList = <T>(schema: z.ZodType<T[]>) => z.union([z.literal("unknown").transform(() => undefined), schema]);

function splitList(value: string) {
  return value ? [...new Set(value.split(";").map((entry) => entry.trim()))] : [];
}

const areas = list(AREA);
const risks = list(z.enum(RISK_TAGS));
const radios = list(z.enum(RADIOS));
const levels = z.string().transform(splitList).pipe(z.array(z.string().refine((value) => LEVELS.has(value), "Unknown Purdue level")))
  .transform((values) => values.map((value) => LEVELS.get(value)!));
const id = z.string().regex(/^[a-z0-9_-]+$/i, "Use a non-empty ID made of letters, digits, underscores or hyphens").max(100);
const url = z.url({ protocol: /^https?$/ }).max(4096).refine((value) => {
  const parsed = new URL(value);
  return !parsed.username && !parsed.password;
}, "Use a URL without credentials");

const labels = z.object({
  id,
  file: z.string().refine((value) => !value || Boolean(datasetImageMime(value)), "Use a relative JPEG, PNG or WebP path"),
  description: z.string().max(12_000),
  source_url: z.union([z.literal(""), url]),
  license: z.string().min(1, "Record the image or text license"),
  is_device: YES_NO,
  correct_category: z.union([z.literal(""), z.enum(DEVICE_CATEGORIES)]),
  correct_device_type: z.string(),
  correct_radios: optionalList(radios),
  correct_ports: optionalList(list(z.string().min(1))),
  cloud: z.enum(["yes", "no", "unknown", ""]),
  correct_physical_kind: z.union([z.literal(""), KIND]),
  correct_area: areas,
  correct_level: levels,
  never_areas: areas,
  expected_risk_tags: risks,
  difficulty: z.enum(DIFFICULTIES),
  notes: z.string(),
}).superRefine((row, context) => {
  const issue = (path: string, message: string) => context.addIssue({ code: "custom", path: [path], message });
  if (Boolean(row.file) === Boolean(row.description)) issue("file", "Supply exactly one of file and description");
  if (row.is_device === "yes") {
    if (!row.correct_category) issue("correct_category", "A device needs a category");
    if (!row.correct_device_type) issue("correct_device_type", "A device needs a type");
    if (!row.correct_physical_kind) issue("correct_physical_kind", "A device needs a physical kind");
    if (!row.cloud) issue("cloud", "Use yes, no or unknown");
  } else if (row.correct_category || row.correct_device_type || row.correct_physical_kind || row.correct_radios?.length
    || row.correct_ports?.length || row.correct_area.length || row.correct_level.length || row.never_areas.length
    || row.expected_risk_tags.length || row.cloud === "yes" || row.cloud === "no") {
    issue("is_device", "A negative item cannot carry positive-device labels");
  }
  if (row.correct_area.some((area) => row.never_areas.includes(area))) issue("never_areas", "An acceptable area cannot be forbidden");
});

const links = z.object({
  id,
  url,
  expected_physical_kind: KIND,
  expected_area: areas.refine((values) => values.length > 0, "A product link needs at least one acceptable area"),
  expected_capacity_or_size: z.string(),
  expected_risk_tags: risks,
  notes: z.string(),
});

interface ReadResult {
  items: EvaluationItem[];
  errors: string[];
  warnings: string[];
}

export async function loadDataset(root = DATASET_ROOT): Promise<ReadResult> {
  const result: ReadResult = { items: [], errors: [], warnings: [] };
  const ids = new Set<string>();

  async function readRows<T>(file: string, fields: Record<string, unknown>, schema: z.ZodType<T>, convert: (row: T) => EvaluationItem) {
    let csv: string;
    try {
      csv = await readFile(path.join(root, file), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") result.warnings.push(`${file} is missing.`);
      else result.errors.push(`${file} could not be read.`);
      return;
    }
    let records: string[][];
    try {
      records = parseCsv(csv, file);
    } catch (error) {
      result.errors.push((error as Error).message);
      return;
    }
    const keys = Object.keys(fields);
    const [header, ...rows] = records;
    if (header?.join(",") !== keys.join(",")) {
      result.errors.push(`${file}: expected header ${keys.join(",")}`);
      return;
    }
    for (const [index, values] of rows.entries()) {
      const location = `${file} record ${index + 2}`;
      if (values.length !== keys.length) {
        result.errors.push(`${location}: expected ${keys.length} fields, found ${values.length}.`);
        continue;
      }
      const parsed = schema.safeParse(Object.fromEntries(keys.map((key, column) => [key, values[column]])));
      if (!parsed.success) {
        result.errors.push(...parsed.error.issues.map((issue) => `${location} ${issue.path.join(".")}: ${issue.message}`));
        continue;
      }
      const item = convert(parsed.data);
      const key = item.id.toLowerCase();
      if (ids.has(key)) result.errors.push(`${location}: duplicate item ID ${item.id}.`);
      else {
        ids.add(key);
        result.items.push(item);
      }
    }
  }

  await readRows("labels.csv", labels.shape, labels, (row) => {
    const isDevice = row.is_device === "yes";
    return {
      id: row.id,
      group: row.difficulty,
      input: row.file ? { kind: "photo", file: row.file } : { kind: "text", description: row.description },
      expected: {
        isDevice,
        category: row.correct_category || undefined,
        deviceType: row.correct_device_type || undefined,
        physicalKind: row.correct_physical_kind || undefined,
        radios: isDevice ? row.correct_radios : undefined,
        ports: isDevice ? row.correct_ports : undefined,
        cloud: row.cloud === "yes" ? true : row.cloud === "no" ? false : undefined,
        defaultCredentials: isDevice ? row.expected_risk_tags.includes("default_creds") : undefined,
        areas: row.correct_area,
        levels: row.correct_level,
        neverAreas: row.never_areas,
        riskTags: row.expected_risk_tags,
      },
      sourceUrl: row.source_url,
      license: row.license,
      notes: row.notes,
    };
  });

  await readRows("links.csv", links.shape, links, (row) => ({
    id: row.id,
    group: "links",
    input: { kind: "link", url: row.url },
    expected: {
      isDevice: true, physicalKind: row.expected_physical_kind, areas: row.expected_area,
      capacity: row.expected_capacity_or_size || undefined, riskTags: row.expected_risk_tags, levels: [], neverAreas: [],
    },
    sourceUrl: row.url,
    license: "See SOURCES.md",
    notes: row.notes,
  }));

  const linksCount = result.items.filter(({ group }) => group === "links").length;
  if (linksCount < 5 || linksCount > 10) result.warnings.push(`Expected 5–10 product links, found ${linksCount}.`);
  if (!result.items.some(({ expected }) => !expected.isDevice)) result.warnings.push("No negative captures are labeled.");
  try {
    const sources = (await readFile(path.join(root, "SOURCES.md"), "utf8")).trim();
    if (!sources) result.warnings.push("SOURCES.md is empty.");
    const credits = photoCredits(sources);
    for (const item of result.items) {
      if (item.input.kind === "photo") item.credit = credits.get(item.input.file);
    }
  } catch {
    result.warnings.push("SOURCES.md is missing or unreadable.");
  }
  return result;
}

function photoCredits(sources: string) {
  const credits = new Map<string, NonNullable<EvaluationItem["credit"]>>();
  for (const line of sources.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const [fileCell, , author, , termsCell] = line.split("|").slice(1).map((cell) => cell.trim());
    const file = /^`([^`]+)`$/.exec(fileCell)?.[1];
    if (!file || !author || !datasetImageMime(file)) continue;
    const terms = url.safeParse(/\]\((.+)\)$/.exec(termsCell ?? "")?.[1]);
    credits.set(file, { author, termsUrl: terms.success ? terms.data : undefined });
  }
  return credits;
}

/** Deterministic round robin keeps small samples from taking only the easiest rows. */
export function selectItems(items: readonly EvaluationItem[], limit?: number): EvaluationItem[] {
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id, "en-US"));
  const count = Math.min(limit ?? ordered.length, ordered.length);

  const groups = [ordered.filter(({ expected }) => !expected.isDevice),
    ...GROUPS.map((group) => ordered.filter((item) => item.group === group && item.expected.isDevice))];
  const selected: EvaluationItem[] = [];
  for (let offset = 0; selected.length < count; offset += 1) {
    for (const group of groups) {
      if (group[offset]) selected.push(group[offset]);
      if (selected.length === count) return selected;
    }
  }
  return selected;
}
