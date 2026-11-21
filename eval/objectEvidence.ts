/** Scores classification and published safety evidence independently of gate admission. */
import { placementEnvironment, resolveDropPoint } from "@/pipeline/assetFromProfile";
import { OBJECT_CLASSES, type Assessment, type ObjectClass, type PipelineEvent } from "@/pipeline/types";
import type { Twin } from "@/twin/types";
import type { Observation, RunArtifact, Side } from "./types";

type ObjectEvidence = NonNullable<Observation["objectAssessment"]>;
type PublishedRisk = Pick<Assessment["risks"][number], "kind" | "title" | "description" | "technique">;
const validClass = (value: unknown): value is ObjectClass => OBJECT_CLASSES.some((entry) => entry === value);
const physicalContext = /\b(?:open product|contaminat\w*|food[- ](?:contact|safety)|wash[- ]?down|hygien\w*|sanitat\w*|classified (?:zone|area)|hazardous area)\b/i;
const stripped = "Model invented a cyber risk for a passive object.";

function baselineRisks(artifact: RunArtifact): PublishedRisk[] {
  if (artifact.status !== "ok" || !artifact.prediction?.accepted) return [];
  const raw = artifact.raw as { text?: string } | null;
  try {
    const risks = JSON.parse(raw?.text ?? "null")?.risks;
    return Array.isArray(risks) ? risks : [];
  } catch {
    return [];
  }
}

function classification(side: Side, artifact: RunArtifact, events: PipelineEvent[]): Pick<ObjectEvidence, "isDevice" | "classSource" | "objectClass"> {
  if (side === "baseline") {
    const isDevice = artifact.prediction?.accepted ?? null;
    return { isDevice, classSource: isDevice === null ? null : "baseline", objectClass: null };
  }
  const profileClass = artifact.prediction?.profile?.object_class;
  if (validClass(profileClass)) return { isDevice: profileClass !== "passive_object", objectClass: profileClass, classSource: "perception" };
  const gate = events.find((event) => event.type === "gate.done")?.gate.answers;
  const gateClass = gate?.object_class?.value;
  if (validClass(gateClass)) return { isDevice: gateClass !== "passive_object", objectClass: gateClass, classSource: "gate class" };
  const probability = gate?.is_device?.value;
  return typeof probability === "number" && Number.isFinite(probability)
    ? { isDevice: probability >= 0.5, objectClass: null, classSource: "gate probability" }
    : { isDevice: null, objectClass: null, classSource: null };
}

export function observeObject(side: Side, artifact: RunArtifact, isDeviceLabel: boolean, twin: Twin): ObjectEvidence {
  const events = side === "system" && Array.isArray(artifact.raw) ? artifact.raw as PipelineEvent[] : [];
  const classified = classification(side, artifact, events);
  if (isDeviceLabel) return { ...classified, cyberClaims: [], suppressedCyberClaims: false, safetyDrop: null };

  const assessments = events.flatMap((event) =>
    event.type === "reasoning.done" || event.type === "revision.done" ? [event.assessment] : []);
  const checks = events.filter((event) => event.type === "selfcheck.done");
  const risks = side === "baseline" ? baselineRisks(artifact) : assessments.flatMap(({ risks }) => risks);
  const claims = new Set<string>();
  if (artifact.prediction?.profile?.radios.length) claims.add("radios");
  if (artifact.prediction?.profile?.cloud_connectivity === true) claims.add("cloud connectivity");
  if (artifact.prediction?.profile?.default_credentials_visible === true) claims.add("default credentials");
  if (assessments.some(({ attack_paths }) => attack_paths.length)
    || checks.some(({ result }) => result.paths.length)
    || events.some((event) => event.type === "selfcheck.path")) claims.add("attack paths");
  if (artifact.prediction?.techniques.length || risks.some(({ technique }) => technique)
    || checks.some(({ result }) => result.findings.some(({ technique }) => technique))) claims.add("ATT&CK techniques");
  if (risks.some(({ kind }) => kind === "cyber")
    || checks.some(({ result }) => result.findings.some(({ kind }) => kind === "cyber"))) claims.add("cyber risks");

  const actualDrop = events.find((event) => event.type === "run.started")?.dropPoint ?? resolveDropPoint(twin);
  const environment = placementEnvironment(twin, actualDrop);
  const conditions = [...(environment.foodContact ? ["food contact"] : []), ...environment.hazards];
  const concerns = checks.filter(({ phase }) => phase === "as-dropped").flatMap(({ result }) =>
    result.findings.filter(({ kind, ruleId }) => kind === "physical" || (kind === "compliance" && /^(?:FOOD|HAZ)-/.test(ruleId)))
      .map(({ ruleId, title }) => `${ruleId} ${title}`));
  // A structured assessment can also explicitly raise a safety concern at the capture spot.
  for (const risk of risks) {
    const detail = `${risk.title} ${risk.description}`;
    if ((risk.kind === "physical" || risk.kind === "compliance") && physicalContext.test(detail)
      && /\b(?:as[- ]dropped|current (?:spot|location|placement|area)|drop (?:point|location)|filler\s*3)\b/i.test(detail)) concerns.push(risk.title);
  }
  return {
    ...classified, cyberClaims: [...claims],
    suppressedCyberClaims: checks.some(({ result }) => result.disagreements.includes(stripped)),
    safetyDrop: conditions.length ? { area: actualDrop.area, conditions, concerns: [...new Set(concerns)] } : null,
  };
}
