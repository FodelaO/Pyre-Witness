# Economic loss model: method note

`FAIR · Monte Carlo 10,000 draws · fixed seed · assumed plant economics (simulated plant)`
(the same line closes every "Show more" in the app). No model calls: this is arithmetic on the twin.

## The model in six lines

1. **Scenario** = one asset + one trigger (rules-engine finding or path, matched advisory, compliance gap, tabletop outcome) + one consequence class (`device`, `processStop`, `productHold`, `ammoniaRelease`, `productRecall`).
2. **TEF** (threat events / yr) = contact prior of the access mechanism × 0.7 per lateral hop × 0.35 per enforced conduit, on the shortest route the rules engine finds in this twin. Exposure appears here only.
3. **Vulnerability** (probability, 0 to 1) = evidence prior of the trigger (KEV > default credentials > CVSS score > unmanaged > general > compliance) × 0.75 per resistance safeguard on the asset.
4. **Loss magnitude** = primary (downtime + repair + product + response) + secondary (regulatory and liability, zero outside ammonia release and recall). Each is a low / most likely / high estimate.
5. **Simulation** = 10,000 PERT draws per component by inverse CDF, seeded by the scenario id. Outage, product and response share one severity quantile in 70% of draws (rank correlation 0.7).
6. **Outputs** = mean, P10, P50, P90 of the simulated single-event loss; `LEF = TEF × Vuln`; `ALE = LEF × mean`. The plant figure sums the highest ALE per asset and consequence.

## Formulas

| Quantity | Formula |
| --- | --- |
| PERT (λ = 4) | `Beta(1 + 4(m−a)/(b−a), 1 + 4(b−m)/(b−a))` on `[a, b]`; mean `(a + 4m + b) / 6`; variance `(mean−a)(b−mean) / 7` |
| Line value | 36,000 bottles/h × 0.78 OEE × $0.19 margin = **$5,335 per scheduled hour** |
| Downtime | hours stopped × line value × line dependency of the asset (one line stop, split across the stopped equipment) |
| Repair | installed replacement × damage fraction; replacement = kind base × (size ÷ reference)^0.65 × material premiums |
| Product | bottles held, scrapped or recalled × $0.24 unit cost |
| Response | person-hours × $180 |
| Frequency | `LEF = TEF × Vuln` (exact PERT means); `ALE = LEF × mean single-event loss` |

## Assumed vs published

| Input | Basis |
| --- | --- |
| U.S. OSHA maximum, willful or repeated violation: **$165,514** (reference line on ammonia scenarios, not a model input) | published: <https://www.osha.gov/penalties>, read 2026-11-21 |
| Line economics (rate, OEE, margin, unit cost, labour rate), installed costs, sizing exponent | assumed (simulated plant) |
| Consequence ranges (hours, damage, product fraction, response hours, liability) | assumed (simulated plant) |
| Contact priors, evidence priors, hop / conduit / safeguard factors, 0.7 severity correlation | assumed (simulated plant) |

## Three worked examples (seed twin)

The first two are the figures the asset inspector shows today. The third is the scenario the tabletop mount builds when the ammonia exercise ends in an evacuation.

| | HMI-F3 · USB-01 finding | PLC-F3 · SAFE-01 finding | C-1 · ammonia tabletop, evacuation |
| --- | --- | --- | --- |
| Downtime | 15 h × $5.3k/h × 25% ≈ $20k | 15 h × $5.3k/h ≈ $80k | 142 h × $5.3k/h ≈ $750k |
| Repair | $8.9k × 17% ≈ $1.5k | $42k × 17% ≈ $7.1k | $240k × 50% ≈ $120k |
| Product | 2,490 bottles × 24¢ ≈ $600 | 2,490 bottles × 24¢ ≈ $600 | $0 |
| Response | 37 person-h × $180 ≈ $6.7k | 37 person-h × $180 ≈ $6.7k | 420 person-h × $180 ≈ $76k |
| Secondary | $0 | $0 | ($180k + 4 × $950k + $4.5M) ÷ 6 ≈ $1.4M |
| **Single event** | **$29k** (P10 $15k, P90 $44k) | **$94k** (P10 $47k, P90 $150k) | **$2.3M** (P10 $1.4M, P90 $3.4M) |
| TEF | 0.61/yr, removable media via Visitor | 2.71 × 0.7⁴ = 0.65/yr, cloud route, 4 hops | 0.11/yr, internal access |
| Vuln | 14% | 14% (57% under a KEV advisory) | 14% |
| LEF | 1 in 12 yr | 1 in 11 yr (1 in 2.7 yr under KEV) | 1 in 63 yr |
| **ALE** | **$2.5k / yr** | **$8.6k / yr** ($35k under KEV) | **$37k / yr** |

Hours are PERT means, for example (2 + 4 × 12 + 40) ÷ 6 = 15 h. Plant header: **$110k / yr** over 43 detections, each asset and consequence counted once.

## Honest limits

- **Not calibrated.** Every prior is an assumption for a fictional plant. A real site replaces them with quotes, incident history and control test results. Read the figures as order of magnitude and ranking.
- **Fictional plant.** North Beverage Facility Line 3 does not exist. One published constant, used for context only.
- **Excluded:** insurance recoveries, reputational and market-share loss, contractual penalties, fatality or injury costs.
- The plant figure adds scenarios across assets and does not model common-cause events hitting several assets at once.
- Liability is always incurred inside the two severe classes (no separate secondary-loss probability).
- Displayed factors are rounded to two significant digits, so a shown formula can differ from the simulated mean by a few percent.
