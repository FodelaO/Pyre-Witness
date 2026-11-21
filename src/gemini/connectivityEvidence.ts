/** Fills missing Scout connectivity fields from affirmative device evidence. */
import type { DeviceProfile } from "@/pipeline/types";
import { RADIOS, type Radio } from "@/twin/types";

const SIM_SLOT = /\b(?:(?:nano|micro)[ -]?)?sim(?:[ -]card)?[ -]+(?:slot|tray)\b/;
const PROTOCOL: Record<Radio, RegExp> = {
  wifi: /\b(?:wi[ -]?fi(?: [4-7]e?)?|wlan|802\.11[a-z]{0,2})\b/,
  bluetooth: /\b(?:bluetooth(?: (?:low energy|le|[1-6]\.\d))?|ble)\b/,
  cellular: new RegExp([SIM_SLOT.source, /\b(?:cellular|lte(?:-m)?|nb-iot|gsm|esim|[2345]g (?:nr|modem|cellular))\b/.source].join("|")),
  zigbee: /\bzigbee\b/,
  lora: /\blora(?:wan)?\b/,
  nfc: /\b(?:nfc|near[ -]field communication)\b/,
};

const UNCERTAIN = /\b(?:unknown|unconfirmed|unverified|uncertain|unclear|possible|possibly|likely|might|may|could|if|looks like|appears? to|characteristic of|(?:some|certain|selected) (?:models?|variants?)|not (?:confirmed|visible|legible|shown)|no (?:visible|evidence of)|sold separately)\b/;
const LIMITED_VIEW = /\bno\b[^,.]{0,45}\b(?:visible|shown|observed|documented)\b/;
const INDIRECT = /\b(?:(?:other|another|nearby|separate) (?:device|gateway|phone|router|model|variant)|(?:external|optional|separate) (?:[\w-]+ )?(?:adapter|dongle|gateway|module)|(?:via|through) (?:(?:a|an|the|its) )?(?:gateway|hub|adapter|dongle|phone))\b/;
const ABSENCE = /\b(?:no|without|neither|lacks?|unsupported|unavailable|absent|not (?:supported|available|present)|does(?: not|n't) support)\b/;
const RADIO_CUE = /\b(?:supports?|supported|built[ -]in|on[ -]?board|integrated|equipped|includes?|has|lists?|spec(?:ification)?s?|labels?|labelle?d|logos?|badges?|icons?|markings?|marked|leds?|certified|antennas?|modules?|modems?|transceivers?|radio|wireless|pairing|settings|enabled|disabled)\b/;

const CLOUD_ASSERTION = [
  /\bcloud[ -](?:connected|managed)\b/,
  /\bcloud(?: (?:connectivity|support))?\s*[:=]\s*(?:yes|true|supported)\b/,
  /\b(?:supports?|uses?|requires?|connects? to|syncs? (?:with|to)|uploads? to) (?:(?:a|an|the|its|optional|vendor's) )?cloud (?:account|service|storage|backup|sync|portal|recording|connectivity|integration)\b/,
  /\bcloud (?:account|service|storage|backup|sync|recording|connectivity|integration) (?:is )?(?:required|supported|available|enabled|turned on|optional)\b/,
];
const CLOUD_DENIAL = [
  /\bcloud(?: (?:connectivity|support))?\s*[:=]\s*(?:no|false|none|unsupported)\b/,
  /\b(?:no|without|does(?: not|n't) support) (?:native |onboard )?cloud (?:connectivity|support|integration|services?)\b/,
  /\bcloud (?:connectivity|support|integration|services?) (?:is )?(?:unsupported|unavailable|absent|not supported)\b/,
];
const LOCAL_ONLY = /\b(?:(?:purely|entirely) mechanical|passive analog (?:element|transducer|sensor)|local[ -]only (?:device|design)|offline[ -]only (?:device|design)|(?:operates?|works?) (?:locally|offline) only|(?:no|without) (?:onboard |native )?(?:electronics|networking|network interfaces?))\b/;
const CONFIGURATION = /\b(?:currently|temporarily|during|until|disabled|turned off|configured|active|in use|optional|required|needed|necessary)\b/;
const CLOUD_NEGATION = /\b(?:not|never|doesn't)\b/;

function groundedClauses(text: string): string[] {
  return text.normalize("NFKC").toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/’/g, "'")
    .split(/[;\n]+|\.(?=\s|$)|,\s*(?=(?:no|without|whether|enabled state|active state)\b)|\s+(?:but|whereas)\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause && !UNCERTAIN.test(clause) && !LIMITED_VIEW.test(clause) && !INDIRECT.test(clause));
}

export function enrichConnectivity(profile: DeviceProfile): DeviceProfile {
  if (profile.object_class === "passive_object") return profile;

  const claims = profile.evidence
    .filter(({ confidence }) => confidence >= 0.8)
    .flatMap(({ claim }) => groundedClauses(claim));
  const simPorts = profile.ports.flatMap(groundedClauses).filter((port) => SIM_SLOT.test(port));
  const radioClaims = [...claims, ...simPorts];
  const radios = new Set(profile.radios);
  for (const radio of RADIOS) {
    if (radios.has(radio)) continue;
    const mentions = radioClaims.filter((claim) => PROTOCOL[radio].test(claim));
    if (mentions.some((claim) => ABSENCE.test(claim))) continue;
    if (mentions.some((claim) => RADIO_CUE.test(claim) || SIM_SLOT.test(claim)
      || PROTOCOL[radio].exec(claim)?.[0] === claim.replace(/^['"]+|['"]+$/g, ""))) {
      radios.add(radio);
    }
  }

  const cloudYes = claims.some((claim) => !ABSENCE.test(claim) && !CLOUD_NEGATION.test(claim)
    && CLOUD_ASSERTION.some((pattern) => pattern.test(claim)));
  const cloudNo = claims.some((claim) => !CONFIGURATION.test(claim)
    && (CLOUD_DENIAL.some((pattern) => pattern.test(claim))
      || (radios.size === 0 && profile.object_class !== "networked_device"
        && !CLOUD_NEGATION.test(claim) && LOCAL_ONLY.test(claim))));
  const cloud = profile.cloud_connectivity ?? (cloudYes === cloudNo ? null : cloudYes);
  if (radios.size === profile.radios.length && cloud === profile.cloud_connectivity) return profile;
  return { ...profile, radios: [...radios], cloud_connectivity: cloud };
}
