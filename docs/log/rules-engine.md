# Inspector rules engine

`src/rules/engine.ts` evaluates the fictional plant in the browser and server with the same pure TypeScript rules. `evaluateTwin` returns findings, paths, plant and area scores, and a timestamp. `evaluatePlacement` evaluates a candidate as an upsert, includes new or worsened findings on other assets, and returns routes through that candidate. `explainRule` provides the registered rule description and references. `computedAt` is the sole time-dependent field.

## Checks

| Rule | Condition | Control references | ATT&CK for ICS |
| --- | --- | --- | --- |
| RF-01 | Wi-Fi, Bluetooth, cellular, Zigbee or LoRa at Purdue 0–3 within an RF entry radius or 30 m of a public or outdoor area | IEC 62443-3-3 SR 1.6 and 2.2, NIST SP 800-82r3 §6.2.9 | T0860 |
| ZONE-01 | Cloud or remote access at Purdue 0–3 without an evidenced, enforced route to a Level 3.5 zone | IEC 62443-3-3 SR 5.1 and 5.2, NIST SP 800-82r3 §6.2.10 | T0822 remote, T0883 conditional internet exposure |
| ZONE-02 | Flat or unenforced connectivity across zones of different consequence or OT/IT trust | IEC 62443-3-3 SR 5.1 and 5.2, NIST SP 800-82r3 §5.2.3.1 | T0886 |
| ZONE-03 | Purdue level falls outside the declared area's typical levels | IEC 62443-3-3 SR 5.1, NIST SP 800-82r3 §5.2.3.1 | |
| CRED-01 | Known default credentials on an asset with modeled network connectivity | IEC 62443-3-3 SR 1.5, NIST SP 800-82r3 §6.2.1.4.5 | T1694.001 |
| USB-01 | Removable media or an exposed media interface in OT, escalated near public access | IEC 62443-3-3 SR 2.3, NIST SP 800-82r3 §6.2.7, NIST SP 1334 | T0847 |
| PHYS-01 | Documented exposed port inside or within 5.5 m of a public-access area | NIST SP 800-82r3 §5.2.2, NIST SP 800-53 Rev. 5 PE-3 | T0864 for potential entry via exposed data ports |
| TRANS-01 | Unmanaged laptop or phone with modeled network connectivity at Purdue 0–2 | IEC 62443-3-3 SR 2.3, NIST SP 800-82r3 §6.2.1 | T0864 |
| CAM-01 | Camera within 10 m of an HMI or keypad in the same room, or using a cloud service in OT | IEC 62443-3-3 SR 4.1, NIST SP 800-82r3 §6.2.3 | T0882 for possible disclosure of operational information |
| HAZ-01 | Potential ignition source in an NH₃ area without recognizable gas-area marking | NFPA 70 Articles 500–505, IEC 60079-14, ANSI/IIAR 2, OSHA 29 CFR 1910.119 and 1910.307 | |
| WASH-01 | Missing washdown or hygienic material evidence, or explicitly non-food-grade equipment within 5 m of open product | FDA 21 CFR 117.40(a), EHEDG Guideline 13, 3-A 00-02, IEC 60529 and ISO 20653 for IP codes | |
| SAFE-01 | At least one modeled path reaches a safety-critical asset. The target receives severity 5 | IEC 61511-1 §11.2, IEC 62443-3-3 SR 5.1, NIST SP 800-82r3 §2.3.7 | T0880 |
| MGMT-01 | Cyber profile explicitly identifies an OT device outside inventory and patch management | NIST SP 800-82r3 §§6.1.1 and 6.2.11 | |

The control references describe the practices behind each check. The 316L and high-pressure washdown criteria are assumptions for this plant. IP66 gives water-jet evidence and still produces a lower-severity check for high-pressure cleaning. IP67/IP68 alone document immersion. Hazard marking is a preliminary screen. Equipment suitability also depends on the site's classification, gas group, temperature class, documentation and installation. OSHA PSM applicability depends on the covered process and inventory. [IEC 62443-3-3](https://webstore.iec.ch/en/publication/7033), [NIST OT security guide](https://csrc.nist.gov/pubs/sp/800/82/r3/final), [IEC 60079-14](https://webstore.iec.ch/en/publication/66049), [OSHA ammonia refrigeration standards](https://www.osha.gov/ammonia-refrigeration/standards), [21 CFR 117.40](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-117/subpart-B/section-117.40), [ISO 20653](https://www.iso.org/standard/76116.html)

## Reachability and score

- The graph uses modeled entry points and assets. Active network links are bidirectional. An explicit disabled link takes precedence over inferred connectivity. A declared firewall or switch must exist in the twin to count as enforcing a conduit. Enforced cross-zone boundaries stop lateral traversal because the current conduit allowlists are free text.
- Configured same-zone members may attach to a modeled local network endpoint when the cable drawing is incomplete. An RF-exposed Wi-Fi device assigned to an existing zone can have a conditional association with that zone. An unenforced conduit with an enrolled endpoint can provide a connection between zones. RF uses the declared radius first and can use a representative RF origin for the boundary-distance check. Visitor adjacency uses 5 m plus 0.5 m for center-point tolerance.
- Breadth-first search visits up to six steps and emits paths to criticality 4–5 or safety-critical targets. The plant report keeps the strongest route for each entry, access mechanism and target, and a representative route for each added entry landing. Focused evaluation keeps alternate routes through the candidate where its bounded search finds them. Every emitted technique resolves through the checked-in MITRE ATT&CK for ICS dataset. [MITRE ATT&CK for ICS](https://attack.mitre.org/matrices/ics/)
- Let `E` be the sum of the maximum `severity²` for each rule and asset plus the maximum `severity × likelihood` for each entry, access mechanism and target. SAFE-01 is represented by the path impact and adds no second weight. Path likelihood starts from the entry mechanism and drops one grade every three additional hops. Plant score is `round(100 × E / (600 + E), 2)`. Bands start at 20, 40, 60 and 80 for guarded, elevated, high and critical. Area scores apply the same formula to local findings and path targets.
- Stronger independent evidence raises the index. Removing an exposure or lowering its severity lowers the index when that exposure contributes to the aggregate. Paths with the same entry, mechanism and target contribute once, so a redundant path can leave the numeric score unchanged. The score is an ordinal screening index for the twin.
- `rankPlacements` tests each area's typical levels, with role constraints for process equipment, HMIs, controllers, instruments and removable media. It uses modeled local network zones where available. It keeps the original coordinates in the current area and uses the destination center for other areas, carries a conduit only in its existing zone, and retains documented cables. It sorts by resulting plant score and returns severity 4–5 findings relevant to the placement. Reapply the same coordinates and conduit choices when comparing its score to a move.

## Verification and limits

Run `npm run typecheck`, `npx vitest run src/rules` and `npm test`. The rules suite covers the seed weaknesses, Wi-Fi camera relocation and radio mitigation, network isolation, removable media, portable device management, hazard and washdown decisions, DMZ enforcement and canonical techniques. It times a warmed 120-asset evaluation against a 15 ms p95 budget.

All 10 Inspector tests and all 20 repository tests passed. A separate local Node run on the 120-asset dense RF/USB fixture returned 240 paths. After 50 warm-up evaluations, 250 timed evaluations measured 2.41 ms median, 3.75 ms p95 and 5.37 ms maximum. On the 92-asset seed, the test camera raised risk from 46.09 to 47.32. Disabling its radio lowered the score to 46.52, and its best ranked placement scored 46.09.

The twin supplies modeled reachability and preliminary placement checks. Field assessment would require RF surveys, camera field-of-view and enclosure data, structured ACLs, evidence of active inbound services and site approval records. Missing origin or attachment data can yield a finding without a path. The graph uses network and access links and carries no process damage model. A ranked center location still needs normal placement review.
