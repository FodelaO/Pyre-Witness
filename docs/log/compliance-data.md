# Task log: `compliance-data`

## What was built

Created the compliance reference catalogue in [src/data/compliance.ts](file:///Users/pablo/Gemini%20Hackathon/src/data/compliance.ts) and unit tests in [src/data/compliance.test.ts](file:///Users/pablo/Gemini%20Hackathon/src/data/compliance.test.ts).

Exports:
- `ComplianceClause`, `ComplianceTag`, `ComplianceDomain`, `COMPLIANCE_TAGS`
- `COMPLIANCE`: 58 curated clauses spanning OT cybersecurity, process safety / ammonia refrigeration, functional safety, hazardous electrical locations / enclosure ingress protection, and food safety / hygienic design
- `clausesFor(tags)`: returns matching clauses in catalogue order without duplicates
- `clauseById(id)`: stable case-insensitive slug lookup

## Frameworks & clause counts (58 total)

| Framework | Domain | Clauses |
| --- | --- | ---: |
| IEC 62443-3-3 | `cyber` | 13 |
| IEC 62443-3-2 | `cyber` | 2 |
| IEC 62443-2-1 | `cyber` | 2 |
| IEC 62443-2-4 | `cyber` | 1 |
| NIST SP 800-82 Rev. 3 | `cyber` | 6 |
| NIST CSF 2.0 | `cyber` | 5 |
| EU NIS2 (Directive 2022/2555) | `cyber` | 3 |
| OSHA 29 CFR 1910.119 | `process_safety` | 3 |
| EPA 40 CFR Part 68 | `process_safety` | 2 |
| ANSI/IIAR 2 | `process_safety` | 3 |
| NIOSH IDLH | `process_safety` | 1 |
| IEC 61511-1 | `process_safety` | 2 |
| NFPA 70 (NEC) | `electrical` | 2 |
| IEC 60079 | `electrical` | 2 |
| IEC 60529 | `electrical` | 1 |
| ISO 20653 | `electrical` | 1 |
| FDA 21 CFR Part 117 | `food_safety` | 2 |
| FDA 21 CFR Part 117 (FSMA) | `food_safety` | 2 |
| 3-A Sanitary Standards | `food_safety` | 1 |
| EHEDG Guidelines | `food_safety` | 2 |
| NSF/ANSI 51 | `food_safety` | 1 |
| NSF/ANSI 169 | `food_safety` | 1 |
| **Total** | | **58** |

## Entries marked `confidence: "medium"` (10 entries)

These entries are cited at document or higher-section level because exact sub-clause numbering depends on the edition or specific equipment standard:

1. `iec62443-3-2-zones-conduits` — IEC 62443-3-2 `Section 4 (ZCR)`: zone and conduit partitioning requirements (exact ZCR numbering varies across drafts/editions).
2. `iec62443-3-2-risk-assessment` — IEC 62443-3-2 `Section 4 (Risk Assessment)`: system-design cyber risk assessment requirements.
3. `iec62443-2-1-asset-program` — IEC 62443-2-1 `Document (Asset Owner Program)`: asset owner security program (2024 edition restructured elements vs. 2010 CSMS clauses).
4. `iec62443-2-1-incident-plan` — IEC 62443-2-1 `Document (Incident Planning)`: IACS incident response and recovery planning.
5. `iec62443-2-4-service-providers` — IEC 62443-2-4 `Document (Service Providers)`: service provider integration and remote maintenance program requirements.
6. `iiar-2-ventilation` — ANSI/IIAR 2 `Section 6.14`: machinery room ventilation (subsection numbering shifted slightly between 2014 and 2021 editions).
7. `iec61511-1-sis-independence` — IEC 61511-1 `IEC 61511-1 (SIS Separation)`: cited at document/topic level for SIS independence from BPCS.
8. `iec61511-1-sis-security` — IEC 61511-1 `IEC 61511-1 (SIS Security Risk Assessment)`: cited at document/topic level for SIS cybersecurity risk assessment introduced in Edition 2.
9. `3a-sanitary-standards` — 3-A Sanitary Standards `3-A Sanitary Standards`: cited at standards-series level since specific 3-A numbers vary by equipment category (pumps, valves, vessels, fittings).
10. `ehedg-doc-13` — EHEDG Guidelines `EHEDG Doc. 13`: guideline document title/scope for open-processing hygienic design (without citing a sub-paragraph).

## Key decisions

- **Zero invented clause numbers:** Where sub-clause numbers vary across editions (e.g., IEC 62443-2-1 2010 vs. 2024, IEC 61511-1, 3-A equipment-specific numbers), entries cite the document or top-level section and set `confidence: "medium"`.
- **IP69 vs. IP69K distinction:** Kept `IEC 60529` (which covers IP66/IP67/IP69) distinct from `ISO 20653` (which defines IP69K).
- **Official, non-paywalled landing URLs:** Every URL points directly to the official standards body or regulator (`isa.org`, `iec.ch`, `csrc.nist.gov`, `nist.gov`, `eur-lex.europa.eu`, `osha.gov`, `epa.gov`, `iiar.org`, `cdc.gov`, `nfpa.org`, `iso.org`, `ecfr.gov`, `fda.gov`, `3-a.org`, `ehedg.org`, `nsf.org`).
- **Tag completeness:** Every one of the 17 `ComplianceTag` values maps to multiple clauses so the rules engine, reasoning prompt, and UI get relevant references for any device or placement.

## Verification

Verified with `npx vitest run src/data` and `npm run typecheck`.

## Known gaps

- `src/rules/` and `src/pipeline/server/` currently use inline string references rather than importing `src/data/compliance.ts` directly (owned by other tasks; no cross-lane edits made).
- Standards text itself is paywalled for IEC, ISO, IIAR, 3-A, EHEDG, and NSF, so links point to the official catalogue/standards-body landing pages rather than deep clause permalinks.
