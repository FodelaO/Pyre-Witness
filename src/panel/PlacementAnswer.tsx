/** Recommended floor and network placement, with linked references and one move action. */
"use client";

import { ArrowRight, Check, LocateFixed, MapPin, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { assetLabel } from "@/floor/assetLabel";
import type { LensMode } from "@/layers/lensStore";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import { moveToRecommended } from "@/pipeline/client";
import { useRunStore } from "@/pipeline/runStore";
import type { Assessment, DeviceProfile, SelfCheckResult } from "@/pipeline/types";
import { bestPlacement, evaluatePlacement } from "@/rules/engine";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset, Twin } from "@/twin/types";
import { FindingRow } from "./AssetInspector";
import { Disclosure, PanelHeading, PurdueBadge, readableId } from "./PanelParts";
import { PlacementLoss, samePlacement } from "./PlacementLoss";

function permittedTarget(twin: Twin, asset: Asset, assessment: Assessment, objectClass: DeviceProfile["object_class"]) {
  const target = atRecommendedPlacement(twin, asset, assessment, objectClass);
  if (!target || evaluatePlacement(twin, target).findings.some(({ severity }) => severity >= 4)) return null;
  return target;
}

export function PlacementAnswer({ assessment, placedAssetId, checked, dropped = null, pending, mode, objectClass }: {
  assessment: Assessment;
  placedAssetId: string | null;
  checked: SelfCheckResult | null;
  dropped?: SelfCheckResult | null;
  pending: boolean;
  mode: LensMode;
  objectClass?: DeviceProfile["object_class"];
}) {
  const { placement, physical_placement: physical } = assessment;
  const showPurdueLevel = objectClass !== "passive_object";
  const twin = useEconomicTwin();
  const findings = useTwinStore((state) => state.risk.findings);
  const area = areaById(twin, physical.area);
  const near = physical.near_asset_id ? assetById(twin, physical.near_asset_id) : undefined;
  const conduit = twin.conduits.find(({ id }) => id === placement.conduit);
  const placed = placedAssetId ? assetById(twin, placedAssetId) : undefined;
  const select = useTwinStore((state) => state.select);
  const [movedFor, setMovedFor] = useState<Assessment>();
  const target = useMemo(() => placed && !pending && checked?.passed
    ? permittedTarget(twin, placed, assessment, objectClass) : null, [twin, placed, assessment, pending, checked, objectClass]);
  const held = Boolean(!pending && checked && (!checked.passed || (placed && !target)));
  const alternative = useMemo(() => held && placed ? bestPlacement(twin, placed) : null, [held, placed, twin]);
  const option = alternative?.placement;
  const atTarget = Boolean(placed && target && samePlacement(placed, target));
  const remaining = atTarget ? findings.filter(({ assetId }) => assetId === placedAssetId) : [];
  const floor = (
    <div className="pw-panel-location">
      {area ? <button type="button" className="pw-panel-link" onClick={() => select(area.id)}>{area.name}</button> : readableId(physical.area)}
      {near && <span>near <button type="button" className="pw-panel-link pw-mono" title={near.name} onClick={() => select(near.id)}>{assetLabel(near)}</button></span>}
    </div>
  );
  // One disclosure for every sentence behind the answer, so the card reads as place, level, action.
  const reasons = physical.physical_constraints.length + (physical.position_hint ? 1 : 0) + (placement.why ? 1 : 0);
  const why = reasons > 0 && (
    <Disclosure label={<span className="pw-panel-muted">Why here <span className="pw-mono">{reasons}</span></span>}>
      {physical.position_hint && <p><strong>Position</strong> {physical.position_hint}</p>}
      {physical.physical_constraints.length > 0 && (
        <ul className="pw-panel-bullets">{physical.physical_constraints.map((constraint, index) => <li key={index}>{constraint}</li>)}</ul>
      )}
      {placement.why && <p><strong>Network</strong> {placement.why}</p>}
    </Disclosure>
  );
  const network = (
    <div className="pw-panel-placement-zone">{showPurdueLevel && <PurdueBadge level={placement.level} />}<span>{placement.network_area}
      {placement.conduit && <> · {conduit?.name ?? readableId(placement.conduit)}</>}</span></div>
  );

  return (
    <>
      <PanelHeading icon={MapPin} aside={target && <span className="pw-panel-chip" data-tone="ok">Rules engine cleared</span>}>Where it goes</PanelHeading>
      {held ? <div className="pw-panel-placement" data-held>
        <strong className="pw-panel-placement-hold"><ShieldAlert size={16} aria-hidden />No compliant spot: hold</strong>
        <p>The rules engine blocked the recommendation{area ? ` in ${area.name}` : ""}.</p>
        {option && <div className="pw-panel-placement-alternative">
          <strong>{alternative?.compliant ? "Rules engine alternative" : "Best option still blocked"}</strong>
          <div className="pw-panel-location">
            <button type="button" className="pw-panel-link" onClick={() => select(option.area)}>
              {areaById(twin, option.area)?.name ?? readableId(option.area)}
            </button>
            {showPurdueLevel && <PurdueBadge level={option.level} />}
            <span>{option.networkArea}</span>
          </div>
          <p className="pw-panel-muted">{alternative?.compliant ? "Review functional fit before moving." : option.blocking[0]?.title}</p>
        </div>}
      </div> : <div className="pw-panel-placement">
        {mode === "data" ? <>{network}{floor}</> : <>{floor}{network}</>}
        {why}
        <button type="button" className="pw-panel-button pw-panel-move" disabled={!target}
          title={!placed ? "Available when the device is on the twin" : pending || !checked ? "Requires a completed placement check"
            : !target ? "No valid spot for this recommendation" : atTarget ? "Select the device on the twin" : undefined}
          onClick={() => {
            if (!placed || !target || useRunStore.getState().assessment !== assessment) return;
            const latest = useTwinStore.getState().twin;
            const current = assetById(latest, placed.id);
            const destination = current && permittedTarget(latest, current, assessment, objectClass);
            if (!current || !destination) return;
            if (!samePlacement(current, destination)) {
              moveToRecommended(current.id);
              const moved = assetById(useTwinStore.getState().twin, current.id);
              if (moved && samePlacement(moved, destination)) setMovedFor(assessment);
            }
            select(placed.id);
          }}>
          {atTarget ? <><Check size={14} aria-hidden />At recommended location</> : <><LocateFixed size={14} aria-hidden />Move there<ArrowRight size={14} aria-hidden /></>}
        </button>
        {remaining.length > 0 && <Disclosure label={`Remaining findings · ${remaining.length}`}>
          <ul className="pw-panel-list">{remaining.map((finding, i) => <FindingRow key={`${finding.ruleId}-${i}`} finding={finding} />)}</ul>
        </Disclosure>}
      </div>}
      <PlacementLoss target={target} dropped={dropped} checked={checked} atTarget={atTarget}
        moveConfirmed={movedFor === assessment} />
    </>
  );
}
