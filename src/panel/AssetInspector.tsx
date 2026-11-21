/** Selected asset identity, live telemetry and related Inspector findings. */
"use client";

import { Activity, Cloud, Crosshair, HardDrive, LockKeyhole, MapPin, Radio, Shield, ShieldAlert, Unplug } from "lucide-react";
import { formatTelemetry, telemetryNumber, withTelemetryUnit } from "@/floor/telemetryFormat";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset, RuleFinding, TelemetryPoint } from "@/twin/types";
import { Disclosure, PanelHeading, PurdueBadge, readableId, TechniqueChip } from "./PanelParts";
import { RISK_ICONS } from "./RiskList";

function CyberFlags({ cyber }: { cyber: NonNullable<Asset["cyber"]> }) {
  const ManageIcon = cyber.managed ? Shield : ShieldAlert;
  return (
    <div className="pw-panel-chips" aria-label="Cyber flags">
      <span className="pw-panel-chip" data-tone={cyber.managed ? undefined : "attention"}><ManageIcon size={12} aria-hidden />{cyber.managed ? "Managed" : "Unmanaged"}</span>
      {cyber.defaultCredentials && <span className="pw-panel-chip" data-tone="attention"><LockKeyhole size={12} aria-hidden />Default credentials</span>}
      {cyber.cloudConnected && <span className="pw-panel-chip"><Cloud size={12} aria-hidden />Cloud-connected</span>}
      {cyber.remoteAccess && <span className="pw-panel-chip"><Unplug size={12} aria-hidden />Remote access</span>}
      {cyber.removableStorage && <span className="pw-panel-chip"><HardDrive size={12} aria-hidden />Removable storage</span>}
      {cyber.radios.map((radio) => <span key={radio} className="pw-panel-chip"><Radio size={12} aria-hidden />{radio === "wifi" ? "Wi-Fi" : radio}</span>)}
    </div>
  );
}

function TelemetryRow({ point: { tag, label, value, unit, lo, hi } }: { point: TelemetryPoint }) {
  const outside = (lo != null && value < lo) || (hi != null && value > hi);
  const hasBand = Number.isFinite(value) && (lo != null || hi != null);
  const limits = lo != null && hi != null ? `${telemetryNumber(lo, unit)}–${telemetryNumber(hi, unit)}`
    : lo != null ? `≥ ${telemetryNumber(lo, unit)}` : hi != null ? `≤ ${telemetryNumber(hi, unit)}` : null;
  const band = limits && withTelemetryUnit(limits, unit);
  return (
    <li className="pw-panel-telemetry-row" data-band={hasBand ? outside ? "out" : "in" : undefined}>
      <div><span className="pw-mono">{tag}</span><span>{label}</span></div>
      <div><strong className="pw-mono">{formatTelemetry(value, unit)}</strong>
        {hasBand && band && <span title={`Normal ${band}`}>
          <i aria-hidden="true" />{outside ? "Out of band" : "In band"} · {band}
        </span>}
      </div>
    </li>
  );
}

function FindingRow({ finding }: { finding: RuleFinding }) {
  const Icon = RISK_ICONS[finding.kind];
  return (
    <li>
      <Disclosure label={<span className="pw-panel-finding-label"><Icon size={13} aria-hidden /><strong>{finding.title}</strong>
        <span className="pw-panel-chip pw-mono" title={`Severity ${finding.severity} of 5`}>S{finding.severity}</span></span>}>
        <p>{finding.detail}</p>
        {finding.fix && <p><strong>Mitigation</strong> {finding.fix}</p>}
        {finding.technique && <TechniqueChip technique={finding.technique} />}
        {finding.references.length > 0 && <ul className="pw-panel-bullets">{finding.references.map((reference, index) => <li key={index}>{reference}</li>)}</ul>}
      </Disclosure>
    </li>
  );
}

export function AssetInspector() {
  const selectedArea = useTwinStore((state) => state.twin.areas.find((candidate) => candidate.id === state.selectedId));
  const asset = useTwinStore((state) => state.selectedId ? assetById(state.twin, state.selectedId) : undefined);
  const area = useTwinStore((state) => asset ? areaById(state.twin, asset.physical.area) : undefined);
  const conduit = useTwinStore((state) => state.twin.conduits.find((item) => item.id === asset?.network.conduit));
  const findings = useTwinStore((state) => state.risk.findings);
  const select = useTwinStore((state) => state.select);
  if (!asset && selectedArea) return (
    <>
      <PanelHeading icon={MapPin}>Selected area</PanelHeading>
      <div className="pw-panel-asset-identity">
        <h3>{selectedArea.name}</h3><p>{selectedArea.statusNote ?? selectedArea.kind}</p>
      </div>
      <div className="pw-panel-chips" aria-label="Typical Purdue levels">
        {selectedArea.typicalLevels.map((level) => <PurdueBadge key={level} level={level} />)}
      </div>
    </>
  );
  if (!asset) return (
    <>
      <PanelHeading icon={Crosshair}>Asset inspector</PanelHeading>
      <p className="pw-panel-muted">Select an asset on the floor or Purdue map.</p>
    </>
  );

  const assetFindings = findings.filter((finding) => finding.assetId === asset.id);
  const telemetry = asset.process?.telemetry ?? [];
  return (
    <>
      <PanelHeading icon={Crosshair} aside={<span className="pw-panel-chip pw-mono">{asset.id}</span>}>Asset inspector</PanelHeading>
      <div className="pw-panel-asset-identity"><h3>{asset.name}</h3><p>{readableId(asset.physical.kind)}</p></div>
      <dl className="pw-panel-facts">
        <dt>Floor</dt><dd>{area ? (
          <button type="button" className="pw-panel-link" onClick={() => select(area.id)}>{area.name}</button>
        ) : readableId(asset.physical.area)}</dd>
        <dt>Network</dt><dd><PurdueBadge level={asset.network.level} />{asset.network.area}</dd>
        <dt>Conduit</dt><dd>{conduit?.name ?? asset.network.conduit ?? "None"}</dd>
        <dt>Criticality</dt><dd><span className="pw-mono">{asset.criticality}/5</span>{asset.safetyCritical ? "Safety critical" : ""}</dd>
      </dl>
      {asset.cyber && <CyberFlags cyber={asset.cyber} />}
      {telemetry.length > 0 && (
        <div className="pw-panel-subsection">
          <h3><Activity size={13} aria-hidden />Telemetry</h3>
          <ul className="pw-panel-telemetry">{telemetry.map((point) => <TelemetryRow key={point.tag} point={point} />)}</ul>
        </div>
      )}
      {assetFindings.length > 0 && (
        <div className="pw-panel-subsection">
          <h3><ShieldAlert size={13} aria-hidden />Rules engine findings <span className="pw-mono pw-panel-muted">{assetFindings.length}</span></h3>
          <ul className="pw-panel-list">{assetFindings.map((finding, index) => <FindingRow key={`${finding.ruleId}-${index}`} finding={finding} />)}</ul>
        </div>
      )}
    </>
  );
}
