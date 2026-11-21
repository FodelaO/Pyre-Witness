/** Device identity, observed interfaces, ratings and perception evidence. */
"use client";

import { Bluetooth, Cloud, Droplets, Flame, HardDrive, Layers, LockKeyhole, Nfc, Plug, Radio, RadioTower, Ruler, ScanLine, Utensils, Wifi, type LucideIcon } from "lucide-react";
import type { DeviceProfile, Evidence } from "@/pipeline/types";
import type { Radio as RadioKind } from "@/twin/types";
import { Disclosure, PanelHeading, percent, readableId, TextPreview } from "./PanelParts";

const RADIOS: Record<RadioKind, { label: string; icon: LucideIcon }> = {
  wifi: { label: "Wi-Fi", icon: Wifi },
  bluetooth: { label: "Bluetooth", icon: Bluetooth },
  cellular: { label: "Cellular", icon: RadioTower },
  zigbee: { label: "Zigbee", icon: Radio },
  lora: { label: "LoRa", icon: RadioTower },
  nfc: { label: "NFC", icon: Nfc },
};

function DeviceChip({ icon: Icon, label, attention = false }: { icon: LucideIcon; label: string; attention?: boolean }) {
  return <span className="pw-panel-chip" data-tone={attention ? "attention" : undefined}><Icon size={12} aria-hidden />{label}</span>;
}

function EvidenceRows({ evidence }: { evidence: Evidence[] }) {
  return (
    <Disclosure label={<span>Evidence <span className="pw-mono pw-panel-muted">{evidence.length}</span></span>}>
      <ul className="pw-panel-evidence">
        {evidence.map((item, index) => {
          const confidence = percent(item.confidence);
          return (
            <li key={`${item.source}-${index}`}>
              <p>{item.claim}</p>
              <div className="pw-panel-evidence-meta pw-mono">
                <span>{readableId(item.source)}</span>
                <meter value={confidence} min={0} max={100} aria-label="Evidence confidence" />
                <span>{confidence}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Disclosure>
  );
}

export function DeviceCard({ profile, thumbnail }: { profile: DeviceProfile; thumbnail?: string }) {
  const model = [profile.vendor, profile.model].filter(Boolean).join(" · ");
  const storage = profile.storage?.trim();
  const storageChip = storage && !/^(none|no|n\/?a|unknown)$/i.test(storage);
  const removable = profile.category === "removable_storage" || (storage && !/\b(no|not|without|none|unknown)\b/i.test(storage)
    && /\b(removable|(?:micro[ -]?)?SD(?:HC|XC)?|USB (?:drive|storage)|flash drive)\b/i.test(storage));
  const showRatings = profile.ip_rating || profile.hazardous_area_rating || profile.food_grade != null || profile.material || profile.capacity_or_size;
  return (
    <>
      <PanelHeading icon={ScanLine}>Device profile</PanelHeading>
      <div className="pw-panel-device-identity">
        {thumbnail && (
          <div className="pw-panel-device-photo">
            <ScanLine size={24} aria-hidden />
            {/* Captures may be inline images or user-submitted product snapshots. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={thumbnail} src={thumbnail} alt="Device preview" width={56} height={56} referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.hidden = true; }} />
          </div>
        )}
        <div><h3>{profile.device_type}</h3>{model && <p>{model}</p>}</div>
      </div>
      {(profile.radios.length > 0 || profile.ports.length > 0 || storageChip || removable || profile.default_credentials_visible || profile.cloud_connectivity) && (
        <div className="pw-panel-chips" aria-label="Device interfaces and flags">
          {profile.radios.map((radio) => <DeviceChip key={radio} {...RADIOS[radio]} />)}
          {profile.ports.map((port, index) => <DeviceChip key={`${port}-${index}`} icon={Plug} label={port} />)}
          {profile.default_credentials_visible && <DeviceChip icon={LockKeyhole} label="Default credentials seen" attention />}
          {profile.cloud_connectivity && <DeviceChip icon={Cloud} label="Cloud-connected" attention />}
          {removable ? <DeviceChip icon={HardDrive} label="Removable storage" attention /> : storageChip && <DeviceChip icon={HardDrive} label={storage} />}
        </div>
      )}
      {showRatings && (
        <div className="pw-panel-chips" aria-label="Device ratings and specifications">
          {profile.ip_rating && <DeviceChip icon={Droplets} label={profile.ip_rating} />}
          {profile.hazardous_area_rating && <DeviceChip icon={Flame} label={profile.hazardous_area_rating} />}
          {profile.food_grade != null && <DeviceChip icon={Utensils} label={profile.food_grade ? "Food-grade" : "Non-food-grade"} attention={!profile.food_grade} />}
          {profile.material && <DeviceChip icon={Layers} label={profile.material} />}
          {profile.capacity_or_size && <DeviceChip icon={Ruler} label={profile.capacity_or_size} />}
        </div>
      )}
      {profile.evidence.length > 0 && <EvidenceRows evidence={profile.evidence} />}
      {profile.unknowns.length > 0 && (
        <div className="pw-panel-unknowns">
          <span>Could not determine</span>
          <TextPreview text={profile.unknowns.join(" · ")} label="Undetermined details" />
        </div>
      )}
    </>
  );
}
