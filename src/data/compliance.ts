/**
 * Pyre Witness — compliance reference catalogue for OT security, process safety,
 * electrical/hazardous locations, and food safety / hygienic design.
 *
 * Cited by the deterministic rules engine, the reasoning prompt, and the results panel.
 * Summaries are written in plain language (no quotations from standards). Entries with
 * `confidence: "medium"` mark clauses cited at document or higher-section level where
 * exact clause numbering depends on edition or subpart.
 */

export const COMPLIANCE_TAGS = [
  "wireless",
  "remote_access",
  "cloud",
  "default_creds",
  "removable_media",
  "transient_device",
  "network_segmentation",
  "zone_boundary",
  "unmanaged",
  "camera",
  "hazardous_area",
  "ammonia",
  "washdown",
  "food_contact",
  "safety_function",
  "physical_access",
  "incident_reporting",
] as const;

export type ComplianceTag = (typeof COMPLIANCE_TAGS)[number];

export type ComplianceDomain = "cyber" | "process_safety" | "food_safety" | "electrical";

export interface ComplianceClause {
  /** Stable lowercase slug, e.g. "iec62443-3-3-sr-5.1". */
  id: string;
  /** Standard or regulation identifier, e.g. "IEC 62443-3-3". */
  framework: string;
  /** Clause, article, section, or document-level reference, e.g. "SR 5.1". */
  clause: string;
  /** Official short title of the clause or document section. */
  title: string;
  /** Plain one-sentence summary of what the clause requires. */
  summary: string;
  domain: ComplianceDomain;
  /** Device traits or placement contexts that make this clause relevant. */
  appliesWhen: ComplianceTag[];
  /** Official standards body or regulator page for the document. */
  url: string;
  /** "medium" = document applies, exact clause number is higher-level or edition-dependent. */
  confidence: "high" | "medium";
}

const URL_IEC_62443 =
  "https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards";
const URL_NIST_800_82 = "https://csrc.nist.gov/pubs/sp/800/82/r3/final";
const URL_NIST_CSF = "https://www.nist.gov/cyberframework";
const URL_EU_NIS2 = "https://eur-lex.europa.eu/eli/dir/2022/2555/oj";
const URL_OSHA_PSM =
  "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.119";
const URL_EPA_RMP = "https://www.epa.gov/rmp";
const URL_IIAR = "https://www.iiar.org/";
const URL_NIOSH_NH3 = "https://www.cdc.gov/niosh/idlh/7664417.html";
const URL_IEC_FUNCTIONAL_SAFETY = "https://www.iec.ch/functional-safety";
const URL_NFPA_70 =
  "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70";
const URL_IEC_WEBSTORE = "https://webstore.iec.ch/";
const URL_ISO_OBP = "https://www.iso.org/obp/ui";
const URL_ECFR_117 = "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-117";
const URL_FDA_FSMA_PC =
  "https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-preventive-controls-human-food";
const URL_3A = "https://www.3-a.org/";
const URL_EHEDG = "https://www.ehedg.org/";
const URL_NSF = "https://www.nsf.org/";

export const COMPLIANCE: readonly ComplianceClause[] = [
  // ───────────────────────────── IEC 62443-3-3 ─────────────────────────────
  {
    id: "iec62443-3-3-sr-1.1",
    framework: "IEC 62443-3-3",
    clause: "SR 1.1",
    title: "Human user identification and authentication",
    summary:
      "Requires unique identification and authentication of every human user before granting access to any control system interface.",
    domain: "cyber",
    appliesWhen: ["default_creds", "remote_access", "physical_access"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-1.2",
    framework: "IEC 62443-3-3",
    clause: "SR 1.2",
    title: "Software process and device identification and authentication",
    summary:
      "Requires devices and software processes to be identified and authenticated before exchanging control or telemetry data on OT networks.",
    domain: "cyber",
    appliesWhen: ["unmanaged", "transient_device", "cloud", "network_segmentation"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-1.5",
    framework: "IEC 62443-3-3",
    clause: "SR 1.5",
    title: "Authenticator management",
    summary:
      "Requires changing factory-default passwords before commissioning and protecting credentials throughout their lifecycle.",
    domain: "cyber",
    appliesWhen: ["default_creds", "remote_access"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-1.6",
    framework: "IEC 62443-3-3",
    clause: "SR 1.6",
    title: "Wireless access management",
    summary:
      "Requires identifying and authenticating all human users and devices attempting to connect over wireless links to the control system.",
    domain: "cyber",
    appliesWhen: ["wireless"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-2.1",
    framework: "IEC 62443-3-3",
    clause: "SR 2.1",
    title: "Authorization enforcement",
    summary:
      "Requires enforcing least-privilege permissions on every user and service so only authorized roles can modify control logic or safety setpoints.",
    domain: "cyber",
    appliesWhen: ["remote_access", "default_creds", "safety_function"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-2.2",
    framework: "IEC 62443-3-3",
    clause: "SR 2.2",
    title: "Wireless use control",
    summary:
      "Requires explicitly authorizing, monitoring, and restricting wireless communication channels used within or adjacent to industrial zones.",
    domain: "cyber",
    appliesWhen: ["wireless"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-2.3",
    framework: "IEC 62443-3-3",
    clause: "SR 2.3",
    title: "Use control for portable and mobile devices",
    summary:
      "Requires restricting and scanning portable storage media and transient maintenance laptops before they connect to control system assets.",
    domain: "cyber",
    appliesWhen: ["removable_media", "transient_device"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-3.2",
    framework: "IEC 62443-3-3",
    clause: "SR 3.2",
    title: "Malicious code protection",
    summary:
      "Requires technical safeguards against malware introduction and propagation across control endpoints, entry points, and removable media.",
    domain: "cyber",
    appliesWhen: ["removable_media", "transient_device", "unmanaged"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-4.1",
    framework: "IEC 62443-3-3",
    clause: "SR 4.1",
    title: "Information confidentiality",
    summary:
      "Requires protecting sensitive operational data, credentials, and video or telemetry feeds from unauthorized disclosure in transit and at rest.",
    domain: "cyber",
    appliesWhen: ["camera", "cloud", "wireless", "remote_access"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-5.1",
    framework: "IEC 62443-3-3",
    clause: "SR 5.1",
    title: "Network segmentation",
    summary:
      "Requires logically and physically separating control networks from non-control networks and isolating safety-critical zones from general traffic.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "zone_boundary", "safety_function"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-5.2",
    framework: "IEC 62443-3-3",
    clause: "SR 5.2",
    title: "Zone boundary protection",
    summary:
      "Requires monitoring and controlling all traffic crossing zone boundaries through enforced conduits with default-deny filtering.",
    domain: "cyber",
    appliesWhen: ["zone_boundary", "network_segmentation", "cloud", "remote_access"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-6.1",
    framework: "IEC 62443-3-3",
    clause: "SR 6.1",
    title: "Audit log accessibility",
    summary:
      "Requires making security audit records available to authorized personnel and monitoring tools to support timely incident detection and investigation.",
    domain: "cyber",
    appliesWhen: ["incident_reporting", "remote_access", "unmanaged"],
    url: URL_IEC_62443,
    confidence: "high",
  },
  {
    id: "iec62443-3-3-sr-7.1",
    framework: "IEC 62443-3-3",
    clause: "SR 7.1",
    title: "Denial of service protection",
    summary:
      "Requires control systems to withstand or limit traffic floods and degraded communications without losing essential process control functions.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "wireless", "cloud"],
    url: URL_IEC_62443,
    confidence: "high",
  },

  // ───────────────────────────── IEC 62443-3-2 / -2-1 / -2-4 ─────────────────────────────
  {
    id: "iec62443-3-2-zones-conduits",
    framework: "IEC 62443-3-2",
    clause: "Section 4 (ZCR)",
    title: "Partitioning the system into zones and conduits",
    summary:
      "Requires grouping industrial assets with common security requirements into defined zones and documenting every conduit between them.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "zone_boundary"],
    url: URL_IEC_62443,
    confidence: "medium",
  },
  {
    id: "iec62443-3-2-risk-assessment",
    framework: "IEC 62443-3-2",
    clause: "Section 4 (Risk Assessment)",
    title: "Security risk assessment for system design",
    summary:
      "Requires performing a consequence-driven cyber risk assessment whenever new devices or conduits alter a control zone's attack surface.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "zone_boundary", "safety_function", "cloud"],
    url: URL_IEC_62443,
    confidence: "medium",
  },
  {
    id: "iec62443-2-1-asset-program",
    framework: "IEC 62443-2-1",
    clause: "Document (Asset Owner Program)",
    title: "Security program requirements for IACS asset owners",
    summary:
      "Requires asset owners to maintain an accurate OT asset inventory, patch lifecycle controls, and physical access governance across the plant.",
    domain: "cyber",
    appliesWhen: ["unmanaged", "transient_device", "physical_access"],
    url: URL_IEC_62443,
    confidence: "medium",
  },
  {
    id: "iec62443-2-1-incident-plan",
    framework: "IEC 62443-2-1",
    clause: "Document (Incident Planning)",
    title: "IACS incident response and recovery planning",
    summary:
      "Requires asset owners to establish tested procedures for detecting, reporting, containing, and recovering from OT cybersecurity incidents.",
    domain: "cyber",
    appliesWhen: ["incident_reporting", "unmanaged"],
    url: URL_IEC_62443,
    confidence: "medium",
  },
  {
    id: "iec62443-2-4-service-providers",
    framework: "IEC 62443-2-4",
    clause: "Document (Service Providers)",
    title: "Security program requirements for IACS service providers",
    summary:
      "Requires integrators and vendors to follow hardened integration, remote support, and transient tool hygiene controls when servicing plant OT.",
    domain: "cyber",
    appliesWhen: ["remote_access", "transient_device", "cloud"],
    url: URL_IEC_62443,
    confidence: "medium",
  },

  // ───────────────────────────── NIST SP 800-82 Rev. 3 ─────────────────────────────
  {
    id: "nist-800-82r3-5.2.2",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 5.2.2",
    title: "Layer 2 — Physical Security",
    summary:
      "Recommends restricting physical access to control rooms, field cabinets, and exposed ports to prevent unauthorized tampering or visual capture.",
    domain: "cyber",
    appliesWhen: ["physical_access", "camera"],
    url: URL_NIST_800_82,
    confidence: "high",
  },
  {
    id: "nist-800-82r3-5.2.3",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 5.2.3",
    title: "Layer 3 — Network Security (Segmentation and DMZ)",
    summary:
      "Recommends segmenting OT networks into defense-in-depth zones with an IT/OT DMZ so enterprise or cloud hosts never connect directly to controllers.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "zone_boundary", "cloud"],
    url: URL_NIST_800_82,
    confidence: "high",
  },
  {
    id: "nist-800-82r3-6.2.1",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 6.2.1",
    title: "Identity Management and Access Control",
    summary:
      "Recommends eliminating shared or default credentials and enforcing strong authentication for operators, maintenance personnel, and transient devices.",
    domain: "cyber",
    appliesWhen: ["default_creds", "transient_device", "remote_access"],
    url: URL_NIST_800_82,
    confidence: "high",
  },
  {
    id: "nist-800-82r3-6.2.7",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 6.2.7",
    title: "Media Protection",
    summary:
      "Recommends locking unused USB ports and requiring malware scanning kiosks before any removable media or transfer device touches OT equipment.",
    domain: "cyber",
    appliesWhen: ["removable_media", "transient_device"],
    url: URL_NIST_800_82,
    confidence: "high",
  },
  {
    id: "nist-800-82r3-6.2.9",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 6.2.9",
    title: "Wireless Communications",
    summary:
      "Recommends disabling unnecessary radios on OT devices and enforcing strong encryption, authentication, and rogue-AP monitoring where wireless is required.",
    domain: "cyber",
    appliesWhen: ["wireless"],
    url: URL_NIST_800_82,
    confidence: "high",
  },
  {
    id: "nist-800-82r3-6.2.10",
    framework: "NIST SP 800-82 Rev. 3",
    clause: "Section 6.2.10",
    title: "Remote Access",
    summary:
      "Recommends brokering all external and vendor remote access through MFA-protected DMZ jump hosts with session logging and explicit plant approval.",
    domain: "cyber",
    appliesWhen: ["remote_access", "cloud"],
    url: URL_NIST_800_82,
    confidence: "high",
  },

  // ───────────────────────────── NIST CSF 2.0 ─────────────────────────────
  {
    id: "nist-csf-2.0-id.am",
    framework: "NIST CSF 2.0",
    clause: "ID.AM",
    title: "Asset Management",
    summary:
      "Calls for maintaining a current inventory of all hardware, software, and transient devices connected to plant systems according to operational criticality.",
    domain: "cyber",
    appliesWhen: ["unmanaged", "transient_device"],
    url: URL_NIST_CSF,
    confidence: "high",
  },
  {
    id: "nist-csf-2.0-pr.aa",
    framework: "NIST CSF 2.0",
    clause: "PR.AA",
    title: "Identity Management, Authentication, and Access Control",
    summary:
      "Calls for limiting physical and logical access to authorized identities and eliminating weak or default authentication mechanisms.",
    domain: "cyber",
    appliesWhen: ["default_creds", "remote_access", "physical_access"],
    url: URL_NIST_CSF,
    confidence: "high",
  },
  {
    id: "nist-csf-2.0-pr.ir",
    framework: "NIST CSF 2.0",
    clause: "PR.IR",
    title: "Technology Infrastructure Resilience",
    summary:
      "Calls for architecting segmented, resilient network boundaries that limit blast radius and protect availability during cyber events.",
    domain: "cyber",
    appliesWhen: ["network_segmentation", "zone_boundary", "cloud"],
    url: URL_NIST_CSF,
    confidence: "high",
  },
  {
    id: "nist-csf-2.0-de.cm",
    framework: "NIST CSF 2.0",
    clause: "DE.CM",
    title: "Continuous Monitoring",
    summary:
      "Calls for continuously monitoring networks, physical spaces, and unmanaged or wireless endpoints to detect unauthorized activity early.",
    domain: "cyber",
    appliesWhen: ["unmanaged", "wireless", "camera", "incident_reporting"],
    url: URL_NIST_CSF,
    confidence: "high",
  },
  {
    id: "nist-csf-2.0-rs.co",
    framework: "NIST CSF 2.0",
    clause: "RS.CO",
    title: "Incident Response Reporting and Communication",
    summary:
      "Calls for coordinating incident notifications with internal teams, regulators, and partners in line with established response plans.",
    domain: "cyber",
    appliesWhen: ["incident_reporting"],
    url: URL_NIST_CSF,
    confidence: "high",
  },

  // ───────────────────────────── EU NIS2 Directive ─────────────────────────────
  {
    id: "eu-nis2-art-21",
    framework: "EU NIS2 (Directive 2022/2555)",
    clause: "Article 21",
    title: "Cybersecurity risk-management measures",
    summary:
      "Requires essential and important entities, including food manufacturing, to implement proportionate technical and organizational controls across IT and OT.",
    domain: "cyber",
    appliesWhen: [
      "network_segmentation",
      "zone_boundary",
      "unmanaged",
      "default_creds",
      "remote_access",
      "cloud",
    ],
    url: URL_EU_NIS2,
    confidence: "high",
  },
  {
    id: "eu-nis2-art-21-2-d",
    framework: "EU NIS2 (Directive 2022/2555)",
    clause: "Article 21(2)(d)",
    title: "Supply chain security",
    summary:
      "Requires assessing and managing cybersecurity vulnerabilities introduced by direct suppliers, cloud services, and third-party remote support tools.",
    domain: "cyber",
    appliesWhen: ["cloud", "remote_access", "unmanaged"],
    url: URL_EU_NIS2,
    confidence: "high",
  },
  {
    id: "eu-nis2-art-23",
    framework: "EU NIS2 (Directive 2022/2555)",
    clause: "Article 23",
    title: "Reporting obligations",
    summary:
      "Requires notifying the national CSIRT or competent authority with an early warning within 24 hours and an incident notification within 72 hours of a significant incident.",
    domain: "cyber",
    appliesWhen: ["incident_reporting"],
    url: URL_EU_NIS2,
    confidence: "high",
  },

  // ───────────────────────────── Process Safety & Ammonia Refrigeration ─────────────────────────────
  {
    id: "osha-1910.119-d",
    framework: "OSHA 29 CFR 1910.119",
    clause: "29 CFR 1910.119(d)",
    title: "Process safety information",
    summary:
      "Requires maintaining written chemical hazard data, safe operating limits, electrical classification drawings, and relief design basis for covered ammonia systems.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "safety_function"],
    url: URL_OSHA_PSM,
    confidence: "high",
  },
  {
    id: "osha-1910.119-j",
    framework: "OSHA 29 CFR 1910.119",
    clause: "29 CFR 1910.119(j)",
    title: "Mechanical integrity",
    summary:
      "Requires documented inspection, testing, and preventive maintenance of ammonia pressure vessels, piping, relief systems, controls, and safety interlocks.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "safety_function", "unmanaged"],
    url: URL_OSHA_PSM,
    confidence: "high",
  },
  {
    id: "osha-1910.119-l",
    framework: "OSHA 29 CFR 1910.119",
    clause: "29 CFR 1910.119(l)",
    title: "Management of change",
    summary:
      "Requires a formal safety review and approval before making any non-in-kind equipment, control, or facility change affecting a PSM-covered ammonia process.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "safety_function", "unmanaged"],
    url: URL_OSHA_PSM,
    confidence: "high",
  },
  {
    id: "epa-40cfr68-rmp",
    framework: "EPA 40 CFR Part 68",
    clause: "40 CFR Part 68",
    title: "Chemical Accident Prevention Provisions (Risk Management Program)",
    summary:
      "Requires facilities storing anhydrous ammonia above threshold quantities to maintain a risk management plan, hazard assessments, and accidental release prevention controls.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "safety_function"],
    url: URL_EPA_RMP,
    confidence: "high",
  },
  {
    id: "epa-40cfr68-subpart-e",
    framework: "EPA 40 CFR Part 68",
    clause: "40 CFR Part 68 Subpart E",
    title: "Emergency Response",
    summary:
      "Requires coordination with local responders and defined notification and emergency response procedures for accidental releases of regulated substances such as ammonia.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "incident_reporting"],
    url: URL_EPA_RMP,
    confidence: "high",
  },
  {
    id: "iiar-2-ch6-machinery-room",
    framework: "ANSI/IIAR 2",
    clause: "Chapter 6",
    title: "Machinery Rooms",
    summary:
      "Establishes enclosure, access control, electrical classification, and emergency shutoff design requirements for closed-circuit ammonia refrigeration machinery rooms.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "physical_access"],
    url: URL_IIAR,
    confidence: "high",
  },
  {
    id: "iiar-2-ventilation",
    framework: "ANSI/IIAR 2",
    clause: "Section 6.14",
    title: "Machinery Room Ventilation",
    summary:
      "Requires continuous and high-rate emergency mechanical exhaust ventilation for ammonia machinery rooms to prevent toxic or flammable accumulation.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "safety_function"],
    url: URL_IIAR,
    confidence: "medium",
  },
  {
    id: "iiar-2-ch17-detection",
    framework: "ANSI/IIAR 2",
    clause: "Chapter 17",
    title: "Ammonia Detection and Alarms",
    summary:
      "Requires supervised ammonia leak detectors with tiered alarm thresholds that alert monitored stations and automatically trigger emergency ventilation and shutdowns.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "safety_function", "incident_reporting"],
    url: URL_IIAR,
    confidence: "high",
  },
  {
    id: "niosh-idlh-nh3",
    framework: "NIOSH IDLH",
    clause: "CAS 7664-41-7",
    title: "Immediately Dangerous to Life or Health — Ammonia (300 ppm)",
    summary:
      "Establishes 300 ppm as the airborne anhydrous ammonia concentration immediately dangerous to life or health, anchoring detector alarm and emergency shutoff setpoints.",
    domain: "process_safety",
    appliesWhen: ["ammonia", "hazardous_area", "safety_function"],
    url: URL_NIOSH_NH3,
    confidence: "high",
  },

  // ───────────────────────────── Functional Safety (IEC 61511) ─────────────────────────────
  {
    id: "iec61511-1-sis-independence",
    framework: "IEC 61511-1",
    clause: "IEC 61511-1 (SIS Separation)",
    title: "Safety instrumented systems — independence from basic process control",
    summary:
      "Requires safety instrumented systems and process interlocks to remain sufficiently independent from basic process control and non-safety networks so control faults cannot defeat safety.",
    domain: "process_safety",
    appliesWhen: ["safety_function", "network_segmentation", "zone_boundary"],
    url: URL_IEC_FUNCTIONAL_SAFETY,
    confidence: "medium",
  },
  {
    id: "iec61511-1-sis-security",
    framework: "IEC 61511-1",
    clause: "IEC 61511-1 (SIS Security Risk Assessment)",
    title: "Security risk assessment for safety instrumented systems",
    summary:
      "Requires performing a security risk assessment on safety instrumented systems and implementing safeguards against unauthorized remote, wireless, or local modification.",
    domain: "process_safety",
    appliesWhen: ["safety_function", "remote_access", "wireless", "unmanaged"],
    url: URL_IEC_FUNCTIONAL_SAFETY,
    confidence: "medium",
  },

  // ───────────────────────────── Hazardous Locations & Electrical / IP ─────────────────────────────
  {
    id: "nfpa-70-art-500",
    framework: "NFPA 70 (NEC)",
    clause: "Article 500",
    title: "Hazardous (Classified) Locations, Classes I, II, and III, Divisions 1 and 2",
    summary:
      "Requires electrical and electronic equipment installed in Division-classified flammable gas or vapor areas to carry appropriate hazardous-location ratings and wiring methods.",
    domain: "electrical",
    appliesWhen: ["hazardous_area", "ammonia"],
    url: URL_NFPA_70,
    confidence: "high",
  },
  {
    id: "nfpa-70-art-505",
    framework: "NFPA 70 (NEC)",
    clause: "Article 505",
    title: "Zone 0, 1, and 2 Locations",
    summary:
      "Specifies Zone-based hazardous area classification and certified protection techniques for electrical equipment deployed where ignitable gas atmospheres may occur.",
    domain: "electrical",
    appliesWhen: ["hazardous_area", "ammonia"],
    url: URL_NFPA_70,
    confidence: "high",
  },
  {
    id: "iec60079-10-1",
    framework: "IEC 60079",
    clause: "IEC 60079-10-1",
    title: "Explosive atmospheres — Classification of areas — Explosive gas atmospheres",
    summary:
      "Defines methodology for classifying plant zones where flammable gases or vapors may be present to determine required equipment protection levels.",
    domain: "electrical",
    appliesWhen: ["hazardous_area", "ammonia"],
    url: URL_IEC_WEBSTORE,
    confidence: "high",
  },
  {
    id: "iec60079-14",
    framework: "IEC 60079",
    clause: "IEC 60079-14",
    title: "Explosive atmospheres — Electrical installations design, selection and erection",
    summary:
      "Requires selecting, installing, and verifying Ex-certified electrical equipment and cabling matched to the zone classification and gas group.",
    domain: "electrical",
    appliesWhen: ["hazardous_area", "ammonia"],
    url: URL_IEC_WEBSTORE,
    confidence: "high",
  },
  {
    id: "iec60529-ip-code",
    framework: "IEC 60529",
    clause: "IEC 60529",
    title: "Degrees of protection provided by enclosures (IP Code)",
    summary:
      "Classifies enclosure protection against solid foreign objects and water ingress, including IP66/IP67 and IP69 high-pressure water jet ratings for wet industrial zones.",
    domain: "electrical",
    appliesWhen: ["washdown", "physical_access"],
    url: URL_IEC_WEBSTORE,
    confidence: "high",
  },
  {
    id: "iso20653-ip69k",
    framework: "ISO 20653",
    clause: "ISO 20653",
    title: "Degrees of protection (IP code) — IP69K",
    summary:
      "Defines the IP69K enclosure test standard for close-range, high-pressure, high-temperature spray washdown widely specified in hygienic beverage processing zones.",
    domain: "electrical",
    appliesWhen: ["washdown"],
    url: URL_ISO_OBP,
    confidence: "high",
  },

  // ───────────────────────────── Food Safety & Hygienic Design ─────────────────────────────
  {
    id: "fda-21cfr117-35",
    framework: "FDA 21 CFR Part 117",
    clause: "21 CFR 117.35",
    title: "Sanitary operations",
    summary:
      "Requires maintaining plant surfaces, enclosures, and food-contact equipment in clean, sanitary condition so cleaning chemicals and condensates do not contaminate product.",
    domain: "food_safety",
    appliesWhen: ["washdown", "food_contact"],
    url: URL_ECFR_117,
    confidence: "high",
  },
  {
    id: "fda-21cfr117-40",
    framework: "FDA 21 CFR Part 117",
    clause: "21 CFR 117.40",
    title: "Equipment and utensils",
    summary:
      "Requires food processing equipment and adjacent installations to be corrosion-resistant, cleanable, and designed to prevent adulteration with lubricants, fragments, or microbes.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown"],
    url: URL_ECFR_117,
    confidence: "high",
  },
  {
    id: "fda-21cfr117-130",
    framework: "FDA 21 CFR Part 117 (FSMA)",
    clause: "21 CFR 117.130",
    title: "Hazard analysis",
    summary:
      "Requires identifying and evaluating biological, chemical, and physical hazards—including equipment or instrumentation changes—that could affect food safety.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown", "safety_function"],
    url: URL_FDA_FSMA_PC,
    confidence: "high",
  },
  {
    id: "fda-21cfr117-135",
    framework: "FDA 21 CFR Part 117 (FSMA)",
    clause: "21 CFR 117.135",
    title: "Preventive controls",
    summary:
      "Requires implementing sanitation, process, and access controls to significantly minimize or prevent identified hazards in food and beverage manufacturing.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown", "physical_access"],
    url: URL_FDA_FSMA_PC,
    confidence: "high",
  },
  {
    id: "3a-sanitary-standards",
    framework: "3-A Sanitary Standards",
    clause: "3-A Sanitary Standards",
    title: "Hygienic design of food and beverage processing equipment",
    summary:
      "Specifies crevice-free geometry, smooth cleanable stainless finishes, and drainable construction for sanitary piping, vessels, valves, and instruments in food contact.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown"],
    url: URL_3A,
    confidence: "medium",
  },
  {
    id: "ehedg-doc-8",
    framework: "EHEDG Guidelines",
    clause: "EHEDG Doc. 8",
    title: "Hygienic design principles",
    summary:
      "Establishes hygienic engineering criteria for materials, surface roughness, drainability, and seal design to prevent microbial harborage during clean-in-place and washdown.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown"],
    url: URL_EHEDG,
    confidence: "high",
  },
  {
    id: "ehedg-doc-13",
    framework: "EHEDG Guidelines",
    clause: "EHEDG Doc. 13",
    title: "Hygienic design of equipment for open processing",
    summary:
      "Provides hygienic design guidance for equipment, housings, and overhead instruments or cameras mounted near open filling lines to prevent condensation drip and debris shedding.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown", "camera"],
    url: URL_EHEDG,
    confidence: "medium",
  },
  {
    id: "nsf-ansi-51",
    framework: "NSF/ANSI 51",
    clause: "NSF/ANSI 51",
    title: "Food Equipment Materials",
    summary:
      "Specifies public-health material requirements for plastics, elastomers, coatings, and metals used in food-zone and splash-zone equipment surfaces.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown"],
    url: URL_NSF,
    confidence: "high",
  },
  {
    id: "nsf-ansi-169",
    framework: "NSF/ANSI 169",
    clause: "NSF/ANSI 169",
    title: "Special Purpose Food Equipment and Devices",
    summary:
      "Establishes sanitary design, cleanability, and material criteria for specialized devices and accessories installed in food and beverage handling environments.",
    domain: "food_safety",
    appliesWhen: ["food_contact", "washdown"],
    url: URL_NSF,
    confidence: "high",
  },
];

const BY_ID = new Map<string, ComplianceClause>(
  COMPLIANCE.map((entry) => [entry.id.toLowerCase(), entry]),
);

/**
 * Return every clause relevant to at least one of the supplied tags, preserving
 * catalogue order with no duplicates.
 */
export function clausesFor(tags: ComplianceTag[]): ComplianceClause[] {
  if (tags.length === 0) return [];
  const wanted = new Set<ComplianceTag>(tags);
  return COMPLIANCE.filter((entry) => entry.appliesWhen.some((tag) => wanted.has(tag)));
}

/** Look up a single compliance clause by its stable slug id. */
export function clauseById(id: string): ComplianceClause | undefined {
  return BY_ID.get(id.trim().toLowerCase());
}
