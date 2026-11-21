/** Captures reviewer-readable expected answers, predictions and item-level diagnoses. */
import { isKnownTechnique } from "@/data/attack-ics";
import { labelMatches, normalizedPort, normalizedSize } from "./metrics";
import { SIDES, type EvaluatedItem, type EvaluationItem, type Observation, type Side } from "./types";

export const DIAGNOSIS_CATEGORIES = [
  "perception miss", "wrong zone", "rule conflict", "hallucinated technique",
  "gate error", "object classification", "invented cyber claim", "physical-safety omission",
  "timeout", "risk omission", "product link retrieval", "execution error",
] as const;
export type DiagnosisCategory = typeof DIAGNOSIS_CATEGORIES[number];

export interface Diagnosis { side: Side; category: DiagnosisCategory; detail: string }

function output(observation: Observation, probability?: number) {
  const { prediction, status, error, ruleCheck, latencyMs, gateEvidence, gateFallback, objectAssessment } = observation;
  const profile = prediction?.profile;
  return {
    status,
    accepted: prediction?.accepted ?? null,
    deviceType: profile?.device_type ?? null,
    category: profile?.category ?? null,
    physicalKind: profile?.physical_kind ?? null,
    radios: profile?.radios ?? null,
    ports: profile?.ports ?? null,
    defaultCredentials: profile?.default_credentials_visible ?? null,
    cloud: profile?.cloud_connectivity ?? null,
    capacity: profile?.capacity_or_size ?? null,
    area: prediction?.recommendation?.physical_placement.area ?? null,
    level: prediction?.recommendation?.placement.level ?? null,
    neverAreas: prediction?.neverAreas ?? [],
    riskTags: prediction?.riskTags ?? [],
    techniques: prediction?.techniques ?? [],
    filteredUnknownTechniques: prediction?.filteredUnknownTechniques ?? [],
    rulesPassed: ruleCheck?.passed ?? null,
    ruleFindings: ruleCheck?.detail ?? [],
    typeProbability: probability ?? null,
    latencyMs,
    gateEvidence,
    gateFallback,
    objectAssessment,
    error,
  };
}

export type Answer = ReturnType<typeof output>;

function diagnose(row: EvaluatedItem, side: Side): Diagnosis[] {
  const observation = row.observations[side];
  if (!observation) return [];
  const { expected } = row.item;
  const { error, prediction, objectAssessment } = observation;
  const diagnostics: Diagnosis[] = [];
  const add = (category: DiagnosisCategory, detail: string) => diagnostics.push({ side, category, detail });
  if (error) {
    const category = error.timeout ? "timeout" : error.stage === "gate" ? "gate error"
      : error.stage === "link" && objectAssessment ? "product link retrieval" : "execution error";
    add(category, `${error.stage} · ${error.message}`);
  }
  const gate = observation.gateEvidence;
  const device = gate?.is_device;
  const readable = gate?.is_readable;
  const route = gate?.object_class ?? gate?.route;
  const gateDetail = typeof device?.value === "number" && typeof readable?.value === "number" && route
    ? ` P(device) ${device.value.toFixed(2)}, confidence ${device.confidence.toFixed(2)}, P(readable) ${readable.value.toFixed(2)}, route ${route.value} (${route.confidence.toFixed(2)} confidence).`
    : "";
  if (objectAssessment) {
    const { isDevice, objectClass, classSource, cyberClaims, safetyDrop } = objectAssessment;
    if (isDevice !== null && isDevice !== expected.isDevice) {
      add("object classification", `Classified as ${objectClass ?? (isDevice ? "device" : "non-device")} using ${classSource}.${gateDetail}`);
    }
    if (prediction?.accepted === false && expected.isDevice) add("gate error", `Stopped a labeled device as unusable.${gateDetail}`);
    if (cyberClaims.length) add("invented cyber claim", `Published ${cyberClaims.join(", ")} for a labeled non-device.`);
    if (safetyDrop && !safetyDrop.concerns.length) {
      const context = prediction?.accepted === false ? (side === "system" ? " The usability gate stopped this capture." : " The baseline declined assessment.") : "";
      add("physical-safety omission", `No as-dropped physical or food-safety concern for ${safetyDrop.area}.${context}`);
    }
  } else {
    if (prediction?.accepted === true && !expected.isDevice) add("gate error", `Accepted a negative capture.${gateDetail}`);
    if (prediction?.accepted === false && expected.isDevice) add("gate error", `Rejected a labeled device.${gateDetail}`);
  }

  const profile = prediction?.profile;
  if (expected.isDevice && profile) {
    const differences: string[] = [];
    if (expected.category && profile.category !== expected.category) differences.push("category");
    if (expected.physicalKind && profile.physical_kind !== expected.physicalKind) differences.push("physical kind");
    if (expected.radios) {
      const { matches, union } = labelMatches(expected.radios, profile.radios, (radio) => radio.toLowerCase());
      if (matches !== union) differences.push("radios");
    }
    if (expected.ports) {
      const { matches, union } = labelMatches(expected.ports, profile.ports, normalizedPort);
      if (matches !== union) differences.push("ports");
    }
    if (expected.cloud !== undefined && profile.cloud_connectivity !== expected.cloud) differences.push("cloud flag");
    if (expected.defaultCredentials !== undefined && profile.default_credentials_visible !== expected.defaultCredentials) differences.push("default credentials flag");
    if (expected.capacity && (!profile.capacity_or_size || normalizedSize(profile.capacity_or_size) !== normalizedSize(expected.capacity))) differences.push("capacity or size");
    const probability = row.judge?.answers[side]?.probability;
    if (probability !== undefined && probability < 0.5) differences.push(`device type (P(match) ${probability.toFixed(2)})`);
    if (differences.length) add("perception miss", `Label mismatch in ${differences.join(", ")}.`);
  }

  const recommendation = prediction?.recommendation;
  if (recommendation) {
    const area = recommendation.physical_placement.area;
    const level = recommendation.placement.level;
    if (expected.neverAreas.includes(area)) add("wrong zone", `Recommended forbidden area ${area}.`);
    else if ((expected.areas.length && !expected.areas.includes(area)) || (expected.levels.length && !expected.levels.includes(level))) {
      add("wrong zone", `Recommended ${area} at Purdue ${level}, outside the labeled placements.`);
    }
    if (observation.ruleCheck?.passed === false) add("rule conflict", observation.ruleCheck.detail.join(" · "));
  } else if (profile && expected.areas.length && !error) {
    add("wrong zone", "Returned a device profile without a placement.");
  }

  const unknown = prediction?.techniques.filter((id) => !isKnownTechnique(id)) ?? [];
  if (unknown.length) add("hallucinated technique", `Cited unknown ATT&CK IDs ${unknown.join(", ")}.`);
  if (prediction?.filteredUnknownTechniques.length) add("hallucinated technique",
    `The pipeline filtered unknown IDs ${prediction.filteredUnknownTechniques.join(", ")}.`);
  const missed = expected.riskTags.filter((tag) => !prediction?.riskTags.includes(tag));
  if (missed.length && prediction?.accepted && (recommendation || !error)) add("risk omission", `Missed ${missed.join(", ")}.`);
  return diagnostics;
}

export interface CaseResult {
  id: string;
  group: EvaluationItem["group"];
  file?: string;
  inputLabel: string;
  sourceUrl: string;
  license: string;
  labelNote?: string;
  credit?: EvaluationItem["credit"];
  expected: EvaluationItem["expected"];
  answers: Partial<Record<Side, Answer>>;
  diagnoses: Diagnosis[];
}

export function caseResult(row: EvaluatedItem): CaseResult {
  const { id, group, input, sourceUrl, license, credit, expected, notes } = row.item;
  const answers: CaseResult["answers"] = {};
  for (const side of SIDES) {
    const observation = row.observations[side];
    if (observation) answers[side] = output(observation, row.judge?.answers[side]?.probability);
  }
  return {
    id, group, sourceUrl, license, credit, expected, answers, labelNote: notes || undefined,
    file: input.kind === "photo" ? input.file : undefined,
    inputLabel: input.kind === "photo" ? input.file : input.kind === "link" ? new URL(input.url).hostname : "Text capture",
    diagnoses: SIDES.flatMap((side) => diagnose(row, side)),
  };
}
