/** Completes the final risk list from checked placement findings and observed device capabilities. */
import { techniqueById } from "@/data/attack-ics";
import type { Assessment, DeviceProfile, RiskItem, SelfCheckResult } from "@/pipeline/types";
import type { Asset, RuleFinding, Severity } from "@/twin/types";

const MAX_VISIBLE_RISKS = 16;
const THRESHOLD_NOTABLE = 2;
const DATA_PORT = /\b(?:ethernet|rj[- ]?45|rs[- ]?(?:232|422|485)|serial|usb(?:[ -]?(?:[abc]|type[ -]?[abc]|\d(?:\.\d)?))?|(?:micro[ -]?)?sd(?:hc|xc)?|data port|network port|console port|jtag|sfp|hdmi|displayport)\b/i;
const POWER_ONLY = /\b(?:power|charg(?:e|ing))[ -]?only\b/i;
const REMOVABLE_STORAGE = /\b(?:removable (?:storage|media)|(?:micro[ -]?)?sd(?:hc|xc)?(?: card| slot)?|memory card|usb (?:drives?|sticks?|storage|mass storage|media)|flash drives?|thumb drives?)\b/i;
const PERSONAL_DEVICE = /\b(?:personal (?:device|phone|computer|laptop|tablet)|bring your own device|byod|contractor (?:device|laptop|tablet))\b/i;
const CAMERA = /\b(?:webcam|camcorder|camera)\b/i;
const MICROPHONE = /\b(?:microphone|(?:built[- ]in|integrated|external) mic|audio recorder)\b/i;
const NEGATIVE_EVIDENCE = /\b(?:no|without|lacks?|missing|unknown|unconfirmed|(?:cannot|could not) (?:confirm|identify|see))\b|\bnot (?:an? |visible|present|identified|confirmed|included|supported)\b/i;
const RECORDING_ACCESSORY = /\b(?:webcam|camera|microphone)\s+(?:mount|bracket|stand|cover|case|cable|connector|adapter)\b|\b(?:dummy|simulated|decoy) (?:webcam|camera|microphone)\b/i;

interface FeatureRisk {
  key: string;
  present: boolean;
  title: string;
  description: string;
  mitigation: string;
  severity: Severity;
  covers: RegExp;
  rules?: readonly string[];
  techniques?: readonly string[];
}

function riskText(risk: RiskItem): string {
  return `${risk.title}\n${risk.description}`;
}

function mentionsRule(risk: RiskItem, id: string): boolean {
  const rule = id.toUpperCase();
  return [risk.id, riskText(risk)].some((text) => text.toUpperCase().match(/\b[A-Z]{2,8}-\d{2}\b/g)?.includes(rule));
}

function riskFromFinding(finding: RuleFinding, index: number): RiskItem {
  const technique = finding.technique && techniqueById(finding.technique.id);
  return {
    id: `RULE-${finding.ruleId}:${finding.assetId}:${index + 1}`,
    title: finding.title,
    kind: finding.kind,
    severity: finding.severity,
    likelihood: 3,
    technique: technique ? { id: technique.id, name: technique.name } : null,
    description: `Rules-engine finding at the checked placement. ${finding.detail}`,
    mitigation: finding.fix ?? "Review the finding and verify the applicable controls before placement.",
  };
}

function profileRisks(profile: DeviceProfile, candidate: Asset): FeatureRisk[] {
  const { physical_kind: kind, category, device_type: type } = profile;
  const stated = profile.evidence.flatMap(({ claim }) => claim.split(/[.;\n]/));
  const recording = [type, ...stated].filter((text) => !NEGATIVE_EVIDENCE.test(text) && !RECORDING_ACCESSORY.test(text));
  const camera = category === "camera" || kind === "ip_camera" || recording.some((text) => CAMERA.test(text));
  const microphone = recording.some((text) => MICROPHONE.test(text));
  const recordingDevice = camera && microphone ? "Camera and microphone" : camera ? "Camera" : "Microphone";
  const storageDevice = kind === "usb_drive" || category === "removable_storage";
  const hasDataPort = profile.ports.some((port) => DATA_PORT.test(port) && !POWER_ONLY.test(port)
    && !REMOVABLE_STORAGE.test(port) && !/\b(?:plug|male)\b/i.test(port)
    && !(storageDevice && /\busb/i.test(port) && !/\b(?:host port|socket|receptacle|female)\b/i.test(port)));
  const removable = storageDevice
    || profile.ports.some((port) => REMOVABLE_STORAGE.test(port) && !POWER_ONLY.test(port))
    || Boolean(profile.storage && !/\b(?:no|without|non[- ]removable)\b/i.test(profile.storage) && REMOVABLE_STORAGE.test(profile.storage));
  const personal = kind === "phone" || kind === "laptop" || [type, ...stated].some((text) => PERSONAL_DEVICE.test(text));

  return [
    {
      key: "DEFAULT-CREDENTIALS", present: profile.default_credentials_visible, title: "Visible default credentials",
      description: "The capture shows default credentials that could allow unauthorized login.",
      mitigation: "Disable or rotate vendor defaults before connecting the device.",
      severity: 4, covers: /\b(?:default|factory[- ]set|preset) (?:\w+ ){0,2}(?:credentials?|passwords?|logins?|accounts?)\b/i,
      rules: ["CRED-01"], techniques: ["T1694.001"],
    },
    {
      key: "WIRELESS", present: profile.radios.length > 0, title: "Wireless radio capability",
      description: `The device profile identifies ${profile.radios.join(", ")} radio capability. Verify its enabled state and coverage at the placement.`,
      mitigation: "Disable unused radios and isolate approved wireless access.",
      severity: 3, covers: /\b(?:wireless|wi[- ]?fi|wlan|radios?|rf|bluetooth|cellular|lora(?:wan)?|zigbee|nfc)\b/i,
      rules: ["RF-01"], techniques: ["T0860"],
    },
    {
      key: "REMOVABLE-STORAGE", present: removable, title: "Removable storage and media",
      description: "The device or an observed slot supports removable media, which can carry unauthorized files or software.",
      mitigation: "Use only approved, scanned removable media and secure unused slots.",
      severity: 3, covers: REMOVABLE_STORAGE, rules: ["USB-01"], techniques: ["T0847"],
    },
    {
      key: "CLOUD", present: profile.cloud_connectivity === true, title: "Cloud connectivity",
      description: "The device supports cloud connectivity. Data may leave the plant if the service is enabled.",
      mitigation: "Disable unapproved cloud services and verify approved destinations before connecting.",
      severity: 3, covers: /\b(?:cloud(?:[- ]connected)?|hosted (?:service|platform)|saas)\b/i,
    },
    {
      key: "RECORDING", present: camera || microphone, title: `${recordingDevice} privacy exposure`,
      description: `${recordingDevice} capability can expose sensitive information when recording workers, operator displays or conversations.`,
      mitigation: "Verify the field of view and audio settings, and restrict recording to approved locations.",
      severity: 3, covers: /\b(?:privacy|surveillance|field of view|line of sight|viewing angle|(?:camera|video|audio) (?:view|footage|feed|recording|coverage)|(?:camera|microphone)[- ](?:equipped|exposure)|recording (?:workers|employees|sensitive))\b/i,
      rules: ["CAM-01"], techniques: ["T0882"],
    },
    {
      key: "UNMANAGED-PERSONAL", present: personal && candidate.cyber?.managed !== true, title: "Unmanaged personal or portable device",
      description: "This portable device has no verified plant management enrollment. Direct connection could bypass inventory and patch controls.",
      mitigation: "Keep it isolated until the plant verifies ownership, inventory and maintenance controls.",
      severity: 3, covers: /\b(?:unmanaged|byod|bring your own device|transient (?:asset|device)|personal (?:device|laptop|phone))\b/i,
      rules: ["TRANS-01", "MGMT-01"],
    },
    {
      key: "PHYSICAL-DATA-PORT", present: hasDataPort, title: "Physical port access",
      description: "An observed physical port could allow direct attachment of unauthorized equipment when accessible.",
      mitigation: "Restrict access and disable or protect unused data ports.",
      severity: 2, covers: /\b(?:physical (?:data )?(?:port|interface|connector)|(?:exposed|unsecured|unprotected|debug|maintenance) (?:data )?(?:port|connector)|port (?:tampering|protection))\b/i,
      rules: ["PHYS-01"],
    },
  ];
}

function describesFeature(risk: RiskItem, feature: FeatureRisk): boolean {
  return risk.kind === "cyber"
    && riskText(risk).split(/[.;\n]/).some((line) => feature.covers.test(line) && !NEGATIVE_EVIDENCE.test(line));
}

function coversFeature(risk: RiskItem, feature: FeatureRisk): boolean {
  if (feature.rules?.some((id) => mentionsRule(risk, id))) return true;
  if (risk.technique && feature.techniques?.includes(risk.technique.id)) return true;
  return describesFeature(risk, feature);
}

function withFeatureEvidence(risk: RiskItem, feature: FeatureRisk): RiskItem {
  if (describesFeature(risk, feature)) return risk;
  return { ...risk, description: `${risk.description}\nFrom device profile. ${feature.description}` };
}

export function completeAssessmentRisks(assessment: Assessment, profile: DeviceProfile, candidate: Asset, checked: SelfCheckResult): Assessment {
  const passive = profile.object_class === "passive_object";
  const architect = passive ? assessment.risks.filter(({ kind }) => kind !== "cyber").map((risk) => ({ ...risk, technique: null }))
    : assessment.risks;
  const mergedArchitect = [...architect];
  const seen = new Set<string>();
  const findings = checked.findings.flatMap((finding, index) => {
    if (finding.severity < THRESHOLD_NOTABLE || (passive && finding.kind === "cyber")) return [];
    const key = JSON.stringify([finding.ruleId, finding.assetId, finding.detail]);
    if (seen.has(key)) return [];
    seen.add(key);
    const risk = riskFromFinding(passive ? { ...finding, technique: undefined } : finding, index);
    const existing = architect.findIndex((item) => mentionsRule(item, finding.ruleId)
      || (risk.technique && item.technique?.id.toUpperCase() === risk.technique.id));
    if (existing < 0) return [risk];

    if (risk.severity > mergedArchitect[existing].severity) {
      const original = architect[existing];
      mergedArchitect[existing] = {
        ...risk,
        description: `${risk.description}\nArchitect context: ${original.title}. ${original.description}`,
        mitigation: finding.fix ?? original.mitigation,
      };
    }
    return [];
  });
  const blockers = findings.filter(({ severity }) => severity >= 4);
  const notable = findings.filter(({ severity }) => severity < 4);
  const risks = [...blockers, ...mergedArchitect];
  if (!passive) {
    for (const feature of profileRisks(profile, candidate)) {
      if (!feature.present) continue;
      const existing = risks.findIndex((risk) => coversFeature(risk, feature));
      if (existing >= 0) {
        risks[existing] = withFeatureEvidence(risks[existing], feature);
        continue;
      }
      const finding = notable.find((risk) => coversFeature(risk, feature));
      risks.push(finding ? withFeatureEvidence(finding, feature) : {
        id: `PROFILE-${feature.key}:${candidate.id}`,
        title: feature.title,
        kind: "cyber",
        severity: feature.severity,
        likelihood: 3,
        technique: null,
        description: `From device profile. ${feature.description}`,
        mitigation: feature.mitigation,
      });
    }
  }
  for (const risk of notable) {
    if (!risks.some(({ id }) => id === risk.id)) risks.push(risk);
  }
  const final = risks.sort((a, b) => b.severity - a.severity || b.likelihood - a.likelihood).slice(0, MAX_VISIBLE_RISKS);
  return { ...assessment, risks: final };
}
