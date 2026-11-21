/** Displays simulated alternatives and applies the exact evaluated effects on a human click. */
"use client";

import { useEffect, useMemo, useState } from "react";
import { clauseById } from "@/data/compliance";
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

function Option({ item, recommended, apply }: { item: EvaluatedCandidate; recommended?: boolean; apply: () => void }) {
  const { candidate, net, complianceReduction, removedClauses, riskDelta } = item;
  const source = candidate.source === "carbon" ? "Proposed by Carbon" : "Rules-engine variant";
  return (
    <article className={styles.card} data-recommended={recommended || undefined}>
      <div className={styles.identity}>
        <LossGlyph kind={candidate.kind} size={36} />
        <div>{recommended && <small className={styles.recommended}>Recommended</small>}<h4>{candidate.name}</h4></div>
        <button type="button" className="pw-panel-button" onClick={apply}>Use this</button>
      </div>
      <p>{candidate.rationale}</p>
      <div className={styles.metrics}>
        <strong data-positive={net !== null && net > 0}>{net === null ? "Cost unestimated" : `${signed(net, usd.format)}/yr est. net`}</strong>
        <span>Risk {signed(riskDelta, points.format)}</span>
        <span>{signed(-complianceReduction)} compliance gaps</span>
      </div>
      {removedClauses.length > 0 && <div className={styles.clauses} aria-label="Removed compliance clauses">
        {removedClauses.map((id) => <span key={id} title={id}>{clauseById(id)?.clause ?? id}</span>)}
      </div>}
      <small>{source} · numbers: rules engine + loss model</small>
      {candidate.cost && <small title={`${usd.format(candidate.cost[0])} low · ${usd.format(candidate.cost[2])} high`}>
        {signed(candidate.cost[1], usd.format)} one-time · {candidate.source === "carbon" ? "Carbon cost estimate" : "modeled labor only"}
      </small>}
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
  const ranked = useMemo(() => evaluateAlternatives(twin, asset.id, [
    ...rules,
    ...mapCarbonCandidates(carbon?.proposals ?? [], changes),
  ]), [twin, asset.id, rules, carbon, changes]);
  const recommended = ranked[0]?.qualifies ? ranked[0] : undefined;
  const others = recommended ? ranked.slice(1) : ranked;
  const [applied, setApplied] = useState<string>();

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
    setApplied(item.candidate.name);
  }

  return (
    <section className={styles.options} aria-label="Better options">
      <div className={styles.heading}><h3>Better options</h3><small>Simulated estimates</small></div>
      {applied && <small role="status">Applied {applied}</small>}
      {request && !carbon && <small role="status">Carbon is looking for better options…</small>}
      {carbon?.unavailable && <small>Carbon unavailable · rules-engine options shown</small>}
      {recommended
        ? <Option item={recommended} recommended apply={() => apply(recommended)} />
        : <small>No option meets both criteria.</small>}
      {others.length > 0 && <details>
        <summary>See all · {ranked.length}</summary>
        {others.map((item, index) => <Option key={`${item.candidate.source}-${item.candidate.name}-${index}`} item={item} apply={() => apply(item)} />)}
      </details>}
    </section>
  );
}
