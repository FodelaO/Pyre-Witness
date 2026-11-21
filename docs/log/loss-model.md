# Pyre Witness economic loss model

Bebidas del Norte is fictional. Figures are estimated USD. The headline is the **mean cost of one event conditional on its occurrence**. Annualized loss (ALE) measures expected annual cost. The model runs locally and deterministically. The five trigger adapters accept rules-engine findings and paths, matched advisories, capture compliance gaps, and deterministic tabletop outcomes. [Open Group O-RA / O-RT overview](https://help.opengroup.org/hc/en-us/articles/32119881201682-Open-FAIR-2-Foundation-Certification-Overview)

## Calculation

- **Exposure.** Reuse the rules engine’s entry and adjacency graph. For each access mechanism, use the shortest eligible route to the asset and reduce TEF for lateral hops and traversed enforced conduits. A parallel permissive conduit removes credit for that boundary. Prefer rules-backed routes. When none exist, use a separately labeled modeled direct contact or internal baseline. Use the dominant applicable frequency to avoid adding overlapping contact opportunities. A rule path presented by the UI has current graph evidence.
- **Vulnerability.** Select the KEV, CVSS, credentials, unmanaged, compliance, or general prior. A carried CVSS score interpolates between the endpoint priors and remains a severity input. Each independent protection reduces the loss-conversion prior. An explicitly supplied, relevant approved mitigation reduces it further. Applied twin changes can also alter graph exposure or remove the detection itself.
- **Loss magnitude.** Scheduled stopped hours × good-bottle contribution/hour × lost line fraction. Repair is installed replacement × damage fraction. Product is held, scrapped or recalled bottle-equivalents × production unit cost. Response is person-hours × blended rate. Liability is active for ammonia release/evacuation and contaminated product reaching distribution. The ordinary standalone compressor stop has zero line dependency because of redundancy. Evacuation explicitly stops the line.
- **Valuation.** Installed base × (observed size ÷ reference size)^0.65, with clamped ratios and applicable stainless, hygienic enclosure and hazard premiums. Use physical specifications and process capacity before sizing proxies. Line dependencies follow active material feeds, duty/standby groups, process roots and local control relationships. When the twin describes hardwired control or post-filler flow without explicit connections, use documented cell ownership and equipment roles.
- **Asset allocations.** Identify the originating asset, local controlled and downstream/upstream interrupted equipment, damage targets, and vessels or line equipment holding exposed inventory. Apply the sampled mean repair share to installed values. Split one pooled loss of line contribution evenly across affected machines. Assign one product-loss pool across involved holders using their modeled inventory volumes, with line product as the remainder. Recall lots are counted once. Recovery and liability are separate costs. These allocation shares explain one event; they are accounting attribution rather than independent losses for each machine. The estimate adds unrounded asset and non-asset lines.
- **Uncertainty.** (Superseded by the Audit section: PERT draws, correlated severity, exact frequency means.) Originally 10,000 fixed-seed triangular draws for the five loss components and both frequency inputs. Scenario IDs hash trigger kind, trigger ID and asset ID to seed the PRNG. Component means sum to the headline. Sort total loss draws for P10/P50/P90. LEF = mean TEF × mean vulnerability. ALE = LEF × mean single-event loss. The model treats frequency inputs as independent priors. Recall corners pair low/most likely/high recall volumes with the corresponding loss fractions before sampling the product-cost range.
- **Roll-up.** Keep the maximum ALE for each asset and consequence class across findings and rule paths. Sum those retained values. The seed configuration has 7 findings and 36 paths, with a deduplicated estimate of **$110k/yr** after the audit below ($280k/yr before it). The aggregate can still include correlated losses across assets.
- **Comparison.** Capture placement compares the largest modeled conditional event in the dropped and rules-cleared placement checks. Missing relevant detections contribute zero to this comparison. The expanded signed rows reconcile the two placement cases, and the interval pertains to the named underlying event. Simulation prices the observed exercise outcome and replays applied controls from the same starting configuration. A containment improvement can produce $0 modeled savings when the cost-driving outcome is unchanged.

## Constants

All rows below use `assumed (simulated plant)` unless explicitly marked `published`. [Central economics data](../../src/econ/economics.ts)

### Line economics and valuation factors

| Constant | Value | Unit | Basis |
|---|---:|---|---|
| Nameplate rate | 36,000 | bottles/hr | assumed (simulated plant) |
| OEE | 0.78 | good-bottle fraction | assumed (simulated plant) |
| contribution margin | 0.19 | USD/bottle | assumed (simulated plant) |
| bottle litres | 0.5 | L/bottle | assumed (simulated plant) |
| shifts per day | 2 | shifts/day | assumed (simulated plant) |
| hours per shift | 8 | hr/shift | assumed (simulated plant) |
| bottling batch | 12,000 | bottles/batch | assumed (simulated plant) |
| recall batches | 4 / 18 / 65 | batches | assumed (simulated plant) |
| unit cost | 0.24 | USD/bottle | assumed (simulated plant) |
| blended response rate | 180 | USD/person-hour | assumed (simulated plant) |
| size exponent | 0.65 | sizing exponent | assumed (simulated plant) |
| min size ratio | 0.08 | reference-size ratio | assumed (simulated plant) |
| max size ratio | 8 | reference-size ratio | assumed (simulated plant) |
| stainless premium | 1.16 | installed cost multiplier | assumed (simulated plant) |
| washdown premium | 1.18 | installed cost multiplier | assumed (simulated plant) |
| hazard premium | 1.25 | installed cost multiplier | assumed (simulated plant) |
| liquid density proxy | 1,000 | kg/m³ | assumed (simulated plant) |
| kilograms per hour reference | 200 | kg/h | assumed (simulated plant) |
| process equipment base | 72,000 | USD installed | assumed (simulated plant) |
| process equipment size | 1 | drawing scale | assumed (simulated plant) |
| switch disruption | 0.45 | line fraction | assumed (simulated plant) |
| operator disruption | 0.25 | line fraction | assumed (simulated plant) |
| instrumentation disruption | 0.35 | line fraction | assumed (simulated plant) |
| area disruption | 0.15 | local line fraction | assumed (simulated plant) |
| U.S. OSHA reference | 165,514 | USD per willful or repeat violation | [published](https://www.osha.gov/penalties) |

The 36,000 bottles/hour nameplate is read from the fictional filler specification, with the same fallback. The $165,514 OSHA figure is the published 2026 U.S. willful/repeat maximum, checked on 2026-11-21. It is context only. The model uses assumed composite liability for the fictional site.

### Consequence ranges

Values are low / most likely / high. All entries use the assumed basis.

| Class | Scheduled outage (h) | Damage factor | Product fraction | Recovery (person-h) | Liability (USD) |
|---|---:|---:|---:|---:|---:|
| device | 0 / 0 / 0 | 0.05 / 0.25 / 0.85 | 0 / 0 / 0 | 4 / 12 / 26 | 0 / 0 / 0 |
| processStop | 2 / 12 / 40 | 0.01 / 0.13 / 0.52 | 0.025 / 0.18 / 0.5 | 12 / 34 / 76 | 0 / 0 / 0 |
| productHold | 3 / 14 / 48 | 0 / 0.05 / 0.3 | 0.3 / 0.7 / 1 | 22 / 75 / 180 | 0 / 0 / 0 |
| ammoniaRelease | 32 / 120 / 336 | 0.1 / 0.48 / 1 | 0.1 / 0.45 / 1 | 110 / 350 / 1,000 | 175,000 / 950,000 / 4,500,000 |
| productRecall | 24 / 78 / 240 | 0.03 / 0.18 / 0.7 | 0.65 / 0.9 / 1 | 160 / 510 / 1,500 | 250,000 / 1,400,000 / 6,800,000 |

### Installed cost references

All values are USD installed and use the assumed basis.

| Kind | Base | Size reference |
|---|---:|---|
| vertical_tank | 52,000 | 10,000 L |
| bullet_tank | 92,000 | 6,000 L |
| agitated_tank | 98,000 | 6,000 L |
| pump | 18,000 | 20 m³/h |
| valve | 7,500 | Kind base |
| instrument | 4,200 | Kind base |
| ro_skid | 160,000 | 20 m³/h |
| uv_reactor | 31,000 | 20 m³/h |
| carbo_cooler | 220,000 | 420 kW |
| heat_exchanger | 48,000 | 200 kW |
| rotary_filler | 780,000 | 36,000 bottles/h |
| conveyor | 33,000 | 1 drawing scale |
| labeler | 180,000 | 36,000 bottles/h |
| palletizer | 320,000 | 48 trays/pallet |
| chiller_compressor | 190,000 | 500 kW |
| condenser | 128,000 | 680 kW |
| plc_cabinet | 31,000 | Kind base |
| hmi | 6,500 | Kind base |
| workstation | 3,500 | Kind base |
| server_rack | 29,000 | Kind base |
| firewall | 16,500 | Kind base |
| network_switch | 5,800 | Kind base |
| wifi_ap | 1,850 | Kind base |
| ip_camera | 1,250 | Kind base |
| gateway | 3,600 | Kind base |
| laptop | 2,300 | Kind base |
| phone | 900 | Kind base |
| usb_drive | 55 | Kind base |
| generic_device | 1,650 | Kind base |

### Frequency priors and control factors

| Constant | Value | Unit | Basis |
|---|---:|---|---|
| internet | 2 / 12 / 40 | events/yr | assumed (simulated plant) |
| cloud | 0.25 / 2 / 8 | events/yr | assumed (simulated plant) |
| remote | 0.25 / 2 / 7 | events/yr | assumed (simulated plant) |
| rf | 0.05 / 0.5 / 3 | events/yr | assumed (simulated plant) |
| visitor | 0.04 / 0.4 / 2 | events/yr | assumed (simulated plant) |
| removable | 0.03 / 0.4 / 2 | events/yr | assumed (simulated plant) |
| internal | 0.012 / 0.08 / 0.35 | events/yr | assumed (simulated plant) |
| kev | 0.24 / 0.58 / 0.86 | probability | assumed (simulated plant) |
| cvss base | 0.01 / 0.05 / 0.2 | probability | assumed (simulated plant) |
| cvss maximum | 0.08 / 0.3 / 0.6 | probability | assumed (simulated plant) |
| credential | 0.15 / 0.4 / 0.7 | probability | assumed (simulated plant) |
| unmanaged | 0.035 / 0.15 / 0.4 | probability | assumed (simulated plant) |
| compliance | 0.006 / 0.04 / 0.17 | probability | assumed (simulated plant) |
| generic | 0.02 / 0.12 / 0.34 | probability | assumed (simulated plant) |
| enforced conduit | 0.35 | TEF multiplier | assumed (simulated plant) |
| lateral hop | 0.7 | TEF multiplier | assumed (simulated plant) |
| protection | 0.75 | vulnerability multiplier | assumed (simulated plant) |
| approved mitigation | 0.55 | vulnerability multiplier | assumed (simulated plant) |

## Five worked examples (pre-audit)

> Superseded. These rows used triangular draws and the pre-audit priors. Current figures are in the Audit section below and in [src/econ/README.md](../../src/econ/README.md).

The line contribution is 36,000 × 0.78 × $0.19 = **$5,335.20 per scheduled hour**. Hand-check each triangular component with (low + most likely + high) ÷ 3. Response means are multiplied by $180/person-hour. Small differences between analytic and simulated means reflect fixed-seed sampling. The four event components plus liability reconcile to the displayed headline before rounding.

| Conditional event and asset | Downtime | Repair | Product | Response | Liability | Hand sum | Seeded mean | P10 / P50 / P90 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Illustrative office printer with default credentials | $0 | $632.50 | $0 | $2,520 | $0 | $3,152.50 | $3,142.89 | $2k / $3.1k / $4.4k |
| Filler PLC stoppage · PLC-F3 | $96,033.60 | $9,335.22 | $676.80 | $7,320 | $0 | $113,365.62 | $113,481.98 | $60k / $110k / $180k |
| Removable-media disruption · HMI-F3 | $24,008.40 | $1,957.38 | $676.80 | $7,320 | $0 | $33,962.58 | $34,187.86 | $20k / $33k / $50k |
| Ammonia evacuation · C-1 | $867,859.20 | $125,083.33 | $0 | $87,600 | $1,875,000 | $2,955,542.53 | $2,973,414.97 | $1.7M / $2.9M / $4.4M |
| Off-site contaminated product recall · BL-301 | $608,212.80 | $31,262.73 | $80,448 | $130,200 | $2,816,666.67 | $3,666,790.20 | $3,686,112.31 | $1.9M / $3.5M / $5.8M |

1. **Printer.** $1,650 installed × average damage fraction (0.05 + 0.25 + 0.85) ÷ 3 = $632.50. Average response 14 person-hours × $180 = $2,520. The example adds a hypothetical printer in the office using the generic installed-cost reference. It is absent from the seed inventory.
2. **Filler PLC.** The rules-engine visitor route reaches PLC-F3. Average 18 stopped hours × $5,335.20 × 1 = $96,033.60. Installed $42,432.80 × 22% = $9,335.22. 12,000 bottle-equivalents × 23.5% × $0.24 = $676.80.
3. **Filler HMI.** The seed USB-01 finding exposes the HMI. Average 18 hours × $5,335.20 × 0.25 = $24,008.40. Installed $8,897.20 × 22% = $1,957.38. The same in-process product assumptions yield $676.80.
4. **Ammonia.** Use the deterministic exercise without its credited safeguard. The evacuation stops the line for a mean 162.67 scheduled hours, worth $867,859.20. Damage is $237,500 × (0.10 + 0.48 + 1.0) ÷ 3 = $125,083.33. The evacuation carries no observed held product. The assumed liability mean is ($175,000 + $950,000 + $4,500,000) ÷ 3.
5. **Recall.** Treat the specified shipped contamination as an illustrative scenario. Average 114 stopped hours × $5,335.20 = $608,212.80. The product corners use 4, 18, and 65 × 12,000 bottles × 0.65, 0.90, and 1.0 respectively × $0.24, averaging $80,448. Liability is the mean of the assumed recall range.

## Mounts and verification

- Threat Watch candidate and assessed rows show one economic estimate per retained item/asset match. A displayed advisory with no surviving asset shows “No exposed asset.”
- The asset inspector and capture rules findings show one estimate per finding. The capture compliance list prices gap rows. The capture placement answer shows the conditional change and the signed expanded calculation.
- The side panel’s Plant Risk header shows the deduplicated annual exposure. The simulation result shows the original event cost and any avoided amount after a human approval affects the deterministic comparison.
- `npm run typecheck` passed. `npx vitest run src/econ --maxWorkers=1` passed 27 tests, including all 92 seed assets against 17 rule IDs. `npm run test -- --maxWorkers=2` passed 491 tests with 3 skipped.
- Browser evidence is in [shots/](shots/). The two viewport sizes are 1440×900 and 1920×1080. Live public feeds returned CISA KEV 21, CISA ICS 19, and NCSC news 2. The Watch screenshots show Siemens candidate matches against the simulated inventory.
- HMI-F3 displayed two rules-engine figures. Enter opened the calculation and expanded the first six rows to all 17. The figure stayed within 320 px.
- Two real text captures ran sequentially. Both pinned the camera in Filler 3, cleared a Corporate Office recommendation, and displayed an estimated $340k reduction in conditional loss. The second run produced both viewport screenshots.
- The tabletop test approved ventilation and showed $0 avoided at the unchanged $2.5k estimated cost. The containment projection improved from 16 s to 12 s.

## Remaining limits

1. Capex, margins, inventory costs, disruption hours, exposure priors, and liability are assumptions for the simulated plant. Calibration requires site quotes and observed incident and control data. The third-party liability tails drive the catastrophic examples.
2. Material and controller relationships inherit twin granularity. Cell ownership and documented equipment roles stand in for missing hardwired or conveyor edges. Per-equipment downtime shares attribute shared line loss with equal weights. Site-wide risk may include cross-asset common-cause losses.
3. Watch applicability is the underlying inventory match, which can be uncertain. CVSS comes from explicit fields or score text in the feed payload. Linked advisories are not fetched just for CVSS. The placement delta is the change in modeled conditional exposure for the detected scenarios, with undetected and background exposures outside its scope.
4. The UI rounds headlines to at most two significant digits. For example, $184,000 displays as $180k. Expanded rows trace the full-precision model and individually rounded values can differ from the rounded total.

No shared contract changes requested.

## Display polish

- The display rounds hours and percentages before multiplying. Compact currency uses two significant digits, with cents for sub-dollar formula factors. The displayed total counts one rounded downtime pool plus the other visible component amounts. Equipment shares are equal and individually rounded. Underlying allocations, percentiles, and ALE retain full precision.
- For PLC-F3 the one shared line reads `18 h × $5.3k/h ≈ $95k`. Its 15 stopped assets show `1/15 · $6.3k` each. The origin and damaged or held-product assets retain their itemized formulas.
- Watch shows a linked title and figure for matched advisories. The live feed and warm-cache restore both showed two NCSC items with “No exposed asset.” Passive placement omits the Purdue badge on recommendations and rules-engine alternatives.
- Final screenshots are named `econ-final-*.png`. Watch, the PLC-F3 calculation, the camera placement, and simulation were checked at 1440×900, 1920×1080, and 320 px. One fresh capture produced the camera shots after the previous run was unavailable in the open browser tabs.
- Final typecheck passed. All 29 economics tests and 25 Watch and placement tests passed, with 3 Watch tests skipped.

## Audit

Expert review of the method against FAIR (Open Group O-RA / O-RT), 2026-11-21. Judge-facing summary: [src/econ/README.md](../../src/econ/README.md).

### What was wrong and what changed (ranked by effect on the numbers)

1. **Triangular replaced by PERT (lambda = 4).** The triangular mean (a + m + b) / 3 gives the high bound the same weight as the most likely value, which is not what a three-point expert estimate means in FAIR practice. PERT mean is (a + 4m + b) / 6. Sampling is by inverse CDF of Beta(1 + 4(m-a)/(b-a), 1 + 4(b-m)/(b-a)) from a Simpson-integrated table ([pert.ts](../../src/econ/pert.ts)). Single-event means fell 10 to 25% (ammonia liability mean $1.88M to $1.40M). The frequency means fell with them (cloud contact 3.4 to 2.7 per year, general evidence prior 16% to 14%), so this change moved ALE the most.
2. **Radio contact prior.** Parking-lot radio was assumed at 0.3 / 2.5 / 12 events/yr (mean 4.9), above vendor remote access and cloud, and it was the dominant route for the packaging and filler cells. A proximity attack needs someone on site. Now 0.05 / 0.5 / 3 (mean 0.84), below every internet-borne mechanism; the dominant route for those cells is now the cloud connection at 2.7 per year.
3. **Severity score vs confirmed exploitation.** CVSS 9.8 converted at 51%, next to KEV at 56%. A severity score says nothing about a working exploit. CVSS endpoints are now 0.01 / 0.05 / 0.2 and 0.08 / 0.3 / 0.6, so a KEV entry is about twice a CVSS 9.8 advisory. Default credentials (no exploit needed) moved from 0.05 / 0.24 / 0.51 to 0.15 / 0.4 / 0.7, between the two.
4. **Findings priced on the wrong mechanism.** Every finding used the asset's strongest route, so the USB finding on HMI-F3 and the RF finding on GW-PK were shown with another route. RF-01, USB-01, TRANS-01 and PHYS-01 now use the route of the mechanism they detect when the twin has one.
5. **Double counting between TEF and Vulnerability.** A port lock or locked cabinet removed the removable-media route (TEF) and also cut Vulnerability by 25%. It now counts in TEF only. An applied mitigation was credited in the twin and again by a flat 0.55. An approved mitigation is now priced on the projected twin (`applyEffects`), an applied one is carried by the twin, and the flat factor remains only for effects the exposure graph cannot see.
6. **Independent components.** Outage hours, product loss and response hours were drawn independently, which narrows the range. In 70% of draws they now share one severity quantile (rank correlation 0.7, marginals unchanged). Repair and liability stay independent.
7. **Frequency sampling noise.** TEF and Vulnerability were sampled only to average them. LEF now uses their exact PERT means, so two scenarios with the same route show the same TEF.
8. **Disclosure.** `Shifts per day` and `Hours per shift` were listed as inputs and never used; removed. An LEF below 0.1 displayed as `<0.1/yr`, which could not be reconciled with the ALE; it now reads as a return period (`1 in 11 yr`). Primary and secondary loss are reported separately on the estimate and shown when secondary loss exists. The liability formula shows the PERT mean. The method footer is one line shared with the README.
9. **OSHA source.** The value $165,514 is correct, but the memo URL returned HTTP 403 and could not be confirmed. The source is now <https://www.osha.gov/penalties>, which showed "Willful or Repeated $165,514 per violation" on 2026-11-21.

Checked and left as built: the mulberry32 generator (full 2^32 period, 32 bits per draw, FNV-1a seed of the scenario id, no modulo step), the quantile index, ALE = LEF x mean, liability exactly zero outside ammonia release and recall, the single shared downtime pool (shares sum to 1), and the per-asset, per-consequence maximum in `plantExposure`.

### Calibration, before and after

| Scenario | Before: mean (P10 to P90), LEF, ALE | After: mean (P10 to P90), LEF, ALE |
|---|---|---|
| Office printer, default credentials | $3.2k ($2k to $4.4k), 0.40/yr, $1.3k | $2.9k ($1.9k to $3.9k), 0.51/yr, $1.5k |
| GW-PK, RF-01 finding | $3.9k ($2.6k to $5.3k), 0.79/yr, $3.1k | $3.5k ($2.3k to $4.7k), 0.12/yr, $410 |
| HMI-F3, USB-01 finding | $34k ($20k to $50k), 0.19/yr, $6.5k | $29k ($15k to $44k), 0.085/yr, $2.5k |
| PLC-F3, SAFE-01 finding | $110k ($60k to $180k), 0.19/yr, $21k | $94k ($47k to $150k), 0.091/yr, $8.6k |
| PLC-F3, KEV advisory | $110k, 0.66/yr, $75k | $95k, 0.37/yr, $35k |
| PLC-F3, CVSS 9.8 advisory | $110k, 0.61/yr, $69k | $95k, 0.20/yr, $19k |
| PAL-3, highest path | $180k ($110k to $250k), 0.56/yr, $98k | $140k ($83k to $210k), 0.27/yr, $38k |
| C-1, ammonia release | $3.0M ($1.7M to $4.4M), 0.024/yr, $70k | $2.4M ($1.4M to $3.5M), 0.016/yr, $38k |
| BL-301, product recall | $3.7M ($1.9M to $5.8M), 0.024/yr, $87k | $2.8M ($1.4M to $4.5M), 0.016/yr, $45k |
| Plant, de-duplicated | $280k/yr | $110k/yr |

Reading as a plant manager: a printer is trivial, an HMI or switch is tens of thousands, a controller stop is about $100k, the filler itself about $270k, and the two severe classes are millions. Reading as a CISO: the worst route (cloud-connected gateway one hop from the palletizer) gives a loss event about once in four years, a filler PLC stop once in 11 years, a severe event once in 63 years.

### Verification

- `npx vitest run src/econ --maxWorkers=1`: 46 tests pass in 5 files. New: [pert.test.ts](../../src/econ/pert.test.ts) (Beta shapes, sampled mean and variance against the analytic values, closed-form quantiles, generator uniformity) and [audit.test.ts](../../src/econ/audit.test.ts) (frequency semantics, evidence ordering, single credit per safeguard, projected mitigation, TEF-only conduit, component means, correlation, reconciliation, ranking, de-duplication, source labelling).
- `npm run typecheck` (`tsc --noEmit`) passes for the whole repo. An earlier run failed only in `src/app/api/health/originGuard.test.ts` (another task, mid-edit) and cleared on re-run.
- Running app at 1440 x 900: the plant header shows $110k est. / yr and PLC-F3 expands to the itemized calculation with the footer. Screenshots in `.agents/qa/econ-audit/`. Only the PLC-F3 inspector figure was opened in the browser; the watch, capture and simulation mounts were not re-checked visually after the audit.

### Still assumed

Everything except the OSHA reference. No published anchor was added for recall cost, ICS downtime cost, EPA or FDA penalties: none was confirmed against a primary source in the time available, so the ranges stay labelled as assumptions. Liability is always incurred inside the two severe classes rather than with a separate secondary-loss probability. The 0.7 severity correlation and the hop, conduit and safeguard factors are judgement.
