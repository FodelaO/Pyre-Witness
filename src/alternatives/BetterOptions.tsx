/** Displays simulated alternatives and applies the exact evaluated effects on a human click. */
"use client";

import { useEffect, useMemo, useState } from "react";
import { LossGlyph } from "@/econ/LossGlyph";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { useRunStore } from "@/pipeline/runStore";
import { evaluatePlacement } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { buildCandidates, mapCarbonCandidates } from "./candidates";
import { captureContext } from "./captureContext";
import { evaluateAlternatives, findingClauseIds, type EvaluatedCandidate } from "./evaluate";
import { alternativesRequestSchema, carbonResponseSchema, type CarbonCandidate } from "./schema";
import styles from "./BetterOptions.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const points = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function signed(value: number, format: (value: number) => string = String) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`;
}

function useCarbon(request: string | null) {
  const [result, setResult] = useState<{ request: string; proposals: CarbonCandidate[]; unavailable: boolean }>();
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    async function load(body: string) {
      try {
        const response = await fetch("/api/alternatives", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: controller.signal });
        const json = await response.json();
        const { unavailable, ...payload } = json;
        const parsed = carbonResponseSchema.safeParse(payload);
        if (!controller.signal.aborted) setResult({
          request: body,
          proposals: response.ok && parsed.success ? parsed.data.candidates : [],
          unavailable: !response.ok || !parsed.success || unavailable === true,
        });
      } catch {
        if (!controller.signal.aborted) setResult({ request: body, proposals: [], unavailable: true });
      }
    }
    void load(request);
    return () => controller.abort();
  }, [request]);
  return result?.request === request ? result : undefined;
}

function Option({ item, apply }: { item: EvaluatedCandidate; apply: () => void }) {
  const { candidate, net, complianceReduction, removedClauses, riskDelta } = item;
  if (net === null || candidate.cost === null) return null;
  const fromCarbon = candidate.source === "carbon";
  const [low, mode, high] = candidate.cost;
  const annual = `${signed(net, usdWhole.format)}/yr`;
  const gaps = `${signed(-complianceReduction)} ${complianceReduction === 1 ? "gap" : "gaps"}`;
  const details = [
    candidate.name,
    candidate.rationale,
    `Source: ${fromCarbon ? "Carbon" : "rules engine"}`,
    `Simulated est. net ${annual} (rules engine + loss model)`,
    `Risk ${signed(riskDelta, points.format)}`,
    `${gaps} in compliance`,
    `One-time cost est. ${usd.format(mode)} (${usd.format(low)} low, ${usd.format(high)} high)${fromCarbon ? "" : ", modeled labor only"}`,
    `Removed clause IDs: ${removedClauses.join(", ") || "none"}`,
  ].join(" · ");
  return (
    <article className={styles.row} title={details} aria-label={details}>
      <LossGlyph kind={candidate.kind} size={22} />
      <span className={styles.name}>{candidate.name}</span>
      <strong className={styles.value}>{annual}</strong>
      <span className={styles.gaps}>{gaps}</span>
      <button type="button" className={`pw-panel-button ${styles.use}`} aria-label={`Use ${candidate.name}`} onClick={apply}>Use</button>
    </article>
  );
}

export function BetterOptions({ asset }: { asset: Asset }) {
  const activeAssessment = useRunStore((state) => state.placedAssetId === asset.id ? state.assessment : null);
  const context = captureContext(asset.id);
  const assessment = activeAssessment ?? context?.assessment;
  return assessment && context?.profile
    ? <ComparedOptions key={asset.id} asset={asset} assessment={assessment} profile={context.profile} />
    : null;
}

type Context = NonNullable<ReturnType<typeof captureContext>>;

function ComparedOptions({ asset: selectedAsset, assessment, profile }: { asset: Asset } & Context) {
  const twin = useEconomicTwin();
  const risk = useTwinStore((state) => state.risk);
  const asset = twin.assets.find(({ id }) => id === selectedAsset.id) ?? selectedAsset;
  const allFindings = risk.findings;
  const findings = useMemo(() => allFindings.filter(({ assetId }) => assetId === asset.id), [allFindings, asset.id]);
  const { rules, changes } = useMemo(() => buildCandidates(twin, asset, profile, assessment, findings), [twin, asset, profile, assessment, findings]);
  const safeProfile = alternativesRequestSchema.shape.profile.safeParse(profile);
  const request = changes.length && safeProfile.success ? JSON.stringify({
    profile: safeProfile.data,
    kind: asset.physical.kind,
    placement: { area: asset.physical.area, level: asset.network.level, zone: asset.network.area },
    findings: findings.slice(0, 48).map(({ ruleId, title, detail, references }) => ({
      ruleId, title, detail, references, clauseIds: findingClauseIds({ references }),
    })),
    changes: changes.map(({ id, description }) => ({ id, description })),
  }) : null;
  const carbon = useCarbon(request);
  const options = useMemo(() => {
    // Rules-engine options show at once; Carbon's proposals join the ranking when they arrive.
    const proposals = carbon && !carbon.unavailable ? mapCarbonCandidates(carbon.proposals, changes) : [];
    return evaluateAlternatives(twin, asset.id, [...rules, ...proposals])
      .filter(({ qualifies }) => qualifies)
      .slice(0, 2);
  }, [twin, asset.id, rules, carbon, changes]);

  function apply(item: EvaluatedCandidate) {
    const store = useTwinStore.getState();
    if (store.risk !== risk || store.selectedId !== asset.id) return;
    const next = applyEffects(store.twin, item.candidate.effects);
    const updated = next.assets.find(({ id }) => id === asset.id);
    if (!updated) return;
    const unsafe = evaluatePlacement(next, updated).findings.some(({ severity }) => severity >= 4);
    store.setTwin({
      ...next,
      assets: next.assets.map((entry) => entry === updated ? { ...entry, placement: unsafe ? "unsafe" : "recommended" } : entry),
    });
  }

  if (!options.length) return null;
  const label = options.length === 1 ? "Better option" : "Better options";
  return (
    <section className={styles.options} aria-label={label}>
      <h3 className={`pw-mono ${styles.heading}`}>{label} · simulated est.</h3>
      {options.map((item, index) => (
        <Option key={`${item.candidate.source}-${item.candidate.name}-${index}`} item={item} apply={() => apply(item)} />
      ))}
    </section>
  );
}
