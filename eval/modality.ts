/** Compares the same device photos with label-only text through the same pipeline. */
import type { CaptureInput, DeviceProfile } from "@/pipeline/types";
import { labelMatches, normalizedPort } from "./metrics";
import { mean, pairedBootstrap, proportion, type Pair } from "./statistics";
import type { EvaluatedItem, EvaluationItem, Observation } from "./types";

export function modalityInput(item: EvaluationItem): Extract<CaptureInput, { kind: "text" }> | null {
  if (item.input.kind !== "photo" || !item.expected.isDevice) return null;
  const description = item.expected.deviceType?.trim().replace(/\s+/g, " ");
  return description ? { kind: "text", description } : null;
}

type Check = (expected: EvaluationItem["expected"], profile?: DeviceProfile | null) => boolean | null;
const checkString = (value?: string | null) => Boolean(value?.trim() && !/^(?:unknown|unspecified|unconfirmed|not (?:visible|verified|available)|n\/?a|none)\b/i.test(value.trim()));
const listCorrect = (expected: string[] | undefined, value: string[] | undefined, normalize: (value: string) => string) => {
  if (!expected) return null;
  if (!value) return false;
  const { matches, union } = labelMatches(expected, value, normalize);
  return matches === union;
};
const radioName = (value: string) => value.trim().toLowerCase();
const visualSources = new Set(["label", "shape", "port", "screen"]);

const CHECKS: { label: string; check: Check }[] = [
  { label: "Radio list matched labels", check: (e, p) => listCorrect(e.radios, p?.radios, radioName) },
  { label: "Port list matched labels", check: (e, p) => listCorrect(e.ports, p?.ports, normalizedPort) },
  { label: "Default-credential flag matched labels", check: (e, p) => e.defaultCredentials === undefined ? null : e.defaultCredentials === p?.default_credentials_visible },
  { label: "Material reported", check: (_, p) => checkString(p?.material) },
  { label: "Ingress rating reported", check: (_, p) => checkString(p?.ip_rating) },
  { label: "Hazardous-area rating reported", check: (_, p) => checkString(p?.hazardous_area_rating) },
  { label: "Food-grade flag reported", check: (_, p) => typeof p?.food_grade === "boolean" },
  { label: "Any evidence item reported", check: (_, p) => Boolean(p?.evidence.length) },
  { label: "Visual cue reported", check: (_, p) => Boolean(p?.evidence.some(({ source }) => visualSources.has(source))) },
];

function modalityRate(pairs: readonly Pair<number>[]) {
  return {
    photo: proportion(pairs.map(({ baseline }) => ({ numerator: baseline, n: 1 }))),
    text: proportion(pairs.map(({ system }) => ({ numerator: system, n: 1 }))),
    photoMinusText: pairedBootstrap(pairs.map(({ baseline, system }) => ({ baseline: system, system: baseline })), mean),
  };
}

interface ModalityPair { item: EvaluationItem; photo: Observation; text: Observation }

export function summarizeModality(rows: readonly EvaluatedItem[], eligible: number, enabled: boolean) {
  const pairs: ModalityPair[] = rows.flatMap(({ item, observations, ablation }) =>
    enabled && modalityInput(item) && observations.system && ablation ? [{ item, photo: observations.system, text: ablation }] : []);
  const metrics = CHECKS.map(({ label, check }) => ({
    label,
    ...modalityRate(pairs.flatMap(({ item: { expected }, photo, text }) => {
      const a = check(expected, photo.prediction?.profile);
      const b = check(expected, text.prediction?.profile);
      return a === null || b === null ? [] : [{ baseline: Number(a), system: Number(b) }];
    })),
  }));
  const evidenceCount = (value: Observation) => value.prediction?.profile?.evidence.length ?? 0;
  const comparable = pairs.filter(({ photo, text }) => typeof photo.asDroppedPassed === "boolean" && typeof text.asDroppedPassed === "boolean");
  return {
    enabled,
    eligible,
    paired: pairs.length,
    metrics,
    evidenceItems: {
      photo: pairedBootstrap(pairs.map(({ photo }) => ({ baseline: 0, system: evidenceCount(photo) })), mean),
      text: pairedBootstrap(pairs.map(({ text }) => ({ baseline: 0, system: evidenceCount(text) })), mean),
      photoMinusText: pairedBootstrap(pairs.map(({ photo, text }) => ({ baseline: evidenceCount(text), system: evidenceCount(photo) })), mean),
    },
    verdictReturned: modalityRate(pairs.map(({ photo, text }) => ({
      baseline: Number(typeof photo.asDroppedPassed === "boolean"), system: Number(typeof text.asDroppedPassed === "boolean"),
    }))),
    verdictAgreement: proportion(comparable.map(({ photo, text }) => ({ numerator: Number(photo.asDroppedPassed === text.asDroppedPassed), n: 1 }))),
    errors: {
      photo: pairs.filter(({ photo }) => photo.status === "error").length,
      text: pairs.filter(({ text }) => text.status === "error").length,
    },
    textCalls: pairs.reduce((total, { text }) => total + (text.providerCalls?.attempts ?? 0), 0),
  };
}

export type ModalitySummary = ReturnType<typeof summarizeModality>;
