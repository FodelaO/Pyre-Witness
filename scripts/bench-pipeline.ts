/** Measures live pipeline captures and compares Carbon thinking levels using a fixed profile per pair. */
import { parseArgs } from "node:util";
import { assessDevice } from "@/gemini/assess";
import { briefEngineerWithinDeadline } from "@/gemini/briefing";
import { captureEvidence, perceive, UNUSABLE_CAPTURE_MESSAGE } from "@/gemini/capture";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { geminiClients, providerDiagnostic, providerFailure, withGeminiDiagnostics } from "@/gemini/transport";
import { withGeminiUsage, type GeminiUsage } from "@/gemini/usage";
import { assetFromProfile, atRecommendedPlacement, capturedAssetId, resolveDropPoint } from "@/pipeline/assetFromProfile";
import { groundAssessment } from "@/pipeline/server/groundAssessment";
import { analyzeRequestSchema } from "@/pipeline/server/requests";
import { runAnalyze } from "@/pipeline/server/run";
import { checkAsDropped, checkPlacement } from "@/pipeline/server/selfCheck";
import type { Assessment, CaptureInput, DeviceProfile, DropPoint, GateResult, SelfCheckResult, TranscriptEntry } from "@/pipeline/types";
import { areaCenter } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { DATASET_ROOT, loadDataset } from "../eval/dataset";
import { readDatasetImage } from "../eval/image";
import type { EvaluationItem } from "../eval/types";

const KINDS = ["text", "photo", "link"] as const;
const STAGES = ["link", "gate", "perception", "as-dropped", "reasoning", "selfcheck", "revision", "post-revision", "summary",
  "first-placement", "first-rules", "final-check-to-completion", "total", "terminal"] as const;
const STAGES_BY_MODEL: Record<string, Stage> = {
  [MODEL_IDS.decisions]: "gate", [MODEL_IDS.perception]: "perception",
  [MODEL_IDS.reasoning]: "reasoning", [MODEL_IDS.chief]: "summary",
};
const TOKEN_FIELDS = ["inputTokens", "outputTokens", "thoughtTokens", "cachedTokens", "totalTokens"] as const;
const ASSESSMENT_LISTS = ["risks", "attack_paths", "compliance", "never_place", "mitigations"] as const;
const QUALITY_IDS = ["text-01", "text-02", "text-03", "text-04", "text-05", "text-06"];
const CAMERA = "Consumer Wi-Fi security camera with optional vendor cloud connectivity and an Ethernet port, intended next to the Filler 3 operator panel";
const OBJECT_PHOTOS = [
  { id: "photo-028", isDevice: false }, // Ceramic mug
  { id: "photo-052", isDevice: false }, // Wooden chair
  { id: "photo-053", isDevice: false }, // Cardboard box
  { id: "photo-002", isDevice: true }, // Wireless router
  { id: "photo-041", isDevice: true }, // Float level switch
];
const SUITES = ["default", "object-photos", "mixed", "links", "reliability", "transcript"] as const;
// The other non-device labels still show identifiable physical objects.
const UNUSABLE_FIXTURES = new Set(["photo-027", "photo-030"]);
type Suite = typeof SUITES[number];

type Stage = typeof STAGES[number];
type Capture = { id: string; input: CaptureInput; expectedDevice: boolean; dropPoint?: DropPoint };
type Timing = Partial<Record<Stage, number>>;
type ChiefCase = { assessment: Assessment; profile: DeviceProfile; check: SelfCheckResult };
type TranscriptTiming = Pick<TranscriptEntry, "stage" | "engine" | "latencyMs" | "usage" | "note"> & { phase?: string };
type Outcome = "completed" | "expected rejection" | "unexpected rejection" | "failed";
type Inspection = {
  phase: "as-dropped" | "recommendation" | "post-revision";
  passed: boolean;
  findings: number;
  ruleIds: string[];
  paths: number;
  disagreements: number;
  revised: boolean;
};
type Sample = {
  kind: CaptureInput["kind"];
  id: string;
  expectedDevice: boolean;
  dropPoint?: DropPoint;
  gate?: GateResult;
  profile?: Pick<DeviceProfile, "object_class" | "device_type" | "material" | "physical_kind" | "radios" | "ports">;
  placedAsset?: { kind: string; hasCyber: boolean; level: number; zone: string; conduit: string | null; connections: number };
  summaryText?: string;
  briefing?: "neon" | "status";
  timingMs: Timing;
  usage: Partial<Record<Stage, GeminiUsage>>;
  assessments: Partial<Record<"reasoning" | "revision", ReturnType<typeof assessmentStats>>>;
  inspections: Inspection[];
  transcript?: TranscriptTiming[];
  error?: string;
  errorStage?: string;
  outcome: Outcome;
  diagnostics: Array<{ event: "retry" | "failure" } & ReturnType<typeof providerDiagnostic>>;
  gateUnavailable: boolean;
  revisionFailed: boolean;
  failedAtMs?: number;
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
};

function assessmentStats(assessment: Assessment) {
  const jsonBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
  return {
    area: assessment.physical_placement.area,
    level: assessment.placement.level,
    conduit: assessment.placement.conduit,
    cyberRiskCount: assessment.risks.filter(({ kind }) => kind === "cyber").length,
    techniqueCount: assessment.risks.filter(({ technique }) => technique !== null).length,
    groundedJsonBytes: jsonBytes(assessment),
    lists: Object.fromEntries(ASSESSMENT_LISTS.map((key) =>
      [key, { count: assessment[key].length, groundedJsonBytes: jsonBytes(assessment[key]) }])),
  };
}

function addUsage(total: GeminiUsage, attempt: GeminiUsage): void {
  for (const field of TOKEN_FIELDS) {
    const value = attempt[field];
    if (value !== undefined) total[field] = (total[field] ?? 0) + value;
  }
}

async function datasetFixture(items: EvaluationItem[], id: string, kind: CaptureInput["kind"], isDevice = true): Promise<Capture> {
  const item = items.find((candidate) => candidate.id === id);
  if (item?.input.kind !== kind || item.expected.isDevice !== isDevice) {
    throw new Error(`Benchmark fixture ${id} needs a matching ${kind} row with is_device=${isDevice ? "yes" : "no"}.`);
  }
  const { input } = item;
  if (input.kind !== "photo") return { id, input, expectedDevice: isDevice };
  const { bytes, mimeType } = await readDatasetImage(DATASET_ROOT, input.file);
  return { id, input: { kind: "photo", images: [{ dataBase64: bytes.toString("base64"), mimeType }] }, expectedDevice: isDevice };
}

async function selectFixtures(suite: Suite, kinds: readonly CaptureInput["kind"][], items: EvaluationItem[]): Promise<Capture[]> {
  if (suite === "transcript") {
    const captures: Capture[] = kinds.includes("text")
      ? [{ id: "demo-camera", input: { kind: "text", description: CAMERA }, expectedDevice: true }] : [];
    if (kinds.includes("photo")) {
      captures.push(await datasetFixture(items, "photo-002", "photo"), await datasetFixture(items, "photo-028", "photo", false));
    }
    return captures;
  }
  if (suite === "reliability") {
    return Promise.all(items
      .filter(({ input }) => input.kind !== "link" && kinds.includes(input.kind))
      .map(({ id, input, expected }) => datasetFixture(items, id, input.kind, expected.isDevice)));
  }
  if (suite === "links") {
    return kinds.includes("link")
      ? Promise.all(items.filter(({ input }) => input.kind === "link").map(({ id }) => datasetFixture(items, id, "link")))
      : [];
  }
  const fixtures: Promise<Capture>[] = [];
  if (kinds.includes("photo")) {
    const photos = suite === "default" ? OBJECT_PHOTOS.filter(({ id }) => id === "photo-002") : OBJECT_PHOTOS;
    fixtures.push(...photos.map(({ id, isDevice }) => datasetFixture(items, id, "photo", isDevice)));
  }
  if (suite !== "object-photos" && kinds.includes("text")) {
    fixtures.push(Promise.resolve({ id: "demo-camera", input: { kind: "text", description: CAMERA }, expectedDevice: true }));
    if (suite === "mixed") {
      const hazard = SEED_TWIN.areas.find(({ id }) => id === "nh3_hazard");
      if (!hazard) throw new Error("The mixed benchmark needs the seed twin's ammonia area.");
      fixtures.push(datasetFixture(items, "text-03", "text"), Promise.resolve({
        id: "text-pocket-lighter", input: { kind: "text", description: "A personal disposable pocket lighter in my bag." },
        dropPoint: { ...areaCenter(hazard), area: hazard.id }, expectedDevice: false,
      }));
    }
  }
  if (suite !== "object-photos" && kinds.includes("link")) {
    fixtures.push(datasetFixture(items, "link-indoor-camera", "link"));
    if (suite === "mixed") fixtures.push(datasetFixture(items, "link-point-level", "link"));
  }
  return Promise.all(fixtures);
}

async function capture(
  { id, input, expectedDevice, dropPoint }: Capture,
  signal: AbortSignal,
  progress: (message: string) => void,
  chiefCase?: (value: ChiefCase) => void,
): Promise<Sample> {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const validated = analyzeRequestSchema.safeParse({ input, twin: SEED_TWIN, dropPoint });
  const timingMs: Timing = {};
  const usage: Sample["usage"] = {};
  const assessments: Sample["assessments"] = {};
  const inspections: Inspection[] = [];
  const transcript: TranscriptTiming[] = [];
  const context: Partial<ChiefCase> = {};
  const diagnostics: Sample["diagnostics"] = [];
  if (!validated.success) {
    const details = validated.error.issues.map(({ path, message }) => `${path.join(".")} · ${message}`).join(", ");
    const failedAtMs = Math.round(performance.now() - started);
    timingMs.terminal = failedAtMs;
    progress(`${id} ${failedAtMs} ms · input validation failed · ${details}`);
    return {
      id, kind: input.kind, expectedDevice, dropPoint, timingMs, usage, assessments, inspections, diagnostics,
      startedAt, failedAt: new Date().toISOString(), failedAtMs, errorStage: "input", error: details,
      outcome: "failed", gateUnavailable: false, revisionFailed: false,
    };
  }
  const request = validated.data;
  let gate: GateResult | undefined;
  let profile: Sample["profile"];
  let placedAsset: Sample["placedAsset"];
  let summaryText: string | undefined;
  let briefing: Sample["briefing"];
  let architectStage: Stage = "reasoning";
  let startedReasoning = false;
  let publishedRevision = false;
  let revisionStarted: number | undefined;
  let completed = false;
  let error: string | undefined;
  let errorStage: string | undefined;
  let failedAtMs: number | undefined;
  let failedAt: string | undefined;
  let completedAt: string | undefined;
  let finalCheckAtMs: number | undefined;
  let rejected = false;
  let revisionFailed = false;
  await withGeminiDiagnostics((event, diagnostic) => diagnostics.push({ event, ...diagnostic }), () =>
    withGeminiUsage((model, attempt) => {
    const stage = model === MODEL_IDS.reasoning ? architectStage : STAGES_BY_MODEL[model];
    if (stage) addUsage(usage[stage] ??= {}, attempt);
  }, () => runAnalyze(request, (event) => {
    const elapsed = Math.round(performance.now() - started);
    let stage: Stage | undefined;
    switch (event.type) {
      case "reasoning.started": startedReasoning = true; break;
      case "revision.started": {
        architectStage = "revision";
        revisionStarted = elapsed;
        break;
      }
      case "link.fetched": stage = "link"; break;
      case "gate.done": stage = "gate"; gate = event.gate; break;
      case "perception.done": {
        stage = "perception";
        timingMs["first-placement"] = elapsed;
        const { object_class, device_type, material, physical_kind, radios, ports } = event.profile;
        profile = { object_class, device_type, material, physical_kind, radios, ports };
        context.profile = event.profile;
        const { physical, network, cyber } = assetFromProfile(
          event.profile, request.twin, capturedAssetId(event.runId, event.profile, request.twin), resolveDropPoint(request.twin, request.dropPoint),
        );
        placedAsset = {
          kind: physical.kind, hasCyber: Boolean(cyber), level: network.level,
          zone: network.area, conduit: network.conduit, connections: physical.connections.length,
        };
        break;
      }
      case "reasoning.done": {
        stage = "reasoning";
        context.assessment = event.assessment;
        assessments.reasoning = assessmentStats(event.assessment);
        break;
      }
      case "selfcheck.done": {
        const priorPhase = publishedRevision ? "post-revision" : startedReasoning ? "recommendation" : "as-dropped";
        const phase = event.phase ?? priorPhase;
        stage = phase === "recommendation" ? "selfcheck" : phase;
        timingMs["first-rules"] ??= elapsed;
        if (phase !== "as-dropped") {
          finalCheckAtMs = elapsed;
          context.check = event.result;
        }
        const { passed, findings, paths, disagreements, revised } = event.result;
        inspections.push({
          phase, passed, revised,
          findings: findings.length, ruleIds: [...new Set(findings.map(({ ruleId }) => ruleId))],
          paths: paths.length, disagreements: disagreements.length,
        });
        break;
      }
      case "revision.done": {
        if (event.model === MODEL_IDS.reasoning) stage = "revision";
        publishedRevision = true;
        assessments.revision = assessmentStats(event.assessment);
        context.assessment = event.assessment;
        break;
      }
      case "transcript.entry": {
        if (!chiefCase) break;
        const { stage, engine, latencyMs, usage, note, crew, request } = event.entry;
        const phase = crew === "inspector" ? request?.text?.split(":", 1)[0] : undefined;
        transcript.push({ stage, engine, latencyMs, usage, note, phase });
        break;
      }
      case "summary.started": {
        if (revisionStarted !== undefined && timingMs.revision === undefined) {
          timingMs.revision = elapsed - revisionStarted;
          revisionFailed = true;
          progress(`${id} ${elapsed} ms · revision ended without a revised assessment`);
        }
        break;
      }
      case "summary.done": {
        stage = "summary";
        summaryText = event.text;
        briefing = event.model === MODEL_IDS.chief ? "neon" : "status";
        break;
      }
      case "run.completed": {
        timingMs.total = event.totalMs;
        timingMs.terminal = elapsed;
        if (finalCheckAtMs !== undefined) timingMs["final-check-to-completion"] = elapsed - finalCheckAtMs;
        completed = true;
        completedAt = new Date(event.at).toISOString();
        break;
      }
      case "run.error": {
        timingMs.terminal = elapsed;
        error = `${event.stage}: ${event.message}`;
        errorStage = event.stage;
        failedAtMs = elapsed;
        failedAt = new Date(event.at).toISOString();
        rejected = (event.stage === "gate" && gate?.proceed === false)
          || (event.stage === "perception" && event.message === UNUSABLE_CAPTURE_MESSAGE);
        break;
      }
    }
    if (stage && "latencyMs" in event) timingMs[stage] = (timingMs[stage] ?? 0) + event.latencyMs;
    if (stage || event.type === "run.completed" || event.type === "run.error") {
      const latency = "latencyMs" in event ? ` (+${event.latencyMs} ms)` : "";
      const tokenStage = stage ?? (event.type === "run.error" && event.stage !== "unknown" ? event.stage : undefined);
      const tokens = tokenStage ? usage[tokenStage] : undefined;
      const identity = event.type === "perception.done" ? ` · ${profile?.object_class ?? "unclassified"} · ${profile?.device_type}` : "";
      const check = event.type === "selfcheck.done" ? ` · ${event.result.passed ? "passed" : "held"} (${inspections.at(-1)?.ruleIds.join(", ") || "no findings"})` : "";
      const briefingNote = briefing && event.type === "summary.done" ? ` · ${briefing}` : "";
      progress(`${id} ${elapsed} ms · ${stage ?? event.type}${latency}${identity}${check}${briefingNote}${tokens ? ` · ${JSON.stringify(tokens)}` : ""}${error ? ` · ${error}` : ""}`);
    }
  }, signal, { completeBeforeBriefing: true })));
  const outcome = completed ? "completed" : rejected
    ? UNUSABLE_FIXTURES.has(id) ? "expected rejection" : "unexpected rejection"
    : "failed";
  if (completed && context.profile && context.assessment && context.check) {
    chiefCase?.({ assessment: context.assessment, profile: context.profile, check: context.check });
  }
  const gateUnavailable = gate?.reason?.startsWith("Gate unavailable") ?? false;
  return { id, kind: input.kind, expectedDevice, dropPoint, gate, profile, placedAsset, summaryText, briefing, timingMs, usage, assessments, inspections,
    startedAt, completedAt, failedAt, failedAtMs, errorStage, outcome, diagnostics, gateUnavailable, revisionFailed,
    transcript: chiefCase ? transcript : undefined,
    error: error ?? (completed ? undefined : "Run did not finish.") };
}

function stats(values: number[]) {
  if (!values.length) return { n: 0, p50: null, p95: null, max: null };
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const p50 = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { n: sorted.length, p50, p95: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted[sorted.length - 1] };
}

function summarize(samples: Sample[]) {
  return (["all", ...KINDS] as const).flatMap((kind) => {
    const group = kind === "all" ? samples : samples.filter((sample) => sample.kind === kind);
    return STAGES.flatMap((stage) => {
      const times = group.flatMap(({ timingMs }) => timingMs[stage] ?? []);
      const tokens = Object.fromEntries(TOKEN_FIELDS.flatMap((field) => {
        const reported = group.flatMap(({ usage }) => usage[stage]?.[field] ?? []);
        return reported.length ? [[field, stats(reported)]] : [];
      }));
      if (!times.length && !Object.keys(tokens).length) return [];
      return [{ kind, stage, milliseconds: stats(times), tokens }];
    });
  });
}

function completionCounts(samples: Sample[]) {
  return (["all", ...KINDS] as const).flatMap((kind) => {
    const group = kind === "all" ? samples : samples.filter((sample) => sample.kind === kind);
    if (!group.length) return [];
    const usable = group.filter(({ id }) => !UNUSABLE_FIXTURES.has(id));
    const completed = group.filter(({ outcome }) => outcome === "completed");
    const expectedRejections = group.filter(({ outcome }) => outcome === "expected rejection").length;
    const unexpectedRejections = group.filter(({ outcome }) => outcome === "unexpected rejection").length;
    return [{
      kind,
      attempted: group.length,
      completed: completed.length,
      expectedRejections,
      unexpectedRejections,
      failed: group.filter(({ outcome }) => outcome === "failed").length,
      gateUnavailable: group.filter((sample) => sample.gateUnavailable).length,
      usableAttempted: usable.length,
      usableCompleted: usable.filter(({ outcome }) => outcome === "completed").length,
      unusableCompleted: completed.filter(({ id }) => UNUSABLE_FIXTURES.has(id)).length,
      completionMs: stats(completed.flatMap(({ timingMs }) => timingMs.total ?? [])),
    }];
  });
}

const EXECUTION_STAGES = [
  "input", "link", "gate", "perception", "as-dropped", "reasoning", "selfcheck", "revision", "post-revision", "summary", "unknown",
] as const;

function stageOutcomes(samples: Sample[]) {
  return EXECUTION_STAGES.flatMap((stage) => {
    const terminalFailures = samples.filter((sample) => sample.errorStage === stage && sample.outcome === "failed");
    const rejected = samples.filter((sample) => sample.errorStage === stage
      && (sample.outcome === "expected rejection" || sample.outcome === "unexpected rejection"));
    const recovered = samples.filter((sample) =>
      (stage === "revision" && sample.revisionFailed)
      || (stage === "gate" && sample.gateUnavailable)
      || (stage === "summary" && sample.briefing === "status"));
    const completed = samples.filter((sample) => stage === "input" ? sample.errorStage !== "input"
      : stage !== "unknown" && sample.timingMs[stage] !== undefined
      && !recovered.includes(sample) && !rejected.includes(sample));
    const failureCauses = new Map<string, number>();
    for (const sample of terminalFailures) {
      const diagnostic = sample.diagnostics.findLast(({ event }) => event === "failure");
      const cause = diagnostic
        ? [diagnostic.status && `HTTP ${diagnostic.status}`, diagnostic.name, diagnostic.code, diagnostic.message].filter(Boolean).join(" · ")
        : sample.error ?? "No terminal event";
      failureCauses.set(cause, (failureCauses.get(cause) ?? 0) + 1);
    }
    if (!completed.length && !terminalFailures.length && !recovered.length && !rejected.length) return [];
    return [{
      stage,
      completed: completed.length,
      failed: terminalFailures.length,
      rejected: rejected.length,
      recovered: recovered.length,
      completedMs: stats(completed.flatMap(({ timingMs }) => stage === "input" || stage === "unknown" ? [] : timingMs[stage] ?? [])),
      failureCauses: Object.fromEntries(failureCauses),
    }];
  });
}

function tokenText(tokens: Record<string, ReturnType<typeof stats>>, field: keyof GeminiUsage): string {
  const value = tokens[field];
  return value ? `${value.p50} / ${value.max}` : "—";
}

async function compareOne(item: EvaluationItem, signal: AbortSignal, clients: ReturnType<typeof geminiClients>) {
  const { id, input, expected } = item;
  if (input.kind !== "text") throw new Error(`Missing text fixture ${id}.`);
  const twin = SEED_TWIN;
  const drop = resolveDropPoint(twin);
  const perceptionSignal = AbortSignal.any([signal, AbortSignal.timeout(45_000)]);
  const profile = await perceive(clients.interactions, captureEvidence(input), perceptionSignal);
  const candidate = assetFromProfile(profile, twin, "NEW-BENCH", drop);
  const context = { profile, twin, candidate, reassess: false, asDropped: checkAsDropped(twin, candidate) };
  async function measure(thinking: "low" | "medium") {
    const usage: GeminiUsage = {};
    const started = performance.now();
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(180_000)]);
    const result = await withGeminiUsage((_model, attempt) => addUsage(usage, attempt), () =>
      assessDevice(clients.interactions, context, deadline, () => undefined, thinking))
      .catch((error: unknown) => ({ error: providerFailure(error) }));
    const latencyMs = Math.round(performance.now() - started);
    if ("error" in result) return { ...result, latencyMs, usage };
    const { assessment, disagreements } = groundAssessment(twin, candidate, result.value, id, {
      passive: profile.object_class === "passive_object",
      reviewedPaths: result.reviewedPaths,
      passiveModelClaims: result.passiveModelClaims,
    });
    const checked = checkPlacement(twin, candidate, assessment, disagreements, false, false);
    const placed = atRecommendedPlacement(twin, candidate, assessment);
    const placement = {
      area: assessment.physical_placement.area,
      level: assessment.placement.level,
      zone: assessment.placement.network_area,
      conduit: assessment.placement.conduit,
      x: placed?.physical.x ?? null,
      y: placed?.physical.y ?? null,
    };
    const labelMatch = (!expected.areas.length || expected.areas.includes(placement.area))
      && (!expected.levels.length || expected.levels.includes(placement.level));
    return { placement, checked: checked.passed, labelMatch, latencyMs, usage };
  }
  const [low, medium] = await Promise.all([measure("low"), measure("medium")]);
  const pair = !("error" in low) && !("error" in medium);
  const bothPlaceable = pair && low.placement.x !== null && medium.placement.x !== null;
  return {
    id, device: profile.device_type, low, medium,
    areaLevelAgree: pair ? low.placement.area === medium.placement.area && low.placement.level === medium.placement.level : null,
    exactPlacementAgree: bothPlaceable ? JSON.stringify(low.placement) === JSON.stringify(medium.placement) : null,
    verdictAgree: pair ? low.checked === medium.checked : null,
  };
}

async function compare(items: EvaluationItem[], signal: AbortSignal, workers: number) {
  const clients = geminiClients();
  const fixtures = QUALITY_IDS.map((id) => {
    const item = items.find((item) => item.id === id);
    if (!item) throw new Error(`Missing fixture ${id}.`);
    return item;
  });
  type Row = Awaited<ReturnType<typeof compareOne>> | { id: string; error: string; areaLevelAgree: null };
  const rows: Row[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, fixtures.length) }, async () => {
    while (!signal.aborted && next < fixtures.length) {
      const index = next++;
      const item = fixtures[index];
      const row = await compareOne(item, signal, clients).catch((error: unknown): Row =>
        ({ id: item.id, error: providerFailure(error), areaLevelAgree: null }));
      console.error(`${item.id} · ${JSON.stringify(row)}`);
      rows[index] = row;
    }
  }));
  return rows.filter(Boolean);
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    n: { type: "string", default: "1" }, kind: { type: "string", default: "all" },
    suite: { type: "string", default: "default" },
    "chief-samples": { type: "string", default: "0" },
    limit: { type: "string" },
    json: { type: "boolean" }, compare: { type: "boolean" }, workers: { type: "string", default: "1" },
    help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Usage: tsx --env-file=.env scripts/bench-pipeline.ts [--suite default|object-photos|mixed|links|reliability|transcript] [--chief-samples N] [--limit fixtures] [--n runs-per-fixture] [--kind all|text|photo|link] [--workers N] [--json] [--compare]");
    return;
  }
  const n = Number(values.n);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("--n must be a positive integer.");
  const workers = Number(values.workers);
  if (!Number.isSafeInteger(workers) || workers < 1) throw new Error("--workers must be a positive integer.");
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error("--limit must be a positive integer.");
  const suite = SUITES.find((candidate) => candidate === values.suite);
  if (!suite) throw new Error(`--suite must be one of ${SUITES.join(", ")}.`);
  const chiefSamples = Number(values["chief-samples"]);
  if (!Number.isSafeInteger(chiefSamples) || chiefSamples < 0 || (chiefSamples > 0 && suite !== "transcript")) {
    throw new Error("--chief-samples requires a nonnegative integer and --suite transcript.");
  }
  const kinds = KINDS.filter((kind) => values.kind === "all" || values.kind === kind);
  if (!kinds.length) throw new Error("--kind must be all, text, photo or link.");
  const needsDataset = values.compare || kinds.some((kind) => kind !== "text") || suite === "mixed" || suite === "reliability";
  const dataset = needsDataset ? await loadDataset() : { items: [], errors: [] };
  if (dataset.errors.length) throw new Error(dataset.errors.join("\n"));
  const controller = new AbortController();
  process.once("SIGINT", () => {
    controller.abort();
    process.exitCode = 130;
  });
  if (values.compare) {
    const rows = await compare(dataset.items, controller.signal, workers);
    console.log(JSON.stringify(rows, null, 2));
    if (!controller.signal.aborted && rows.some(({ areaLevelAgree }) => areaLevelAgree === null)) process.exitCode = 1;
    return;
  }
  const fixtures = (await selectFixtures(suite, kinds, dataset.items)).slice(0, limit);
  if (!fixtures.length) throw new Error("The selected suite has no fixtures of this input kind.");
  const jobs = Array.from({ length: n }, () => fixtures).flat();
  const concurrency = Math.min(workers, jobs.length);
  const results: Sample[] = [];
  const chiefCases: ChiefCase[] = [];
  const progress = (message: string) => console.error(message);
  console.error(`Carbon thinking: ${THINKING.reasoning} · suite ${suite} · ${fixtures.length} fixtures × ${n} run(s) · ${concurrency} worker(s)`);
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (!controller.signal.aborted && next < jobs.length) {
      const index = next++;
      results[index] = await capture(jobs[index], controller.signal, progress,
        suite === "transcript" ? (value) => { chiefCases[index] = value; } : undefined);
    }
  }));
  const samples = results.filter(Boolean);
  const summary = summarize(samples);
  const completion = completionCounts(samples);
  const execution = stageOutcomes(samples);
  const chief = samples.flatMap(({ id, timingMs, briefing }) => timingMs.summary === undefined ? [] :
    [{ id, milliseconds: timingMs.summary, source: briefing, scope: "full capture" }]);
  const completedChiefCases = chiefCases.filter(Boolean);
  if (completedChiefCases.length && chiefSamples > chief.length) {
    const client = geminiClients().interactions;
    for (let index = 0; chief.length < chiefSamples && !controller.signal.aborted; index += 1) {
      const { assessment, profile, check } = completedChiefCases[index % completedChiefCases.length];
      const started = performance.now();
      const { kind } = await briefEngineerWithinDeadline(client, SEED_TWIN, assessment, check, controller.signal, profile);
      const milliseconds = Math.round(performance.now() - started);
      chief.push({ id: profile.device_type, milliseconds, source: kind === "ready" ? "neon" : "status", scope: "Neon only" });
      progress(`Chief ${chief.length}/${chiefSamples} · ${milliseconds} ms · ${kind}`);
    }
  }
  const chiefTiming = { samples: chief, readyMs: stats(chief.filter(({ source }) => source === "neon").map(({ milliseconds }) => milliseconds)) };
  if (values.json) console.log(JSON.stringify({
    thinking: THINKING.reasoning, suite, workers: concurrency, completion, execution, samples, summary, chiefTiming,
  }, null, 2));
  else {
    if (suite === "transcript") {
      for (const sample of samples) console.table(sample.transcript);
      console.table(chief);
      console.log(chiefTiming.readyMs);
    }
    console.table(completion.map(({ completionMs, ...counts }) => ({
      ...counts, "p50 ms": completionMs.p50, "p95 ms": completionMs.p95,
    })));
    console.table(execution.map(({ completedMs, failureCauses, ...counts }) => ({
      ...counts, "p50 ms": completedMs.p50, "p95 ms": completedMs.p95,
    })));
    for (const { stage, failureCauses } of execution) {
      if (Object.keys(failureCauses).length) console.log(stage, failureCauses);
    }
    console.table(summary.map(({ kind, stage, milliseconds, tokens }) => ({
      kind, stage, n: milliseconds.n, "p50 ms": milliseconds.p50, "p95 ms": milliseconds.p95, "max ms": milliseconds.max,
      "input p50/max": tokenText(tokens, "inputTokens"), "output p50/max": tokenText(tokens, "outputTokens"),
      "thought p50/max": tokenText(tokens, "thoughtTokens"), "cached p50/max": tokenText(tokens, "cachedTokens"),
      "total p50/max": tokenText(tokens, "totalTokens"),
    })));
  }
  if (!controller.signal.aborted && samples.some(({ outcome }) => outcome === "failed" || outcome === "unexpected rejection")) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Pipeline benchmark failed.");
  process.exitCode ||= 1;
});
