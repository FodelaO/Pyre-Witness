/**
 * MITRE ATT&CK(R) for ICS techniques, generated from the official STIX bundle
 * (github.com/mitre-attack/attack-stix-data, ics-attack v20.1). 104 active techniques.
 * (c) The MITRE Corporation. Reproduced and distributed with the permission of The MITRE Corporation.
 * GENERATED FILE: do not edit by hand. Every technique id shown in the UI must exist here.
 */
export interface AttackTechnique {
  id: string;
  name: string;
  tactics: string[];
  url: string;
}

export const ATTACK_ICS_VERSION = "20.1";

export const ATTACK_ICS: readonly AttackTechnique[] = [
  {
    "id": "T0800",
    "name": "Activate Firmware Update Mode",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0800"
  },
  {
    "id": "T0801",
    "name": "Monitor Process State",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0801"
  },
  {
    "id": "T0802",
    "name": "Automated Collection",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0802"
  },
  {
    "id": "T0806",
    "name": "Brute Force I/O",
    "tactics": [
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0806"
  },
  {
    "id": "T0809",
    "name": "Data Destruction",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0809"
  },
  {
    "id": "T0811",
    "name": "Data from Information Repositories",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0811"
  },
  {
    "id": "T0813",
    "name": "Denial of Control",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0813"
  },
  {
    "id": "T0814",
    "name": "Denial of Service",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0814"
  },
  {
    "id": "T0815",
    "name": "Denial of View",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0815"
  },
  {
    "id": "T0816",
    "name": "Device Restart/Shutdown",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0816"
  },
  {
    "id": "T0817",
    "name": "Drive-by Compromise",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0817"
  },
  {
    "id": "T0819",
    "name": "Exploit Public-Facing Application",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0819"
  },
  {
    "id": "T0820",
    "name": "Exploitation for Evasion",
    "tactics": [
      "evasion"
    ],
    "url": "https://attack.mitre.org/techniques/T0820"
  },
  {
    "id": "T0821",
    "name": "Modify Controller Tasking",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0821"
  },
  {
    "id": "T0822",
    "name": "External Remote Services",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0822"
  },
  {
    "id": "T0823",
    "name": "Graphical User Interface",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0823"
  },
  {
    "id": "T0826",
    "name": "Loss of Availability",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0826"
  },
  {
    "id": "T0827",
    "name": "Loss of Control",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0827"
  },
  {
    "id": "T0828",
    "name": "Loss of Productivity and Revenue",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0828"
  },
  {
    "id": "T0829",
    "name": "Loss of View",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0829"
  },
  {
    "id": "T0830",
    "name": "Adversary-in-the-Middle",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0830"
  },
  {
    "id": "T0831",
    "name": "Manipulation of Control",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0831"
  },
  {
    "id": "T0832",
    "name": "Manipulation of View",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0832"
  },
  {
    "id": "T0834",
    "name": "Native API",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0834"
  },
  {
    "id": "T0835",
    "name": "Manipulate I/O Image",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0835"
  },
  {
    "id": "T0836",
    "name": "Modify Parameter",
    "tactics": [
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0836"
  },
  {
    "id": "T0837",
    "name": "Loss of Protection",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0837"
  },
  {
    "id": "T0838",
    "name": "Modify Alarm Settings",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0838"
  },
  {
    "id": "T0840",
    "name": "Network Connection Enumeration",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0840"
  },
  {
    "id": "T0842",
    "name": "Network Sniffing",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0842"
  },
  {
    "id": "T0843",
    "name": "Program Download",
    "tactics": [
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0843"
  },
  {
    "id": "T0843.001",
    "name": "Download All",
    "tactics": [
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0843/001"
  },
  {
    "id": "T0843.002",
    "name": "Online Edit",
    "tactics": [
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0843/002"
  },
  {
    "id": "T0843.003",
    "name": "Program Append",
    "tactics": [
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0843/003"
  },
  {
    "id": "T0845",
    "name": "Program Upload",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0845"
  },
  {
    "id": "T0846",
    "name": "Remote System Discovery",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0846"
  },
  {
    "id": "T0846.001",
    "name": "Port Scan",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0846/001"
  },
  {
    "id": "T0846.002",
    "name": "Broadcast Discovery",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0846/002"
  },
  {
    "id": "T0846.003",
    "name": "Multicast Discovery",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0846/003"
  },
  {
    "id": "T0847",
    "name": "Replication Through Removable Media",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0847"
  },
  {
    "id": "T0848",
    "name": "Rogue Master",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0848"
  },
  {
    "id": "T0849",
    "name": "Masquerading",
    "tactics": [
      "evasion"
    ],
    "url": "https://attack.mitre.org/techniques/T0849"
  },
  {
    "id": "T0851",
    "name": "Rootkit",
    "tactics": [
      "evasion",
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0851"
  },
  {
    "id": "T0852",
    "name": "Screen Capture",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0852"
  },
  {
    "id": "T0858",
    "name": "Change Operating Mode",
    "tactics": [
      "execution",
      "evasion"
    ],
    "url": "https://attack.mitre.org/techniques/T0858"
  },
  {
    "id": "T0859",
    "name": "Valid Accounts",
    "tactics": [
      "persistence",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0859"
  },
  {
    "id": "T0860",
    "name": "Wireless Compromise",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0860"
  },
  {
    "id": "T0861",
    "name": "Point & Tag Identification",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0861"
  },
  {
    "id": "T0862",
    "name": "Supply Chain Compromise",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0862"
  },
  {
    "id": "T0863",
    "name": "User Execution",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0863"
  },
  {
    "id": "T0864",
    "name": "Transient Cyber Asset",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0864"
  },
  {
    "id": "T0865",
    "name": "Spearphishing Attachment",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0865"
  },
  {
    "id": "T0866",
    "name": "Exploitation of Remote Services",
    "tactics": [
      "initial-access",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0866"
  },
  {
    "id": "T0867",
    "name": "Lateral Tool Transfer",
    "tactics": [
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0867"
  },
  {
    "id": "T0868",
    "name": "Detect Operating Mode",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0868"
  },
  {
    "id": "T0869",
    "name": "Standard Application Layer Protocol",
    "tactics": [
      "command-and-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0869"
  },
  {
    "id": "T0869.001",
    "name": "DNS",
    "tactics": [
      "command-and-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0869/001"
  },
  {
    "id": "T0869.002",
    "name": "Publish/Subscribe Protocols",
    "tactics": [
      "command-and-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0869/002"
  },
  {
    "id": "T0871",
    "name": "Execution through API",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0871"
  },
  {
    "id": "T0872",
    "name": "Indicator Removal on Host",
    "tactics": [
      "evasion"
    ],
    "url": "https://attack.mitre.org/techniques/T0872"
  },
  {
    "id": "T0873",
    "name": "Project File Infection",
    "tactics": [
      "persistence"
    ],
    "url": "https://attack.mitre.org/techniques/T0873"
  },
  {
    "id": "T0873.001",
    "name": "Siemens Project File Format",
    "tactics": [
      "persistence"
    ],
    "url": "https://attack.mitre.org/techniques/T0873/001"
  },
  {
    "id": "T0874",
    "name": "Hooking",
    "tactics": [
      "execution",
      "privilege-escalation"
    ],
    "url": "https://attack.mitre.org/techniques/T0874"
  },
  {
    "id": "T0877",
    "name": "I/O Image",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0877"
  },
  {
    "id": "T0878",
    "name": "Alarm Suppression",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0878"
  },
  {
    "id": "T0879",
    "name": "Damage to Property",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0879"
  },
  {
    "id": "T0880",
    "name": "Loss of Safety",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0880"
  },
  {
    "id": "T0881",
    "name": "Service Stop",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0881"
  },
  {
    "id": "T0882",
    "name": "Theft of Operational Information",
    "tactics": [
      "impact"
    ],
    "url": "https://attack.mitre.org/techniques/T0882"
  },
  {
    "id": "T0883",
    "name": "Internet Accessible Device",
    "tactics": [
      "initial-access"
    ],
    "url": "https://attack.mitre.org/techniques/T0883"
  },
  {
    "id": "T0884",
    "name": "Connection Proxy",
    "tactics": [
      "command-and-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0884"
  },
  {
    "id": "T0885",
    "name": "Commonly Used Port",
    "tactics": [
      "command-and-control"
    ],
    "url": "https://attack.mitre.org/techniques/T0885"
  },
  {
    "id": "T0886",
    "name": "Remote Services",
    "tactics": [
      "initial-access",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T0886"
  },
  {
    "id": "T0887",
    "name": "Wireless Sniffing",
    "tactics": [
      "discovery",
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0887"
  },
  {
    "id": "T0888",
    "name": "Remote System Information Discovery",
    "tactics": [
      "discovery"
    ],
    "url": "https://attack.mitre.org/techniques/T0888"
  },
  {
    "id": "T0889",
    "name": "Modify Program",
    "tactics": [
      "persistence"
    ],
    "url": "https://attack.mitre.org/techniques/T0889"
  },
  {
    "id": "T0890",
    "name": "Exploitation for Privilege Escalation",
    "tactics": [
      "privilege-escalation"
    ],
    "url": "https://attack.mitre.org/techniques/T0890"
  },
  {
    "id": "T0892",
    "name": "Change Credential",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T0892"
  },
  {
    "id": "T0893",
    "name": "Data from Local System",
    "tactics": [
      "collection"
    ],
    "url": "https://attack.mitre.org/techniques/T0893"
  },
  {
    "id": "T0894",
    "name": "System Binary Proxy Execution",
    "tactics": [
      "evasion"
    ],
    "url": "https://attack.mitre.org/techniques/T0894"
  },
  {
    "id": "T0895",
    "name": "Autorun Image",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T0895"
  },
  {
    "id": "T1691",
    "name": "Block Operational Technology Message",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1691"
  },
  {
    "id": "T1691.001",
    "name": "Command Message",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1691/001"
  },
  {
    "id": "T1691.002",
    "name": "Reporting Message",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1691/002"
  },
  {
    "id": "T1692",
    "name": "Unauthorized Message",
    "tactics": [
      "evasion",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1692"
  },
  {
    "id": "T1692.001",
    "name": "Command Message",
    "tactics": [
      "evasion",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1692/001"
  },
  {
    "id": "T1692.002",
    "name": "Reporting Message",
    "tactics": [
      "evasion",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1692/002"
  },
  {
    "id": "T1693",
    "name": "Modify Firmware",
    "tactics": [
      "persistence",
      "inhibit-response-function",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1693"
  },
  {
    "id": "T1693.001",
    "name": "System Firmware",
    "tactics": [
      "persistence",
      "inhibit-response-function",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1693/001"
  },
  {
    "id": "T1693.002",
    "name": "Module Firmware",
    "tactics": [
      "persistence",
      "inhibit-response-function",
      "impair-process-control"
    ],
    "url": "https://attack.mitre.org/techniques/T1693/002"
  },
  {
    "id": "T1694",
    "name": "Insecure Credentials",
    "tactics": [
      "persistence",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T1694"
  },
  {
    "id": "T1694.001",
    "name": "Default Credentials",
    "tactics": [
      "persistence",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T1694/001"
  },
  {
    "id": "T1694.002",
    "name": "Hardcoded Credentials",
    "tactics": [
      "persistence",
      "lateral-movement"
    ],
    "url": "https://attack.mitre.org/techniques/T1694/002"
  },
  {
    "id": "T1695",
    "name": "Block Communications",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1695"
  },
  {
    "id": "T1695.001",
    "name": "Serial COM",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1695/001"
  },
  {
    "id": "T1695.002",
    "name": "Ethernet",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1695/002"
  },
  {
    "id": "T1695.003",
    "name": "Wi-Fi",
    "tactics": [
      "inhibit-response-function"
    ],
    "url": "https://attack.mitre.org/techniques/T1695/003"
  },
  {
    "id": "T1701",
    "name": "Command and Scripting Interpreter",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701"
  },
  {
    "id": "T1701.001",
    "name": "PowerShell",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/001"
  },
  {
    "id": "T1701.002",
    "name": "Windows Command Shell",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/002"
  },
  {
    "id": "T1701.003",
    "name": "Unix Shell",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/003"
  },
  {
    "id": "T1701.004",
    "name": "Visual Basic",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/004"
  },
  {
    "id": "T1701.005",
    "name": "Python",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/005"
  },
  {
    "id": "T1701.006",
    "name": "JavaScript",
    "tactics": [
      "execution"
    ],
    "url": "https://attack.mitre.org/techniques/T1701/006"
  }
]
;

const BY_ID = new Map(ATTACK_ICS.map((t) => [t.id, t]));

export function techniqueById(id: string): AttackTechnique | undefined {
  return BY_ID.get(id.trim().toUpperCase());
}

export function isKnownTechnique(id: string): boolean {
  return BY_ID.has(id.trim().toUpperCase());
}
