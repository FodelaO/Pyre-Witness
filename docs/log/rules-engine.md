# Inspector rules engine

`src/rules/engine.ts` evaluates the fictional plant in the browser and server with the same TypeScript rules. `evaluateTwin` returns findings, paths, plant and area scores, and a timestamp. It returns the same report and timestamp when called again with the same immutable twin object. `evaluatePlacement` evaluates a candidate as an upsert, includes new or worsened findings on other assets, and returns routes through that candidate. `explainRule` provides the registered rule description and references. `computedAt` is the sole time-dependent field on a fresh evaluation.

## Checks

| Rule | Condition | Control references | ATT&CK for ICS |
| --- | --- | --- | --- |
| RF-01 | Wi-Fi, Bluetooth, cellular, Zigbee or LoRa at Purdue 0–3 within an RF entry radius or 30 m of a public or outdoor area | IEC 62443-3-3 SR 1.6 and 2.2, NIST SP 800-82 Rev. 3 Section 6.2.9 | T0860 |
| ZONE-01 | Cloud or remote access at Purdue 0–3 without an evidenced, enforced route to a Level 3.5 zone | IEC 62443-3-3 SR 5.1 and 5.2, NIST SP 800-82 Rev. 3 Sections 5.2.3 and 6.2.10 | T0822 remote, T0883 conditional internet exposure |
| ZONE-02 | Flat or unenforced connectivity across zones of different consequence or OT/IT trust | IEC 62443-3-3 SR 5.1 and 5.2, NIST SP 800-82 Rev. 3 Section 5.2.3 | T0886 |
| ZONE-03 | Purdue level falls outside the declared area's typical levels | IEC 62443-3-2 Section 4 (ZCR), NIST SP 800-82 Rev. 3 Section 5.2.3 | |
| CRED-01 | Known default credentials on an asset with modeled network connectivity | IEC 62443-3-3 SR 1.5, NIST SP 800-82 Rev. 3 Section 6.2.1 | T1694.001 |
| USB-01 | Removable media or an exposed media interface in OT, escalated near public access and downgraded for a protected interface | IEC 62443-3-3 SR 2.3, NIST SP 800-82 Rev. 3 Section 6.2.7 | T0847 |
| PHYS-01 | Documented port inside or within 5.5 m of a public-access area, downgraded for a protected port | NIST SP 800-82 Rev. 3 Section 5.2.2, NIST CSF 2.0 PR.AA | T0864 for potential entry via exposed data ports |
| TRANS-01 | Unmanaged laptop or phone with modeled network connectivity at Purdue 0–2 | IEC 62443-3-3 SR 2.3, NIST SP 800-82 Rev. 3 Section 6.2.1 | T0864 |
| CAM-01 | Camera within 10 m of an HMI or keypad in the same room, or using a cloud service in OT | IEC 62443-3-3 SR 4.1, NIST SP 800-82 Rev. 3 Section 5.2.2 | T0882 for possible disclosure of operational information |
| HAZ-01 | Potential ignition source in an NH₃ area without recognizable gas-area marking | NFPA 70 (NEC) Articles 500 and 505, IEC 60079-14, ANSI/IIAR 2 Chapter 6, OSHA 29 CFR 1910.119(d) | |
| WASH-01 | Missing washdown or hygienic material evidence, or explicitly non-food-grade equipment within 5 m of open product | FDA 21 CFR 117.40, EHEDG Docs. 8 and 13, 3-A Sanitary Standards, IEC 60529, ISO 20653 | |
| SAFE-01 | A modeled path reaches a safety-critical asset without an applicable independent interlock. The target receives severity 5 | IEC 61511-1 (SIS Separation and SIS Security Risk Assessment), IEC 62443-3-3 SR 5.1 | T0880 |
| MGMT-01 | Cyber profile explicitly identifies an OT device outside inventory and patch management | IEC 62443-2-1 (Asset Owner Program), NIST CSF 2.0 ID.AM | |

Rules resolve stable clause IDs from `src/data/compliance.ts` and format those entries as readable references. The 316L and high-pressure washdown criteria are assumptions for this plant. IP66 gives water-jet evidence and still produces a lower-severity check for high-pressure cleaning. IP67/IP68 alone document immersion. Hazard marking is a preliminary screen. Equipment suitability also depends on the site's classification, gas group, temperature class, documentation and installation. OSHA PSM applicability depends on the covered process and inventory. [IEC 62443-3-3](https://webstore.iec.ch/en/publication/7033), [NIST OT security guide](https://csrc.nist.gov/pubs/sp/800/82/r3/final), [IEC 60079-14](https://webstore.iec.ch/en/publication/66049), [OSHA ammonia refrigeration standards](https://www.osha.gov/ammonia-refrigeration/standards), [21 CFR 117.40](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-117/subpart-B/section-117.40), [ISO 20653](https://www.iso.org/standard/76116.html)

## Reachability and score

- The graph uses modeled entry points and assets. Active network links are bidirectional. An explicit disabled link takes precedence over inferred connectivity. A declared firewall or switch must exist in the twin to count as enforcing a conduit. Enforced cross-zone boundaries stop lateral traversal because the current conduit allowlists are free text.
- Configured same-zone members may attach to a modeled local network endpoint when the cable drawing is incomplete. An RF-exposed Wi-Fi device assigned to an existing zone can have a conditional association with that zone. An unenforced conduit with an enrolled endpoint can provide a connection between zones. RF uses the declared radius first and can use a representative RF origin for the boundary-distance check. Visitor adjacency uses 5 m plus 0.5 m for center-point tolerance.
- Hazard, washdown, food and public-access checks use spatial evidence from every area at the asset's position. Public-access and food proximity also use the nearest applicable boundary. The declared home area still supplies the Purdue placement expectation.
- A port lock or locked cabinet lowers USB-01 and PHYS-01 severity and removes initial edges that rely on direct port access. Independent RF or remote paths and separate portable media findings retain their own evidence. An interlock on a safety-critical valve suppresses SAFE-01 when the final step is network-mediated, including direct RF, internet and remote arrivals. The route remains visible at residual severity, capped at 4. Direct local physical or USB access can still escalate. Gas detection and emergency ventilation do not establish equipment suitability for an NH₃ area.
- Breadth-first search visits up to six steps and emits paths to criticality 4–5 or safety-critical targets. The plant report keeps the strongest route for each entry, access mechanism and target, and a representative route for each added entry landing. Focused evaluation keeps alternate routes through the candidate where its bounded search finds them. Every emitted technique resolves through the checked-in MITRE ATT&CK for ICS dataset. [MITRE ATT&CK for ICS](https://attack.mitre.org/matrices/ics/)
- Let `E` be the sum of the maximum `severity²` for each rule and asset plus the maximum `severity × likelihood` for each entry, access mechanism and target. SAFE-01 is represented by the path impact and adds no second weight. Path likelihood starts from the entry mechanism and drops one grade every three additional hops. Plant score is `round(100 × E / (600 + E), 2)`. Bands start at 20, 40, 60 and 80 for guarded, elevated, high and critical. Area scores apply the same formula to local findings and path targets.
- Stronger independent evidence raises the index. Removing an exposure or lowering its severity lowers the index when that exposure contributes to the aggregate. Paths with the same entry, mechanism and target contribute once, so a redundant path can leave the numeric score unchanged. The score is an ordinal screening index for the twin.
- `rankPlacements` tests each area's typical levels, with role constraints for process equipment, HMIs, controllers, instruments and removable media. It uses modeled local network zones where available. It keeps the original coordinates in the current area and uses the destination center for other areas, carries a conduit only in its existing zone, and retains documented cables. It sorts by resulting plant score and returns severity 4–5 findings relevant to the placement. Reapply the same coordinates and conduit choices when comparing its score to a move.

## Verification and limits

Run `npm run typecheck`, `npx vitest run src/rules` and `npm test`. The rules suite covers network and physical safeguard effects, overlapping areas, catalogue references, report identity and the original placement and mitigation cases. The drag timing test warms up and takes the median of seven batch medians on fresh 92-asset snapshots against a 1.5 ms budget. Each frame receives a fresh snapshot and changes an asset position. A separate dense 120-asset fixture checks bounded output.

The engine indexes topology and entry points once per immutable twin snapshot. Position evidence is reused across frames that share the area and entry-point arrays and the asset's physical object. Graph traversal reuses a breadth-first walk per landing. The weakly keyed report cache assumes callers treat snapshots and reports as immutable.

The local Node profile identified graph construction as the largest measured phase in the original seed evaluator. The comparison below used the same snapshots and alternated the order of the original and updated engines across 15 warmed batches. Fresh snapshots were measured individually. The repeated-identity row shows amortized time per call.

| Case | Median before | Median after | p95 before | p95 after |
| --- | ---: | ---: | ---: | ---: |
| Fresh drag snapshot, 92-asset seed | 0.269 ms | 0.210 ms | 2.20 ms | 2.19 ms |
| Repeated call with the same seed snapshot | 0.200 ms | <0.001 ms | | |
| Fresh drag snapshot, dense 120-asset RF/USB fixture | 3.23 ms | 2.12 ms | 5.82 ms | 4.22 ms |

Across 32 unprotected frames, report JSON matched after normalizing the timestamp and the intended catalogue reference changes. The seed score remained 46.09.

Repository typecheck passed. Three consecutive focused runs passed all 23 Inspector tests with default parallelism. The full suite completed with 279 passed and 3 skipped.

The twin supplies modeled reachability and preliminary placement checks. Field assessment would require RF surveys, camera field-of-view and enclosure data, structured ACLs, evidence of active inbound services and site approval records. Missing origin or attachment data can yield a finding without a path. The graph uses network and access links and carries no process damage model. A ranked center location still needs normal placement review.
