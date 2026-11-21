# Pyre Witness evaluation

2026-11-21T19:02:22.106Z · Run `run-4` · 71 / 71 paired captures · 71 available

Recorded attempts · Baseline 71 · System 71. System collection 7.1 min at 6 capture workers.

Baseline uses one gemini-4-hydrogen interaction at low thinking and a prose plant description (original-output-v1). The system uses gemini-decision-1 for its gate, gemini-4-hydrogen for perception, gemini-4-carbon for reasoning and any revision, the rules engine, and gemini-4-neon for briefing. The type judge uses a separate gemini-decision-1 request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.

Saved fair baseline `run-3-baseline` finished at 2026-11-21T18:34:13.363Z, using 4 workers and 4.1 min. It uses the byte-identical first-run system prompt and request schema, the original prose plant description and capture formatting. The local scorer accepts over-length strings and lists whose limits were absent from the request schema. It preserves the returned content.

The baseline uses Scout’s 45 s Hydrogen deadline, inclusive of retries and backoff, with up to 3 HTTP attempts for transient connection failures, HTTP 429 or 5xx. The shared retry waits at least 250 ms then 500 ms, honors Retry-After and adds jitter. The evaluator also shares its cross-worker 429 cooldown. Every retry sends the same request. A completed model response ends inference. The separate product-page retrieval budget is 18 s.

System results use `run-4` at launch fingerprint `4b065705238b851c4bfcc5bd782b2343947b3f0c0c547bd5309d7c5867427e17`. Baseline output, offline type judgments and verdicts are reused from `run-3-baseline` at fingerprint `d4b1ecc47007e9332038e4a6fa54d7b873c123599e5f23ff8fc7b602619bd87b`. This run made zero baseline model calls.

All comparisons use one development set that informed the iterations. No held-out set has been evaluated.

System thinking levels · perception low, reasoning low, briefing low. Offline judge recorded 105 HTTP attempts across 109 judgment receipts.

Source and dataset fingerprint `4b065705238b851c4bfcc5bd782b2343947b3f0c0c547bd5309d7c5867427e17`.

## Paired results and all attempts

Both sides answered on 66/71 captures. A deliberate usability stop is an answer. All-attempt accuracy includes missing predictions as misses. Output-dependent metrics use their eligible denominators for each side. The paired device-type score requires an available judgment for each returned type.

| Metric | Baseline paired [95% CI] | Pyre Witness paired [95% CI] | Baseline all [95% CI] | Pyre Witness all [95% CI] |
| --- | ---: | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [94.5%–100.0%] (n=66) | 100.0% [94.5%–100.0%] (n=66) | 95.8% [88.3%–98.6%] (n=71) | 98.6% [92.4%–99.8%] (n=71) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) |
| Devices classified as non-devices | 0.0% [0.0%–6.2%] (n=58) | 0.0% [0.0%–6.2%] (n=58) | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–5.8%] (n=62) |
| Device category accuracy | 87.0% [75.6%–93.6%] (n=54) | 81.5% [69.2%–89.6%] (n=54) | 87.3% [76.0%–93.7%] (n=55) | 80.0% [67.6%–88.4%] (n=55) |
| Physical-kind accuracy | 94.8% [85.9%–98.2%] (n=58) | 98.3% [90.9%–99.7%] (n=58) | 90.5% [80.7%–95.6%] (n=63) | 95.2% [86.9%–98.4%] (n=63) |
| Device type match (Decisions) | 66.7% [53.4%–77.8%] (n=54) | 61.1% [47.8%–73.0%] (n=54) | 67.3% [54.1%–78.2%] (n=55) | 60.0% [46.8%–71.9%] (n=55) |
| Radio precision | 100.0% [75.8%–100.0%] (n=12) | 100.0% [51.0%–100.0%] (n=4) | 100.0% [75.8%–100.0%] (n=12) | 100.0% [51.0%–100.0%] (n=4) |
| Radio recall | 100.0% [75.8%–100.0%] (n=12) | 33.3% [13.8%–60.9%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 33.3% [13.8%–60.9%] (n=12) |
| Radio F1 | 100.0% [86.2%–100.0%] (n=12) | 50.0% [24.3%–75.7%] (n=12) | 100.0% [86.2%–100.0%] (n=12) | 50.0% [24.3%–75.7%] (n=12) |
| Port F1 | 23.7% [13.5%–38.2%] (n=67) | 37.3% [23.5%–53.5%] (n=48) | 23.7% [13.5%–38.2%] (n=67) | 37.3% [23.5%–53.5%] (n=48) |
| Visible default credentials accuracy | 100.0% [93.4%–100.0%] (n=54) | 100.0% [93.4%–100.0%] (n=54) | 100.0% [93.5%–100.0%] (n=55) | 98.2% [90.4%–99.7%] (n=55) |
| Cloud flag accuracy | 88.5% [71.0%–96.0%] (n=26) | 23.1% [11.0%–42.1%] (n=26) | 88.5% [71.0%–96.0%] (n=26) | 23.1% [11.0%–42.1%] (n=26) |
| Physical-area accuracy | 87.7% [76.8%–93.9%] (n=57) | 89.5% [78.9%–95.1%] (n=57) | 82.3% [71.0%–89.8%] (n=62) | 82.3% [71.0%–89.8%] (n=62) |
| Purdue-level accuracy | 96.3% [87.5%–99.0%] (n=54) | 94.4% [84.9%–98.1%] (n=54) | 94.5% [85.1%–98.1%] (n=55) | 92.7% [82.7%–97.1%] (n=55) |
| Unsafe recommendations in labeled forbidden areas | 5.6% [1.9%–15.1%] (n=54) | 0.0% [0.0%–6.6%] (n=54) | 5.5% [1.9%–14.9%] (n=55) | 0.0% [0.0%–6.6%] (n=54) |
| Expected risk-tag recall | 51.7% [42.8%–60.5%] (n=118) | 58.5% [49.5%–67.0%] (n=118) | 50.0% [41.3%–58.7%] (n=124) | 58.9% [50.1%–67.1%] (n=124) |
| Valid ATT&CK citations | 86.0% [73.8%–93.0%] (n=50) | 100.0% [87.9%–100.0%] (n=28) | 86.3% [74.3%–93.2%] (n=51) | 100.0% [87.9%–100.0%] (n=28) |
| Invalid ATT&CK citations | 14.0% [7.0%–26.2%] (n=50) | 0.0% [0.0%–12.1%] (n=28) | 13.7% [6.8%–25.7%] (n=51) | 0.0% [0.0%–12.1%] (n=28) |
| Rule consistency | 84.5% [73.1%–91.6%] (n=58) | 98.4% [91.7%–99.7%] (n=64) | 85.0% [73.9%–91.9%] (n=60) | 95.5% [87.6%–98.5%] (n=67) |
| Placement coverage | 100.0% [93.8%–100.0%] (n=58) | 100.0% [93.8%–100.0%] (n=58) | 95.2% [86.9%–98.4%] (n=63) | 96.8% [89.1%–99.1%] (n=63) |
| Product capacity or size match | 0.0% [0.0%–65.8%] (n=2) | 100.0% [34.2%–100.0%] (n=2) | 0.0% [0.0%–43.4%] (n=5) | 40.0% [11.8%–76.9%] (n=5) |
| Execution failure rate | 0.0% [0.0%–5.5%] (n=66) | 0.0% [0.0%–5.5%] (n=66) | 4.2% [1.4%–11.7%] (n=71) | 2.8% [0.8%–9.7%] (n=71) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) |
| Rules-engine revision rate | N/A | 4.7% [1.6%–12.9%] (n=64) | N/A | 7.5% [3.2%–16.3%] (n=67) |

### Exact paired tests and risk recall interval

| Metric | Scope | Pairs | Both positive | Hydrogen only | Pyre Witness only | Neither | Exact McNemar (two-sided) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Physical-area accuracy | Both answered | 57 | 45 | 5 | 6 | 1 | p=1.00 |
| Physical-area accuracy | All attempts | 62 | 45 | 6 | 6 | 5 | p=1.00 |
| Physical-kind accuracy | Both answered | 58 | 54 | 1 | 3 | 0 | p=0.625 |
| Physical-kind accuracy | All attempts | 63 | 54 | 3 | 6 | 0 | p=0.508 |
| Unsafe recommendations in labeled forbidden areas | Both answered | 54 | 0 | 3 | 0 | 51 | p=0.250 |
| Unsafe recommendations in labeled forbidden areas | All attempts | 54 | 0 | 3 | 0 | 51 | p=0.250 |

A positive outcome is a correct answer for area and kind, and a labeled forbidden placement for the safety test. The safety test uses pairs with two applicable recommendations.

Key-risk recall difference (Pyre Witness minus Hydrogen), bootstrapped by capture with a 95% interval. Both answered +6.8 pp [-1.8 pp, +16.1 pp] (pairs=54). All attempts +8.9 pp [-0.02 pp, +18.2 pp] (pairs=59).

The paired area difference is inconclusive at the 5% level.

The two sides tied on Device vs non-device accuracy.

Hydrogen led on Device type match (Decisions) (66.7% vs 61.1%), Radio recall (100.0% vs 33.3%), Cloud flag accuracy (88.5% vs 23.1%).

Intervals are Wilson 95%. F1 transforms the Wilson bounds on Jaccard overlap. Tags, citations and connector counts can be correlated within a capture. An unsafe recommendation places the capture in an explicitly forbidden area from its labels. Rule consistency uses the recorded offline placement verdict, with the baseline verdict preserved from the fair run. The live revision rate counts archived revision starts among initial recommendations checked by the rules engine. The single-call baseline has no revision stage.

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 71 | 63 / 8 | 0 / 0 | 3 | 3 / 1 | 0 / 0 | 0 |
| System | 71 | 63 / 8 | 0 / 0 | 1 | 2 / 1 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13277 ms (n=71) | 24635 ms (n=71) | +11358 ms [+10520 ms, +12893 ms] (pairs=71) |
| End-to-end latency p95 | 18388 ms (n=71) | 42022 ms (n=71) | +23634 ms [+14994 ms, +31167 ms] (pairs=71) |
| Completed assessments, latency p50 / p95 | 13426 ms / 18324 ms (n=60) | 24761 ms / 41624 ms (n=67) | — |
| Recorded Gemini HTTP attempts, total / mean per capture (system counter incomplete) | 69 / 0.97 (n=71) | 268 / 3.77 (n=71) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=71) | 4 / 5 (n=71) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.586 (n=55) | 0.563 (n=54) | -0.022 [-0.068, +0.025] (pairs=54) |

A disk write failure interrupted the system and offline-judge HTTP counters. Run 4 resumed from its saved receipts. On 5 captures the independent trace records more requests than the HTTP counter. The system trace records 281 Gemini request entries over 71 saved captures (3.96 per capture). Request traces include recorded provider calls and can include calls interrupted before an HTTP attempt. The quality scores and elapsed times use the saved outcomes.

## Changes after failures

| Run | Recorded captures | Workers | p50 to outcome | Timeouts | Execution errors | Gate stage errors | Gate fallbacks | Device placements |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Run 1 | 67/71 | 6 | 129180 ms | 59 | 67 | 1 | — | 0 |
| Run 2 | 71/71 | 8 | 23549 ms | 5 | 34 | 21 | — | 32 |
| Run 3 | 71/71 | 6 | 25994 ms | 0 | 0 | 0 | 0 | 63 |
| Fair Hydrogen baseline | 71/71 | 4 | 13277 ms | 1 | 3 | — | — | 60 |
| Run 4 | 71/71 | 6 | 24635 ms | 1 | 2 | 0 | 4 | 61 |

Run 2 used compact prompts, Carbon low, an as-dropped rules check before reasoning and targeted revision. Run 3 measured gate failure isolation and retry with backoff.

The fair baseline after Run 3 answered 68/71. It kept the original Hydrogen request and accepted otherwise valid answers that exceeded local length caps. Run 4 reuses these receipts.

Run 4 evaluates Scout’s function-first equipment-kind guide and a final risk list that combines Architect risks, rules-engine findings and Scout evidence on the same development set.

## Scoring changes

Run 3 before and after scores below use the same saved system receipts at fingerprint `01d37b5672ec97b6bfff64b68540eec29ebf63c37deb68adc48779e283543229` and the same fair baseline. The fair baseline response, offline type judgment and stored verdict are preserved. Each rate has a Wilson 95% interval.

| System metric | Cohort | Run 3 original | Run 3 re-scored | Run 4 |
| --- | --- | ---: | ---: | ---: |
| Physical-kind accuracy | Both answered | 86.7% [75.8%–93.1%] (n=60) | 86.7% [75.8%–93.1%] (n=60) | 98.3% [90.9%–99.7%] (n=58) |
| Physical-kind accuracy | All attempts | 87.3% [76.9%–93.4%] (n=63) | 87.3% [76.9%–93.4%] (n=63) | 95.2% [86.9%–98.4%] (n=63) |
| Expected risk-tag recall | Both answered | 45.0% [36.4%–53.9%] (n=120) | 45.0% [36.4%–53.9%] (n=120) | 58.5% [49.5%–67.0%] (n=118) |
| Expected risk-tag recall | All attempts | 46.0% [37.4%–54.7%] (n=124) | 46.0% [37.4%–54.7%] (n=124) | 58.9% [50.1%–67.1%] (n=124) |
| Valid ATT&CK citations | Both answered | 100.0% [85.7%–100.0%] (n=23) | 100.0% [85.7%–100.0%] (n=23) | 100.0% [87.9%–100.0%] (n=28) |
| Valid ATT&CK citations | All attempts | 100.0% [85.7%–100.0%] (n=23) | 100.0% [85.7%–100.0%] (n=23) | 100.0% [87.9%–100.0%] (n=28) |
| Invalid ATT&CK citations | Both answered | 0.0% [0.0%–14.3%] (n=23) | 0.0% [0.0%–14.3%] (n=23) | 0.0% [0.0%–12.1%] (n=28) |
| Invalid ATT&CK citations | All attempts | 0.0% [0.0%–14.3%] (n=23) | 0.0% [0.0%–14.3%] (n=23) | 0.0% [0.0%–12.1%] (n=28) |

- **Physical-kind accuracy.** The scorer still reads the validated Scout enum in `perception.done.profile.physical_kind`. Run 4 changed Scout’s equipment-kind guidance.
- **Expected risk-tag recall.** The scorer reads `summary.started.assessment.risks`, the final list assigned to the browser’s results panel, using the existing `riskTags` matcher. Run 4 combines Architect risks, checked rules-engine findings and Scout evidence in this list. Older receipts fall back to the last reasoning or revision assessment.
- **Valid ATT&CK citations.** The shared citation scorer reads the displayed assessment, including citations attached to risks in the final list. Its catalog and archived fallback are unchanged.
- **Invalid ATT&CK citations.** The same delivered-citation source applies. Unknown IDs still use the existing validity check.

## Deterministic pipeline evidence

The receipts contain 46 distinct displayed rules-engine paths across 71 captures (0.65 per capture) and 142 completed checks (2.00 per capture). The median was 14 ms per check and 78 ms summed per checked capture. 11 distinct rule IDs triggered. Individual rule invocations are untracked. Paths are deduplicated per capture across the as-dropped and final recommendation checks.

## Run 1 vs run 2

67 shared paired captures. Accuracy intervals are Wilson 95%.

Carbon thinking · Run 1 medium · Run 2 low.

Run 1 used full-context reasoning before rules evaluation. Run 2 uses compact prompts, an immediate as-dropped rules check, a targeted revision, and a usability gate for any object.

| System measure | Run 1 before | Run 2 |
| --- | --- | --- |
| Latency p50 / p95 | 129.2 s / 161.7 s (n=67) · zero completed assessments | 19.1 s / 35.8 s (n=67) · completed 27.2 s / 36.3 s (n=32) |
| Timeouts | 59/67 | 4/67 |
| Physical-area accuracy | 0.0% [0.0%–6.2%] (n=58) · 0 device placements returned | 46.6% [34.3%–59.2%] (n=58) · 29 device placements returned |
| Non-device handling | 8/8 admitted by old gate · 0 placed | 3/8 classed passive · 2 stopped · 3 errors · 3 placed · 3 with safety concerns · 0 with cyber claims |

The device metric compares classification in Run 2 and admission in Run 1. It has no cross-run delta.

### Matched measures

| Measure | Run 1 baseline | Run 1 system | Run 2 baseline | Run 2 system | System change [95% CI] |
| --- | ---: | ---: | ---: | ---: | ---: |
| Physical-kind accuracy | 18.6% [10.7%–30.4%] (n=59) | 88.1% [77.5%–94.1%] (n=59) | 18.6% [10.7%–30.4%] (n=59) | 44.1% [32.2%–56.7%] (n=59) | -44.1 pp [-57.6 pp, -30.5 pp] (pairs=59) |
| Physical-area accuracy | 17.2% [9.6%–28.9%] (n=58) | 0.0% [0.0%–6.2%] (n=58) | 17.2% [9.6%–28.9%] (n=58) | 46.6% [34.3%–59.2%] (n=58) | +46.6 pp [+32.8 pp, +60.3 pp] (pairs=58) |
| Rule consistency | 100.0% [77.2%–100.0%] (n=13) | — (n=0) | 100.0% [77.2%–100.0%] (n=13) | 93.8% [79.9%–98.3%] (n=32) | — (pairs=0) |
| Expected risk-tag recall | 10.9% [6.5%–17.8%] (n=119) | 0.0% [0.0%–3.1%] (n=119) | 10.9% [6.5%–17.8%] (n=119) | 17.6% [11.8%–25.5%] (n=119) | +17.6 pp [+10.6 pp, +25.6 pp] (pairs=56) |
| Latency p50 | 13.1 s (n=67) | 129.2 s (n=67) | 13.1 s (n=67) | 19.1 s (n=67) | — |
| Latency p95 | 20.4 s (n=67) | 161.7 s (n=67) | 20.4 s (n=67) | 35.8 s (n=67) | — |
| HTTP attempts total / mean | 66 / 0.99 (n=67) | 246 / 3.67 (n=67) | 66 / 0.99 (n=67) | 243 / 3.63 (n=67) | — |

## Non-device cases

| Capture | System class | System disposition | Baseline safety concerns | System safety concerns | Published system cyber claims |
| --- | --- | --- | --- | --- | --- |
| photo-026 | passive_object | ok | none | FOOD-03 Non-production item in a process area, Foreign material and biological contamination | none |
| photo-027 | non-device | rejected | none | none | none |
| photo-028 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle foreign material and personal beverage in open-product zone | none |
| photo-029 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |
| photo-030 | non-device | rejected | none | none | none |
| photo-052 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material contamination | none |
| photo-053 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material and microbial contamination | none |
| photo-054 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |

## Hardest inputs

A pass requires a usable result matching labeled kind and placement, or correct non-device handling. Edge captures rank first, then messy, links and clean.

| Input | Pyre Witness case pass rate [95% CI] |
| --- | ---: |
| Clean | 100.0% [87.5%–100.0%] (n=27) |
| Messy | 56.3% [33.2%–76.9%] (n=16) |
| Edge | 100.0% [43.9%–100.0%] (n=3) |
| Non-devices | 100.0% [67.6%–100.0%] (n=8) |
| Links | 37.5% [13.7%–69.4%] (n=8) |
| Text | 77.8% [45.3%–93.7%] (n=9) |

### Hardest correct

- **photo-003**. Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port System response — networked\_device · Continued / Network Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.612
- **photo-025**. Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no System response — process\_equipment · Continued / Centrifugal pump · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.489
- **photo-026**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — passive\_object · Continued / Potted plant · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-03 Non-production item in a process area, Foreign material and biological contamination / rule check passed

### Hardest misses

- **photo-004**. Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view System response — networked\_device · Continued / Outdoor IP camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.733
- **photo-008**. Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media System response — networked\_device · Continued / Laptop · computer · laptop / control\_room / Purdue 3 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed / P(type match) 0.374
- **photo-017**. Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless System response — electrical\_equipment · Continued / perception · The perception stage timed out after 45 seconds. Try again.

## Photo vs one-line description

46/46 matched device photos from run-3. The text input consists of the labeled device type alone. Both variants use the same pipeline and drop point.

| Attribute | Photo [95% CI] | One line [95% CI] | Photo minus text [95% CI] |
| --- | ---: | ---: | ---: |
| Radio list matched labels | 81.5% [63.3%–91.8%] (n=27) | 88.9% [71.9%–96.1%] (n=27) | -7.4 pp [-18.5 pp, 0.0 pp] (pairs=27) |
| Port list matched labels | 37.5% [21.2%–57.3%] (n=24) | 29.2% [14.9%–49.2%] (n=24) | +8.3 pp [-8.3 pp, +25.0 pp] (pairs=24) |
| Default-credential flag matched labels | 100.0% [92.3%–100.0%] (n=46) | 100.0% [92.3%–100.0%] (n=46) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=46) |
| Material reported | 63.0% [48.6%–75.5%] (n=46) | 2.2% [0.4%–11.3%] (n=46) | +60.9 pp [+45.7 pp, +73.9 pp] (pairs=46) |
| Ingress rating reported | 2.2% [0.4%–11.3%] (n=46) | 0.0% [0.0%–7.7%] (n=46) | +2.2 pp [0.0 pp, +6.5 pp] (pairs=46) |
| Hazardous-area rating reported | 2.2% [0.4%–11.3%] (n=46) | 0.0% [0.0%–7.7%] (n=46) | +2.2 pp [0.0 pp, +6.5 pp] (pairs=46) |
| Food-grade flag reported | 0.0% [0.0%–7.7%] (n=46) | 0.0% [0.0%–7.7%] (n=46) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=46) |
| Any evidence item reported | 100.0% [92.3%–100.0%] (n=46) | 100.0% [92.3%–100.0%] (n=46) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=46) |
| Visual cue reported | 100.0% [92.3%–100.0%] (n=46) | 0.0% [0.0%–7.7%] (n=46) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=46) |
| As-dropped rules verdict returned | 100.0% [92.3%–100.0%] (n=46) | 100.0% [92.3%–100.0%] (n=46) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=46) |
| Evidence items per capture | 2.52 [2.37–2.67] (n=46) | 1.00 [1.00–1.00] (n=46) | 1.52 [1.37–1.67] (n=46) |

The as-dropped pass or hold verdict agreed on 42/46 pairs with two verdicts. Agreement 91.3% [79.7%–96.6%] (n=46).

Photo errors 0, text errors 2. The text ablation made 190 separate Gemini HTTP attempts.

Known radio lists, port lists and credential flags are checked against labels. Materials, ratings and evidence items count reported observations. The device label can already name a model or interface. Missing output contributes zero. Proportions use Wilson intervals. Differences and evidence means use paired bootstrap intervals.

All known credential labels mark no visible defaults.

## All metrics

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 95.8% [88.3%–98.6%] (n=71) | 98.6% [92.4%–99.8%] (n=71) | +2.8 pp [-2.8 pp, +8.5 pp] (pairs=71) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Devices classified as non-devices | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–5.8%] (n=62) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=59) |
| Device category accuracy | 87.3% [76.0%–93.7%] (n=55) | 80.0% [67.6%–88.4%] (n=55) | -7.3 pp [-20.0 pp, +5.5 pp] (pairs=55) |
| Physical-kind accuracy | 90.5% [80.7%–95.6%] (n=63) | 95.2% [86.9%–98.4%] (n=63) | +4.8 pp [-4.8 pp, +14.3 pp] (pairs=63) |
| Device type match (Decisions) | 67.3% [54.1%–78.2%] (n=55) | 60.0% [46.8%–71.9%] (n=55) | -7.3 pp [-20.0 pp, +5.5 pp] (pairs=55) |
| Radio precision | 100.0% [75.8%–100.0%] (n=12) | 100.0% [51.0%–100.0%] (n=4) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=7) |
| Radio recall | 100.0% [75.8%–100.0%] (n=12) | 33.3% [13.8%–60.9%] (n=12) | -66.7 pp [-93.3 pp, -25.0 pp] (pairs=7) |
| Radio F1 | 100.0% [86.2%–100.0%] (n=12) | 50.0% [24.3%–75.7%] (n=12) | -50.0 pp [-87.5 pp, -14.3 pp] (pairs=7) |
| Port F1 | 23.7% [13.5%–38.2%] (n=67) | 37.3% [23.5%–53.5%] (n=48) | +13.6 pp [-4.3 pp, +25.8 pp] (pairs=24) |
| Visible default credentials accuracy | 100.0% [93.5%–100.0%] (n=55) | 98.2% [90.4%–99.7%] (n=55) | -1.8 pp [-5.5 pp, 0.0 pp] (pairs=55) |
| Cloud flag accuracy | 88.5% [71.0%–96.0%] (n=26) | 23.1% [11.0%–42.1%] (n=26) | -65.4 pp [-84.6 pp, -46.2 pp] (pairs=26) |
| Physical-area accuracy | 82.3% [71.0%–89.8%] (n=62) | 82.3% [71.0%–89.8%] (n=62) | 0.0 pp [-11.3 pp, +11.3 pp] (pairs=62) |
| Purdue-level accuracy | 94.5% [85.1%–98.1%] (n=55) | 92.7% [82.7%–97.1%] (n=55) | -1.8 pp [-10.9 pp, +5.5 pp] (pairs=55) |
| Never-place violation rate | 5.5% [1.9%–14.9%] (n=55) | 0.0% [0.0%–6.6%] (n=54) | -5.6 pp [-13.0 pp, 0.0 pp] (pairs=54) |
| Expected risk-tag recall | 50.0% [41.3%–58.7%] (n=124) | 58.9% [50.1%–67.1%] (n=124) | +8.9 pp [-0.02 pp, +18.2 pp] (pairs=59) |
| Valid ATT&CK citations | 86.3% [74.3%–93.2%] (n=51) | 100.0% [87.9%–100.0%] (n=28) | +10.7 pp [0.0 pp, +20.7 pp] (pairs=20) |
| Invalid ATT&CK citations | 13.7% [6.8%–25.7%] (n=51) | 0.0% [0.0%–12.1%] (n=28) | -10.7 pp [-20.7 pp, 0.0 pp] (pairs=20) |
| Rule consistency | 85.0% [73.9%–91.9%] (n=60) | 95.5% [87.6%–98.5%] (n=67) | +13.8 pp [+5.2 pp, +22.4 pp] (pairs=58) |
| Placement coverage | 95.2% [86.9%–98.4%] (n=63) | 96.8% [89.1%–99.1%] (n=63) | +1.6 pp [-4.8 pp, +8.0 pp] (pairs=63) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 40.0% [11.8%–76.9%] (n=5) | +40.0 pp [0.0 pp, +80.0 pp] (pairs=5) |
| Execution failure rate | 4.2% [1.4%–11.7%] (n=71) | 2.8% [0.8%–9.7%] (n=71) | -1.4 pp [-7.0 pp, +4.2 pp] (pairs=71) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | +75.0 pp [+50.0 pp, +100.0 pp] (pairs=8) |

## Breakdown by difficulty

### clean (n=30)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [88.6%–100.0%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–11.4%] (n=30) | 0.0% [0.0%–11.4%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Device category accuracy | 83.3% [66.4%–92.7%] (n=30) | 83.3% [66.4%–92.7%] (n=30) | 0.0 pp [-16.7 pp, +16.7 pp] (pairs=30) |
| Physical-kind accuracy | 90.0% [74.4%–96.5%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | +10.0 pp [0.0 pp, +23.3 pp] (pairs=30) |
| Device type match (Decisions) | 63.3% [45.5%–78.1%] (n=30) | 56.7% [39.2%–72.6%] (n=30) | -6.7 pp [-23.3 pp, +10.0 pp] (pairs=30) |
| Radio precision | 100.0% [72.2%–100.0%] (n=10) | 100.0% [34.2%–100.0%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Radio recall | 100.0% [72.2%–100.0%] (n=10) | 20.0% [5.7%–51.0%] (n=10) | -80.0 pp [-100.0 pp, -33.3 pp] (pairs=5) |
| Radio F1 | 100.0% [83.9%–100.0%] (n=10) | 33.3% [10.7%–67.5%] (n=10) | -66.7 pp [-100.0 pp, -20.0 pp] (pairs=5) |
| Port F1 | 26.9% [14.4%–44.7%] (n=45) | 38.1% [22.1%–57.1%] (n=34) | +11.2 pp [-17.2 pp, +25.8 pp] (pairs=15) |
| Visible default credentials accuracy | 100.0% [88.6%–100.0%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Cloud flag accuracy | 86.7% [62.1%–96.3%] (n=15) | 26.7% [10.9%–52.0%] (n=15) | -60.0 pp [-86.7 pp, -33.3 pp] (pairs=15) |
| Physical-area accuracy | 86.7% [70.3%–94.7%] (n=30) | 96.7% [83.3%–99.4%] (n=30) | +10.0 pp [-3.3 pp, +23.3 pp] (pairs=30) |
| Purdue-level accuracy | 96.7% [83.3%–99.4%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | +3.3 pp [0.0 pp, +10.0 pp] (pairs=30) |
| Never-place violation rate | 3.3% [0.6%–16.7%] (n=30) | 0.0% [0.0%–11.4%] (n=30) | -3.3 pp [-10.0 pp, 0.0 pp] (pairs=30) |
| Expected risk-tag recall | 51.6% [39.4%–63.6%] (n=62) | 56.5% [44.1%–68.1%] (n=62) | +4.8 pp [-5.7 pp, +15.4 pp] (pairs=28) |
| Valid ATT&CK citations | 88.9% [71.9%–96.1%] (n=27) | 100.0% [72.2%–100.0%] (n=10) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Invalid ATT&CK citations | 11.1% [3.9%–28.1%] (n=27) | 0.0% [0.0%–27.8%] (n=10) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Rule consistency | 86.7% [70.3%–94.7%] (n=30) | 96.7% [83.3%–99.4%] (n=30) | +10.0 pp [0.0 pp, +23.3 pp] (pairs=30) |
| Placement coverage | 100.0% [88.6%–100.0%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 0.0% [0.0%–11.4%] (n=30) | 0.0% [0.0%–11.4%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 30 | 30 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| System | 30 | 30 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13349 ms (n=30) | 24880 ms (n=30) | +11532 ms [+9506 ms, +14576 ms] (pairs=30) |
| End-to-end latency p95 | 17852 ms (n=30) | 38763 ms (n=30) | +20911 ms [+11888 ms, +33050 ms] (pairs=30) |
| Completed assessments, latency p50 / p95 | 13349 ms / 17852 ms (n=30) | 24880 ms / 38763 ms (n=30) | — |
| Recorded Gemini HTTP attempts, total / mean per capture (system counter incomplete) | 30 / 1.00 (n=30) | 119 / 3.97 (n=30) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=30) | 4 / 4 (n=30) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.575 (n=30) | 0.558 (n=30) | -0.017 [-0.082, +0.055] (pairs=30) |

### messy (n=20)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [83.9%–100.0%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–16.1%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Device category accuracy | 90.0% [69.9%–97.2%] (n=20) | 70.0% [48.1%–85.5%] (n=20) | -20.0 pp [-40.0 pp, 0.0 pp] (pairs=20) |
| Physical-kind accuracy | 100.0% [83.9%–100.0%] (n=20) | 90.0% [69.9%–97.2%] (n=20) | -10.0 pp [-25.0 pp, 0.0 pp] (pairs=20) |
| Device type match (Decisions) | 70.0% [48.1%–85.5%] (n=20) | 60.0% [38.7%–78.1%] (n=20) | -10.0 pp [-30.0 pp, +10.0 pp] (pairs=20) |
| Radio precision | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio recall | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 100.0% [34.2%–100.0%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 21.1% [6.4%–51.1%] (n=17) | 40.0% [16.3%–69.5%] (n=12) | +18.9 pp [0.0 pp, +41.7 pp] (pairs=6) |
| Visible default credentials accuracy | 100.0% [83.9%–100.0%] (n=20) | 95.0% [76.4%–99.1%] (n=20) | -5.0 pp [-15.0 pp, 0.0 pp] (pairs=20) |
| Cloud flag accuracy | 100.0% [67.6%–100.0%] (n=8) | 12.5% [2.2%–47.1%] (n=8) | -87.5 pp [-100.0 pp, -62.5 pp] (pairs=8) |
| Physical-area accuracy | 80.0% [58.4%–91.9%] (n=20) | 75.0% [53.1%–88.8%] (n=20) | -5.0 pp [-25.0 pp, +15.0 pp] (pairs=20) |
| Purdue-level accuracy | 90.0% [69.9%–97.2%] (n=20) | 80.0% [58.4%–91.9%] (n=20) | -10.0 pp [-30.0 pp, +10.0 pp] (pairs=20) |
| Never-place violation rate | 10.0% [2.8%–30.1%] (n=20) | 0.0% [0.0%–16.8%] (n=19) | -10.5 pp [-26.3 pp, 0.0 pp] (pairs=19) |
| Expected risk-tag recall | 56.4% [41.0%–70.7%] (n=39) | 59.0% [43.4%–72.9%] (n=39) | +2.6 pp [-10.3 pp, +16.7 pp] (pairs=19) |
| Valid ATT&CK citations | 92.3% [66.7%–98.6%] (n=13) | 100.0% [74.1%–100.0%] (n=11) | +12.5 pp [0.0 pp, +33.3 pp] (pairs=6) |
| Invalid ATT&CK citations | 7.7% [1.4%–33.3%] (n=13) | 0.0% [0.0%–25.9%] (n=11) | -12.5 pp [-33.3 pp, 0.0 pp] (pairs=6) |
| Rule consistency | 80.0% [58.4%–91.9%] (n=20) | 100.0% [83.2%–100.0%] (n=19) | +21.1 pp [+5.3 pp, +42.1 pp] (pairs=19) |
| Placement coverage | 100.0% [83.9%–100.0%] (n=20) | 95.0% [76.4%–99.1%] (n=20) | -5.0 pp [-15.0 pp, 0.0 pp] (pairs=20) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 0.0% [0.0%–16.1%] (n=20) | 5.0% [0.9%–23.6%] (n=20) | +5.0 pp [0.0 pp, +15.0 pp] (pairs=20) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 20 | 20 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| System | 20 | 20 / 0 | 0 / 0 | 0 | 1 / 1 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13203 ms (n=20) | 24192 ms (n=20) | +10989 ms [+9790 ms, +12258 ms] (pairs=20) |
| End-to-end latency p95 | 16759 ms (n=20) | 39506 ms (n=20) | +22747 ms [+10201 ms, +34003 ms] (pairs=20) |
| Completed assessments, latency p50 / p95 | 13203 ms / 16759 ms (n=20) | 24189 ms / 29570 ms (n=19) | — |
| Recorded Gemini HTTP attempts, total / mean per capture (system counter incomplete) | 20 / 1.00 (n=20) | 76 / 3.80 (n=20) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=20) | 4 / 5 (n=20) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.609 (n=20) | 0.557 (n=19) | -0.049 [-0.118, +0.013] (pairs=19) |

### edge (n=13)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [77.2%–100.0%] (n=13) | 100.0% [77.2%–100.0%] (n=13) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=13) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Devices classified as non-devices | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Device category accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Physical-kind accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Device type match (Decisions) | 80.0% [37.6%–96.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | 0.0 pp [-60.0 pp, +60.0 pp] (pairs=5) |
| Radio precision | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio recall | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 100.0% [34.2%–100.0%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 0.0% [0.0%–60.6%] (n=5) | 0.0% [0.0%–79.3%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Visible default credentials accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Cloud flag accuracy | 66.7% [20.8%–93.9%] (n=3) | 33.3% [6.1%–79.2%] (n=3) | -33.3 pp [-100.0 pp, 0.0 pp] (pairs=3) |
| Physical-area accuracy | 100.0% [51.0%–100.0%] (n=4) | 100.0% [51.0%–100.0%] (n=4) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Purdue-level accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Never-place violation rate | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Expected risk-tag recall | 37.5% [13.7%–69.4%] (n=8) | 37.5% [13.7%–69.4%] (n=8) | 0.0 pp [-27.3 pp, +37.5 pp] (pairs=4) |
| Valid ATT&CK citations | 80.0% [37.6%–96.4%] (n=5) | 100.0% [43.9%–100.0%] (n=3) | +20.0 pp [0.0 pp, +50.0 pp] (pairs=3) |
| Invalid ATT&CK citations | 20.0% [3.6%–62.4%] (n=5) | 0.0% [0.0%–56.1%] (n=3) | -20.0 pp [-50.0 pp, 0.0 pp] (pairs=3) |
| Rule consistency | 80.0% [37.6%–96.4%] (n=5) | 100.0% [74.1%–100.0%] (n=11) | +20.0 pp [0.0 pp, +60.0 pp] (pairs=5) |
| Placement coverage | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 0.0% [0.0%–22.8%] (n=13) | 0.0% [0.0%–22.8%] (n=13) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=13) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | +75.0 pp [+50.0 pp, +100.0 pp] (pairs=8) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 13 | 5 / 8 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| System | 13 | 5 / 8 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 9225 ms (n=13) | 19350 ms (n=13) | +10125 ms [+7365 ms, +21778 ms] (pairs=13) |
| End-to-end latency p95 | 14808 ms (n=13) | 42928 ms (n=13) | +28120 ms [+14451 ms, +33060 ms] (pairs=13) |
| Completed assessments, latency p50 / p95 | 12757 ms / 15231 ms (n=5) | 24424 ms / 43681 ms (n=11) | — |
| Recorded Gemini HTTP attempts, total / mean per capture (system counter incomplete) | 13 / 1.00 (n=13) | 46 / 3.54 (n=13) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=13) | 4 / 4 (n=13) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.557 (n=5) | 0.609 (n=5) | +0.052 [-0.042, +0.174] (pairs=5) |

### Product links (n=8)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 62.5% [30.6%–86.3%] (n=8) | 87.5% [52.9%–97.8%] (n=8) | +25.0 pp [-25.0 pp, +62.5 pp] (pairs=8) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–35.4%] (n=7) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Device category accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-kind accuracy | 62.5% [30.6%–86.3%] (n=8) | 87.5% [52.9%–97.8%] (n=8) | +25.0 pp [-25.0 pp, +62.5 pp] (pairs=8) |
| Device type match (Decisions) | — (n=0) | — (n=0) | — (pairs=0) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | — (n=0) | — (n=0) | — (pairs=0) |
| Radio F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Port F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Visible default credentials accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Cloud flag accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-area accuracy | 62.5% [30.6%–86.3%] (n=8) | 37.5% [13.7%–69.4%] (n=8) | -25.0 pp [-62.5 pp, 0.0 pp] (pairs=8) |
| Purdue-level accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Never-place violation rate | — (n=0) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 33.3% [15.2%–58.3%] (n=15) | 80.0% [54.8%–93.0%] (n=15) | +46.7 pp [+7.7 pp, +86.7 pp] (pairs=8) |
| Valid ATT&CK citations | 66.7% [30.0%–90.3%] (n=6) | 100.0% [51.0%–100.0%] (n=4) | +25.0 pp [0.0 pp, +50.0 pp] (pairs=3) |
| Invalid ATT&CK citations | 33.3% [9.7%–70.0%] (n=6) | 0.0% [0.0%–49.0%] (n=4) | -25.0 pp [-50.0 pp, 0.0 pp] (pairs=3) |
| Rule consistency | 100.0% [56.6%–100.0%] (n=5) | 71.4% [35.9%–91.8%] (n=7) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Placement coverage | 62.5% [30.6%–86.3%] (n=8) | 87.5% [52.9%–97.8%] (n=8) | +25.0 pp [-25.0 pp, +62.5 pp] (pairs=8) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 40.0% [11.8%–76.9%] (n=5) | +40.0 pp [0.0 pp, +80.0 pp] (pairs=5) |
| Execution failure rate | 37.5% [13.7%–69.4%] (n=8) | 12.5% [2.2%–47.1%] (n=8) | -25.0 pp [-62.5 pp, +25.0 pp] (pairs=8) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 8 | 8 / 0 | 0 / 0 | 3 | 3 / 1 | 0 / 0 | 0 |
| System | 8 | 8 / 0 | 0 / 0 | 1 | 1 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 15066 ms (n=8) | 34155 ms (n=8) | +19089 ms [+5733 ms, +33863 ms] (pairs=8) |
| End-to-end latency p95 | 38032 ms (n=8) | 42141 ms (n=8) | +4109 ms [-3716 ms, +26291 ms] (pairs=8) |
| Completed assessments, latency p50 / p95 | 15480 ms / 22796 ms (n=5) | 38881 ms / 42181 ms (n=7) | — |
| Recorded Gemini HTTP attempts, total / mean per capture (system counter incomplete) | 6 / 0.75 (n=8) | 27 / 3.38 (n=8) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=8) | 4 / 5.6499999999999995 (n=8) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | — (n=0) | — (pairs=0) |

## Where it still fails

### photo-026 · images/photo-026.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Potted plant · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-03 Non-production item in a process area, Foreign material and biological contamination / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-002 · images/photo-002.jpg · clean

- Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
- System — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.894
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-001 · images/photo-001.jpg · messy

- Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Wireless Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, default\_creds, washdown / rule check passed / P(type match) 0.489
- System — networked\_device · Continued / Wi-Fi access point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown, physical\_port / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.454
- Baseline perception miss — Label mismatch in device type (P(match) 0.49).
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in device type (P(match) 0.45).

### photo-003 · images/photo-003.jpg · edge

- Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
- Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
- System — networked\_device · Continued / Network Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.612
- Baseline perception miss — Label mismatch in ports, cloud flag.
- Baseline risk omission — Missed camera\_view, physical\_port.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed physical\_port.

### link-bright-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / link · Could not read this product page.
- System — process\_equipment · Continued / Vertical insulated cylindrical storage tank (Bright Beer Tank) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total; 2728 x 1404 x 1404 mm / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- Baseline product link retrieval — link · Could not read this product page.
- System perception miss — Label mismatch in capacity or size.
- System wrong zone — Recommended packaging at Purdue 0, outside the labeled placements.
- System rule conflict — No clear footprint or valid network location for the recommendation.

### photo-027 · images/photo-027.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — Non-device · Stopped
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.

### photo-005 · images/photo-005.jpg · clean

- Expected — Accept device · Huawei 4G+ desktop cellular modem router · gateway · gateway / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / risks wireless
- Baseline — Device · Continued / Cellular Wi-Fi Router · network · gateway / corporate\_office / Purdue 4 / never control\_room, filler3, nh3\_hazard / radios wifi, cellular / ports ethernet / visible defaults no · cloud yes / risks wireless, default\_creds, washdown / ATT&CK T0860, T0822 / rule check passed / P(type match) 0.607
- System — networked\_device · Continued / Cellular Wi-Fi router · gateway · gateway / corporate\_office / Purdue 4 / never filler3 / radios wifi, cellular / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.594
- Baseline perception miss — Label mismatch in category.

### photo-004 · images/photo-004.jpg · messy

- Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
- Baseline — Device · Continued / IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3 / radios none / ports none / visible defaults no · cloud unknown / ATT&CK T0886 / rule check passed / P(type match) 0.708
- System — networked\_device · Continued / Outdoor IP camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.733
- Baseline risk omission — Missed camera\_view.
- System wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.

### photo-025 · images/photo-025.jpg · edge

- Expected — Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — Device · Continued / centrifugal pump · rotating\_equipment · pump / utilities / Purdue 0 / never syrup\_room, blending, filler3, washdown, nh3\_hazard / radios none / ports flanged inlet, flanged outlet / visible defaults no · cloud no / risks washdown / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.570
- System — process\_equipment · Continued / Centrifugal pump · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.489
- Baseline perception miss — Label mismatch in ports.
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.49).

### link-hygienic-pressure · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
- Baseline — Device · Continued / Hygienic absolute and gauge pressure transmitter · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports 4...20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar...+40 bar / risks washdown / ATT&CK T0856 / rule check passed
- System — electrical\_equipment · Continued / Pressure transmitter · instrument · instrument / blending / Purdue 0 / never filler3 / radios none / ports 4-20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar to 40 bar / risks transient, washdown / rule check passed
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0856.
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### photo-028 · images/photo-028.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Coffee mug · other · generic\_device / corporate\_office / never filler3, syrup\_room / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle foreign material and personal beverage in open-product zone / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-006 · images/photo-006.jpg · clean

- Expected — Accept device · Siemens SIMATIC S7-1200 modular PLC assembly · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never parking\_lot, visitor\_corridor, corporate\_office, washdown, nh3\_hazard / radios none / ports Digital Input (DI), Digital Output (DQ), Analog Output (AQ), Expansion Bus / visible defaults no · cloud no / ATT&CK T0843 / rule check passed / P(type match) 0.477
- System — networked\_device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.477
- Baseline perception miss — Label mismatch in device type (P(match) 0.48).
- Baseline risk omission — Missed washdown, physical\_port.
- System perception miss — Label mismatch in device type (P(match) 0.48).
- System risk omission — Missed physical\_port.

### photo-008 · images/photo-008.jpg · messy

- Expected — Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media
- Baseline — Device · Continued / Laptop computer · computer · laptop / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, visitor\_corridor / radios wifi, bluetooth / ports USB-C power / visible defaults no · cloud yes / risks wireless, transient, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.490
- System — networked\_device · Continued / Laptop · computer · laptop / control\_room / Purdue 3 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed / P(type match) 0.374
- Baseline perception miss — Label mismatch in device type (P(match) 0.49).
- Baseline risk omission — Missed physical\_port, removable\_media.
- System perception miss — Label mismatch in device type (P(match) 0.37).
- System wrong zone — Recommended control\_room at Purdue 3, outside the labeled placements.
- System risk omission — Missed wireless, physical\_port, removable\_media.

### photo-048 · images/photo-048.jpg · edge

- Expected — Accept device · MAXIMATOR 2500 bar mechanical pressure gauge · instrument · instrument / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks hazardous\_area
- Baseline — Device · Continued / High-pressure analog pressure gauge · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports bottom process connection / visible defaults no · cloud no / size 0-2500 bar / 0-35000+ psi / risks washdown / rule check passed / P(type match) 0.599
- System — process\_equipment · Continued / Analog pressure gauge · instrument · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 0 to 2500 bar / risks washdown / rule check passed / P(type match) 0.673
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### link-indoor-camera · www.axis.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor / risks camera\_view, physical\_port
- Baseline — Device · Continued / IP Dome Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, washdown, parking\_lot, nh3\_hazard / radios none / ports Ethernet (PoE Class 2) / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed
- System — networked\_device · Continued / Dome Camera · camera · ip\_camera / packaging / Purdue 2 / never filler3 / radios none / ports Ethernet (PoE) / visible defaults no · cloud unknown / risks removable\_media, transient, washdown, physical\_port, camera\_view / ATT&CK T0882 / rule check passed
- Baseline risk omission — Missed camera\_view, physical\_port.
- System wrong zone — Recommended packaging at Purdue 2, outside the labeled placements.

### photo-029 · images/photo-029.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Framed document · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / risks washdown / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-007 · images/photo-007.jpg · clean

- Expected — Accept device · Siemens SIMATIC OP77B keypad operator panel · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RS-485, RS-232, USB-A, MMC / visible defaults no / cloud no / risks physical\_port, removable\_media, washdown
- Baseline — Device · Continued / Operator Panel HMI · hmi · hmi / control\_room / Purdue 2 / never nh3\_hazard, washdown, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0855 / rule check passed / P(type match) 0.446
- System — electrical\_equipment · Continued / SIMATIC Panel HMI · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.422
- Baseline perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.45).
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- Baseline risk omission — Missed physical\_port, removable\_media.
- System perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.42).
- System risk omission — Missed physical\_port, removable\_media.

### photo-011 · images/photo-011.jpg · messy

- Expected — Accept device · Cisco Catalyst 4006 rack-mount Ethernet switch · network · network\_switch / areas corporate\_office, control\_room / Purdue 2, 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port
- Baseline — Device · Continued / Modular Ethernet Switch · network · network\_switch / control\_room / Purdue 3 / never washdown, nh3\_hazard, visitor\_corridor / radios none / ports 48x 10/100 BASE-T RJ45 per module / visible defaults no · cloud no / size 48 ports per line card / risks washdown, physical\_port / rule check passed / P(type match) 0.571
- System — networked\_device · Continued / Ethernet switching module · network · network\_switch / control\_room / Purdue 3 / never filler3 / radios none / ports RJ45 Ethernet (10/100BASE-T) / visible defaults no · cloud unknown / size 48-port / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.284
- System perception miss — Label mismatch in device type (P(match) 0.28).

### text-01 · Text capture · edge

- Expected — Accept device · contractor service laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / visible defaults no / risks transient, remote\_access
- Baseline — Device · Continued / OEM technician laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks wireless, removable\_media, transient / ATT&CK T0886, T0847 / rule check passed / P(type match) 0.403
- System — networked\_device · Continued / Laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed / P(type match) 0.681
- Baseline perception miss — Label mismatch in device type (P(match) 0.40).
- Baseline risk omission — Missed remote\_access.
- System risk omission — Missed remote\_access.

### link-lte-gateway · teltonika.gnshk.com · links

- Expected — Accept device · gateway / areas control\_room / size 74.5 x 25 x 64.4 mm / risks wireless, remote\_access, cloud, physical\_port
- Baseline — Device · Continued / Industrial Cellular LTE Gateway · gateway · gateway / control\_room / Purdue 3.5 / never washdown, nh3\_hazard, visitor\_corridor / radios cellular / ports 1 x Gigabit Ethernet (RJ45), 1 x Micro USB (virtual network interface), 1 x SMA (LTE antenna), 1 x 4-pin industrial DC power socket (with 1 x Digital Input, 1 x Digital Output), 1 x Mini SIM slot (2FF) / visible defaults yes · cloud yes / size 74.5 x 25 x 64.4 mm, 136 g / risks wireless, default\_creds, cloud, washdown, physical\_port / ATT&CK T0812, T0822 / rule check passed
- System — networked\_device · Continued / Industrial Cellular Gateway · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports Gigabit Ethernet, micro USB, SMA, 4-pin DC power, SIM slot / visible defaults yes · cloud yes / size 74.5 x 25 x 64.4 mm / risks wireless, default\_creds, cloud, washdown, physical\_port / ATT&CK T0883, T1694.001 / rule check passed
- Baseline perception miss — Label mismatch in capacity or size.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed remote\_access.
- System risk omission — Missed remote\_access.

### photo-030 · images/photo-030.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — Non-device · Stopped
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.

### photo-009 · images/photo-009.jpg · clean

- Expected — Accept device · Apple iPhone 15 smartphone · phone · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth, cellular, nfc / ports USB-C / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — Device · Continued / Smartphone · phone · phone / corporate\_office / Purdue 4 / never control\_room, nh3\_hazard, filler3, syrup\_room / radios wifi, bluetooth, cellular, nfc / ports none / visible defaults no · cloud yes / risks wireless, transient, hazardous\_area / ATT&CK T0886 / rule check passed / P(type match) 0.397
- System — networked\_device · Continued / Smartphone · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.397
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.40).
- Baseline risk omission — Missed cloud, physical\_port, camera\_view.
- System perception miss — Label mismatch in radios, ports, cloud flag, device type (P(match) 0.40).
- System risk omission — Missed wireless, cloud, physical\_port, camera\_view.

### photo-017 · images/photo-017.jpg · messy

- Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
- Baseline — Device · Continued / Smart electric utility meter · instrument · instrument / parking\_lot / Purdue 5 / never nh3\_hazard, filler3, washdown, control\_room / radios none / ports optical / visible defaults no · cloud unknown / size CL200 (200A) / risks transient / rule check passed / P(type match) 0.668
- System — electrical\_equipment · Continued / perception · The perception stage timed out after 45 seconds. Try again.
- Baseline wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.
- Baseline risk omission — Missed wireless.
- System timeout — perception · The perception stage timed out after 45 seconds. Try again.

### text-08 · Text capture · edge

- Expected — Accept device · Teltonika TRB140 industrial LTE gateway · gateway · gateway / areas control\_room / Purdue 3.5 / forbidden packaging, water\_treatment, syrup\_room, blending, utilities, filler3, washdown, nh3\_hazard / radios cellular / visible defaults no / risks wireless, remote\_access, physical\_port
- Baseline — Device · Continued / Industrial LTE Gateway · gateway · gateway / control\_room / Purdue 3.5 / never packaging, visitor\_corridor / radios cellular / ports none / visible defaults no · cloud yes / risks wireless, default\_creds, remote\_access / ATT&CK T0886, T0812 / rule check passed / P(type match) 0.629
- System — networked\_device · Continued / LTE cellular gateway · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860 / rule check passed / P(type match) 0.590
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed physical\_port.
- System risk omission — Missed remote\_access, physical\_port.

### link-mixing-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / baseline · The baseline stage timed out.
- System — process\_equipment · Continued / Mixing tank · vessel · agitated\_tank / packaging / Purdue 0 / never filler3, syrup\_room / radios none / ports none / visible defaults no · cloud unknown / size 2000 L (1200 x 1200 x 2100 mm, 300 kg) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- Baseline timeout — baseline · The baseline stage timed out.
- System perception miss — Label mismatch in capacity or size.
- System wrong zone — Recommended packaging at Purdue 0, outside the labeled placements.
- System rule conflict — No clear footprint or valid network location for the recommendation.

### photo-052 · images/photo-052.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Wooden armchair · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / risks washdown / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material contamination / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-010 · images/photo-010.jpg · clean

- Expected — Accept device · Apple iPad first-generation Wi-Fi tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth / ports 30-pin dock, 3.5 mm audio jack / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Device · Continued / tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never nh3\_hazard, filler3, washdown / radios wifi, bluetooth / ports 30-pin dock connector, 3.5mm audio jack / visible defaults no · cloud yes / risks wireless, cloud, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.583
- System — networked\_device · Continued / Tablet · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.370
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in category, radios, ports, device type (P(match) 0.37).
- System risk omission — Missed wireless, physical\_port.

### photo-018 · images/photo-018.jpg · messy

- Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Stainless steel jacketed vertical tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 150 Hls (15,000 L) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.349
- System — process\_equipment · Continued / Vertical storage tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 150 Hls / risks washdown / rule check passed / P(type match) 0.134
- Baseline perception miss — Label mismatch in device type (P(match) 0.35).
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.13).
- System wrong zone — Recommended utilities at Purdue 0, outside the labeled placements.

### link-outdoor-camera · www.vigi.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / size 78.5 x 188.0 x 71.5 mm / risks camera\_view, physical\_port
- Baseline — Device · Continued / Outdoor Bullet Network Camera · camera · ip\_camera / parking\_lot / Purdue 5 / never nh3\_hazard, filler3, washdown, control\_room / radios none / ports RJ45 10/100M Ethernet (PoE), 12V DC Power Port, MicroSD Card Slot / visible defaults no · cloud yes / size 78.5 x 188.0 x 71.5 mm, 0.34 kg / risks cloud, remote\_access, hazardous\_area, washdown / ATT&CK T0822 / rule check passed
- System — networked\_device · Continued / VIGI 4MP Outdoor Full-Color Bullet Network Camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports RJ45 Ethernet, DC Power, MicroSD / visible defaults no · cloud yes / size 78.5 x 188.0 x 71.5 mm / risks removable\_media, cloud, washdown, physical\_port, camera\_view / ATT&CK T0882 / rule check passed
- Baseline perception miss — Label mismatch in capacity or size.
- Baseline risk omission — Missed camera\_view, physical\_port.

### photo-053 · images/photo-053.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Cardboard box · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / risks washdown / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material and microbial contamination / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-012 · images/photo-012.jpg · clean

- Expected — Accept device · Honeywell 4600g wired handheld barcode imager · sensor · generic\_device / areas packaging, corporate\_office / Purdue 1, 2, 4 / forbidden filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks physical\_port, transient
- Baseline — Device · Continued / Handheld barcode scanner · other · generic\_device / packaging / Purdue 2 / never nh3\_hazard, filler3, washdown, visitor\_corridor / radios none / ports USB Type-A / visible defaults no · cloud no / risks washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.592
- System — electrical\_equipment · Continued / Handheld barcode scanner · other · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports USB-A / visible defaults no · cloud unknown / risks washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.592
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed transient.
- System perception miss — Label mismatch in category, cloud flag.
- System risk omission — Missed transient.

### photo-020 · images/photo-020.jpg · messy

- Expected — Accept device · Western Digital My Passport Ultra portable external hard drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB 3.0 Micro-B / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / Portable External Hard Drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3, nh3\_hazard / radios none / ports USB 3.0 / visible defaults no · cloud no / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.592
- System — electrical\_equipment · Continued / External USB hard drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3 / radios none / ports USB 3.0 / visible defaults no · cloud unknown / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.627
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed physical\_port.

### link-point-level · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown
- Baseline — Device · Continued / Vibronic point level switch · sensor · instrument / syrup\_room / Purdue 0 / never nh3\_hazard, corporate\_office, visitor\_corridor, parking\_lot / radios none / ports IO-Link, 2-wire AC/DC or 3-wire DC-PNP / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / rule check passed
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-054 · images/photo-054.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Traffic cone · other · generic\_device / parking\_lot / never filler3, syrup\_room / radios none / ports none / visible defaults no · cloud unknown / risks washdown / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-013 · images/photo-013.jpg · clean

- Expected — Accept device · Rosemount pressure transmitter with local display · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area, washdown
- Baseline — Device · Continued / Pressure transmitter · instrument · instrument / nh3\_hazard / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud no / risks hazardous\_area / ATT&CK T0831 / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.542
- System — electrical\_equipment · Continued / Pressure transmitter · instrument · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.542
- Baseline perception miss — Label mismatch in category.
- Baseline wrong zone — Recommended forbidden area nh3\_hazard.
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- Baseline risk omission — Missed washdown.
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-022 · images/photo-022.jpg · messy

- Expected — Accept device · wired industrial electrical control cabinet · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / Industrial electrical control cabinet (MCC / relay panel) · controller · plc\_cabinet / utilities / Purdue 1 / never filler3, nh3\_hazard, visitor\_corridor, corporate\_office / radios none / ports none / visible defaults no · cloud no / risks washdown / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.904
- System — electrical\_equipment · Continued / Electrical control panel · other · generic\_device / packaging / Purdue 1 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.711
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in category, physical kind.
- System risk omission — Missed physical\_port.

### link-serial-gateway · www.moxa.com · links

- Expected — Accept device · gateway / areas water\_treatment, syrup\_room, blending, packaging, utilities / size 22 x 52 x 80 mm / risks physical\_port, washdown
- Baseline — No classification · No gate answer / link · Could not read this product page.
- System — networked\_device · Continued / Modbus TCP Gateway · gateway · gateway / control\_room / Purdue 2 / never filler3 / radios none / ports Ethernet, Serial / visible defaults no · cloud unknown / size 22 x 52 x 80 mm (without ears); 22 x 75 x 80 mm (with ears); 340 g / risks transient, washdown, physical\_port / rule check passed
- Baseline product link retrieval — link · Could not read this product page.
- System perception miss — Label mismatch in capacity or size.
- System wrong zone — Recommended control\_room at Purdue 2, outside the labeled placements.

### photo-014 · images/photo-014.jpg · clean

- Expected — Accept device · cabled float level switch for an open tank · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Float switch (liquid level switch) with counterweight · sensor · instrument / water\_treatment / Purdue 0 / never nh3\_hazard, syrup\_room, corporate\_office / radios none / ports Hardwired 3-core cable / visible defaults no · cloud no / risks hazardous\_area, washdown / rule check passed / P(type match) 0.733
- System — electrical\_equipment · Continued / Float switch · sensor · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.497
- Baseline perception miss — Label mismatch in ports.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.50).
- System risk omission — Missed hazardous\_area.

### photo-023 · images/photo-023.jpg · messy

- Expected — Accept device · Siemens SIMATIC NET ESM TP80 industrial Ethernet switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, DB9 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Industrial Ethernet switch · network · network\_switch / packaging / Purdue 1 / never washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports 8x RJ45 Ethernet (Port 1-8), 1x V24 DB9, 1x Standby DB9, Power terminal block (L1/L2), Input/signaling terminal blocks (I1-I8) / visible defaults no · cloud no / risks washdown, physical\_port / rule check passed / P(type match) 0.642
- System — networked\_device · Continued / Industrial Ethernet switch · network · network\_switch / control\_room / Purdue 2 / never filler3 / radios none / ports RJ45 (8x), DB9 (V24), DB9 (Standby) / visible defaults no · cloud unknown / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.642
- Baseline perception miss — Label mismatch in ports.
- System perception miss — Label mismatch in ports, cloud flag.

### photo-015 · images/photo-015.jpg · clean

- Expected — Accept device · three-wire Pt100 RTD temperature probe · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Pt100 RTD Temperature Sensor · sensor · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports 3-wire flying leads / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.815
- System — electrical\_equipment · Continued / Pt100 RTD temperature sensor · sensor · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.761
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed hazardous\_area.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed hazardous\_area.

### photo-032 · images/photo-032.jpg · messy

- Expected — Accept device · Siemens SIMATIC S7-300 wired PLC panel · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / PLC · controller · plc\_cabinet / filler3 / Purdue 1 / never corporate\_office, parking\_lot, visitor\_corridor / radios none / ports PROFIBUS DP, MPI / visible defaults no · cloud no / risks washdown / ATT&CK T0843 / blocked (WASH-01 Washdown or food-contact design gap) / P(type match) 0.388
- System — networked\_device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.611
- Baseline perception miss — Label mismatch in device type (P(match) 0.39).
- Baseline wrong zone — Recommended forbidden area filler3.
- Baseline rule conflict — WASH-01 Washdown or food-contact design gap
- Baseline risk omission — Missed physical\_port.
- System risk omission — Missed physical\_port.

### photo-016 · images/photo-016.jpg · clean

- Expected — Accept device · Coriolis mass flow meter · instrument · instrument / areas water\_treatment, utilities, blending, syrup\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Coriolis mass flowmeter sensor · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports 2x process fluid connections, 1x internal sensor/coil electrical interface / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.558
- System — electrical\_equipment · Continued / Coriolis mass flow meter sensor · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.654
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### photo-035 · images/photo-035.jpg · messy

- Expected — Accept device · wall-mounted fixed barcode price-check scanner · sensor · generic\_device / areas corporate\_office, packaging / Purdue 2, 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — Device · Continued / Barcode price checker / article scanner terminal · other · generic\_device / packaging / Purdue 2 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0846 / rule check passed / P(type match) 0.844
- System — electrical\_equipment · Continued / Barcode price checker · other · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.735
- Baseline perception miss — Label mismatch in category.
- System perception miss — Label mismatch in category.

### photo-019 · images/photo-019.jpg · clean

- Expected — Accept device · SanDisk Cruzer Titanium USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3 / radios none / ports USB-A / visible defaults no · cloud no / size 8 GB / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.610
- System — electrical\_equipment · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 8 GB / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.610
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed physical\_port.

### photo-036 · images/photo-036.jpg · messy

- Expected — Accept device · process tank level sensor · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Industrial level transmitter · sensor · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, control\_room / radios none / ports cable\_gland / visible defaults no · cloud no / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.676
- System — electrical\_equipment · Continued / Level transmitter · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.746
- Baseline risk omission — Missed hazardous\_area.
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-021 · images/photo-021.jpg · clean

- Expected — Accept device · industrial pushbutton operator station · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown
- Baseline — Device · Continued / Industrial control panel · controller · plc\_cabinet / utilities / Purdue 1 / never filler3, washdown, nh3\_hazard, corporate\_office / radios none / ports none / visible defaults no · cloud unknown / size 760 x 760 x 210 mm / risks washdown / ATT&CK T0859 / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.461
- System — electrical\_equipment · Continued / Pushbutton Control Panel · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.886
- Baseline perception miss — Label mismatch in category, physical kind, device type (P(match) 0.46).
- Baseline wrong zone — Recommended utilities at Purdue 1, outside the labeled placements.
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified

### photo-040 · images/photo-040.jpg · messy

- Expected — Accept device · installed refrigerant flow meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area
- Baseline — Device · Continued / Industrial process transmitter · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud no / ATT&CK T0836 / rule check passed / P(type match) 0.088
- System — electrical\_equipment · Continued / Flow transmitter · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.283
- Baseline perception miss — Label mismatch in device type (P(match) 0.09).
- Baseline risk omission — Missed hazardous\_area.
- System perception miss — Label mismatch in device type (P(match) 0.28).
- System wrong zone — Recommended water\_treatment at Purdue 0, outside the labeled placements.
- System risk omission — Missed hazardous\_area.

### photo-024 · images/photo-024.jpg · clean

- Expected — Accept device · plate-and-frame heat exchanger · machine · heat\_exchanger / areas water\_treatment, blending, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Plate Heat Exchanger · other · heat\_exchanger / utilities / Purdue 0 / never corporate\_office, control\_room, visitor\_corridor / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.669
- System — process\_equipment · Continued / Plate heat exchanger · machine · heat\_exchanger / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.743
- Baseline perception miss — Label mismatch in category.
- System perception miss — Label mismatch in cloud flag.

### photo-047 · images/photo-047.jpg · messy

- Expected — Accept device · manual quarter-turn shutoff valve · valve · valve / areas water\_treatment, utilities, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Manual ball valve (1" DN25) · valve · valve / utilities / Purdue 0 / never syrup\_room, nh3\_hazard / radios none / ports 1" threaded pipe connection / visible defaults no · cloud no / size 1" / DN25 / risks hazardous\_area, washdown / rule check passed / P(type match) 0.854
- System — process\_equipment · Continued / Ball valve · valve · valve / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / size 1" / DN25 / risks washdown / rule check passed / P(type match) 0.921
- Baseline perception miss — Label mismatch in ports.
- System perception miss — Label mismatch in cloud flag.

### photo-031 · images/photo-031.jpg · clean

- Expected — Accept device · Teltonika TRM240 and TRM250 industrial cellular modems · gateway · gateway / areas control\_room, corporate\_office / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios cellular / ports microUSB, SMA, SIM / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Industrial cellular modem · gateway · gateway / control\_room / Purdue 3.5 / never filler3, nh3\_hazard, visitor\_corridor, water\_treatment / radios cellular / ports SMA antenna connector / visible defaults no · cloud yes / risks wireless, hazardous\_area, washdown / ATT&CK T0822 / rule check passed / P(type match) 0.727
- System — networked\_device · Continued / Cellular Modem · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports SMA antenna connector / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860 / rule check passed / P(type match) 0.575
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-049 · images/photo-049.jpg · messy

- Expected — Accept device · Lantronix ETS32PR serial-to-Ethernet console server · gateway · gateway / areas control\_room, corporate\_office / Purdue 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, AUI / visible defaults no / risks physical\_port, remote\_access
- Baseline — Device · Continued / 32-port serial-to-Ethernet terminal server · network · gateway / control\_room / Purdue 3 / never filler3, nh3\_hazard, parking\_lot, corporate\_office / radios none / ports 32x RJ45 serial, 1x RJ45 Ethernet, 1x DB15/DB9 port / visible defaults no · cloud no / size 1U rackmount, 32 ports / ATT&CK T0886 / rule check passed / P(type match) 0.808
- System — networked\_device · Continued / Serial console server · gateway · gateway / control\_room / Purdue 3 / never filler3 / radios none / ports RJ45, D-sub / visible defaults no · cloud unknown / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.452
- Baseline perception miss — Label mismatch in category, ports.
- Baseline risk omission — Missed physical\_port, remote\_access.
- System perception miss — Label mismatch in ports, device type (P(match) 0.45).
- System risk omission — Missed remote\_access.

### photo-033 · images/photo-033.jpg · clean

- Expected — Accept device · Siemens SIMATIC ET 200S PROFINET remote I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never corporate\_office, parking\_lot, washdown, nh3\_hazard / radios none / ports RJ45 PROFINET (X1 P3), 2x RJ45 PROFINET (BA 2xRJ45), SIMATIC Memory Card slot (X50), 24VDC power terminal / visible defaults no · cloud no / risks washdown / ATT&CK T0843 / rule check passed / P(type match) 0.173
- System — networked\_device · Continued / PLC · controller · plc\_cabinet / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports RJ45 (PROFINET LAN), SIMATIC Memory Card Slot (X50) / visible defaults no · cloud unknown / risks removable\_media, transient, washdown, physical\_port / rule check passed / P(type match) 0.200
- Baseline perception miss — Label mismatch in device type (P(match) 0.17).
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.20).

### photo-050 · images/photo-050.jpg · messy

- Expected — Accept device · Ring video doorbell surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / cloud yes / risks wireless, cloud, camera\_view
- Baseline — Device · Continued / smart video doorbell · camera · ip\_camera / parking\_lot / Purdue 5 / never control\_room, filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud yes / risks wireless, cloud, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.741
- System — networked\_device · Continued / Video doorbell · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.651
- Baseline wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.
- Baseline risk omission — Missed camera\_view.
- System perception miss — Label mismatch in cloud flag.
- System wrong zone — Recommended visitor\_corridor at Purdue 4, outside the labeled placements.
- System risk omission — Missed wireless, cloud.

### photo-034 · images/photo-034.jpg · clean

- Expected — Accept device · WAGO 750-series modular industrial I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks physical\_port, washdown
- Baseline — Device · Continued / Programmable Logic Controller (PLC) - PFC200 · controller · plc\_cabinet / packaging / Purdue 1 / never washdown, nh3\_hazard, visitor\_corridor, corporate\_office / radios none / ports 2x RJ45 Ethernet (X1, X2), 1x DB9 RS-232/485 (X3), SD card slot / visible defaults no · cloud unknown / risks default\_creds, removable\_media, washdown / ATT&CK T0858 / rule check passed / P(type match) 0.471
- System — networked\_device · Continued / DIN-rail PLC controller · controller · plc\_cabinet / water\_treatment / Purdue 1 / never filler3, nh3\_hazard / radios none / ports RJ45 Ethernet (x2, X1/X2 USB/ETH?), RS-232/485 DB9 (X3) / visible defaults no · cloud unknown / risks removable\_media, transient, washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.546
- Baseline perception miss — Label mismatch in device type (P(match) 0.47).
- Baseline risk omission — Missed physical\_port.

### text-02 · Text capture · messy

- Expected — Accept device · consumer Wi-Fi cloud surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults yes / cloud yes / risks wireless, cloud, default\_creds, camera\_view
- Baseline — Device · Continued / Wi-Fi IP camera · camera · ip\_camera / packaging / Purdue 4 / never packaging, nh3\_hazard, filler3 / radios wifi / ports none / visible defaults yes · cloud yes / risks wireless, default\_creds, cloud, remote\_access / ATT&CK T0812, T0822 / rule check passed / P(type match) 0.468
- System — networked\_device · Continued / Wi-Fi IP camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults yes · cloud yes / risks wireless, default\_creds, cloud, washdown, camera\_view / ATT&CK T0860, T1694.001, T0886 / rule check passed / P(type match) 0.468
- Baseline perception miss — Label mismatch in device type (P(match) 0.47).
- Baseline wrong zone — Recommended forbidden area packaging.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed camera\_view.
- System perception miss — Label mismatch in device type (P(match) 0.47).

### photo-037 · images/photo-037.jpg · clean

- Expected — Accept device · electrically actuated butterfly valve · valve · valve / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Electric-actuated butterfly valve · valve · valve / water\_treatment / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard, syrup\_room / radios none / ports none / visible defaults no · cloud no / risks hazardous\_area, washdown / ATT&CK T0855 / rule check passed / P(type match) 0.941
- System — process\_equipment · Continued / Electric-actuated butterfly valve · valve · valve / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.941
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- System risk omission — Missed hazardous\_area.

### text-03 · Text capture · messy

- Expected — Accept device · hygienic vibrating-fork point level switch · sensor · instrument / areas water\_treatment, syrup\_room, blending, filler3, washdown, utilities / Purdue 0 / forbidden nh3\_hazard / radios none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Vibronic high level switch · sensor · instrument / filler3 / Purdue 0 / never nh3\_hazard, corporate\_office, parking\_lot / radios none / ports 24V hard-wired I/O / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.559
- System — electrical\_equipment · Continued / Vibronic high level switch · instrument · instrument / filler3 / Purdue 0 / never nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / rule check passed / P(type match) 0.559
- System perception miss — Label mismatch in category, cloud flag.
- System risk omission — Missed washdown.

### photo-038 · images/photo-038.jpg · clean

- Expected — Accept device · SanDisk Cruzer Blade USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3, nh3\_hazard / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.692
- System — electrical\_equipment · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB Type-A / visible defaults no · cloud no / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.692
- Baseline risk omission — Missed transient, physical\_port.
- System risk omission — Missed physical\_port.

### text-06 · Text capture · messy

- Expected — Accept device · USB-A flash drive with service files · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never packaging, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media / ATT&CK T0847, T0843 / rule check passed / P(type match) 0.509
- System — electrical\_equipment · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB-A / visible defaults no · cloud unknown / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.509
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed transient, physical\_port.

### text-07 · Text capture · messy

- Expected — Accept device · Bluetooth handheld barcode scanner · sensor · generic\_device / areas packaging / Purdue 1, 2 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Device · Continued / Bluetooth barcode scanner · sensor · generic\_device / packaging / Purdue 2 / never nh3\_hazard, washdown / radios bluetooth / ports USB / visible defaults no · cloud unknown / risks wireless, transient / blocked (RF-01 Wireless within untrusted reach) / P(type match) 0.841
- System — networked\_device · Continued / Handheld barcode scanner · other · generic\_device / control\_room / Purdue 3.5 / never filler3 / radios bluetooth / ports USB / visible defaults no · cloud unknown / risks wireless, washdown, physical\_port / ATT&CK T0860 / rule check passed / P(type match) 0.690
- Baseline rule conflict — RF-01 Wireless within untrusted reach
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in category.
- System wrong zone — Recommended control\_room at Purdue 3.5, outside the labeled placements.
- System risk omission — Missed transient.

### photo-041 · images/photo-041.jpg · clean

- Expected — Accept device · cable-suspended float level switch · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Float level switch · sensor · instrument / water\_treatment / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports hardwired cable / visible defaults no · cloud no / rule check passed / P(type match) 0.480
- System — electrical\_equipment · Continued / Float level switch · sensor · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.480
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.48).
- Baseline risk omission — Missed washdown.
- System perception miss — Label mismatch in device type (P(match) 0.48).

### photo-042 · images/photo-042.jpg · clean

- Expected — Accept device · platinum resistance thermometer calibration probes · sensor · instrument / areas utilities, control\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports Info-Con / visible defaults no / cloud no / risks transient, physical\_port
- Baseline — Device · Continued / RTD temperature probe · sensor · instrument / blending / Purdue 0 / never visitor\_corridor, nh3\_hazard / radios none / ports LEMO circular connector / visible defaults no · cloud no / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.556
- System — electrical\_equipment · Continued / Temperature probe · sensor · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.120
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.12).
- System risk omission — Missed transient, physical\_port.

### photo-043 · images/photo-043.jpg · clean

- Expected — Accept device · Rotronic temperature and humidity probe · sensor · instrument / areas utilities, control\_room, corporate\_office, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — Device · Continued / environmental sensor probe · sensor · instrument / packaging / Purdue 0 / never filler3, nh3\_hazard, syrup\_room, corporate\_office / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.305
- System — electrical\_equipment · Continued / Temperature and humidity sensor probe · sensor · instrument / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.873
- Baseline perception miss — Label mismatch in device type (P(match) 0.31).

### photo-044 · images/photo-044.jpg · clean

- Expected — Accept device · Apple iPad sixth-generation tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / ports Lightning, 3.5 mm audio jack / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — Device · Continued / Tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, washdown / radios wifi, bluetooth / ports none / visible defaults no · cloud unknown / risks wireless, cloud, washdown / ATT&CK T0822 / rule check passed / P(type match) 0.529
- System — networked\_device · Continued / Tablet · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / rule check passed / P(type match) 0.373
- Baseline perception miss — Label mismatch in physical kind, ports, cloud flag.
- Baseline risk omission — Missed transient, physical\_port, camera\_view.
- System perception miss — Label mismatch in category, ports, cloud flag, device type (P(match) 0.37).
- System risk omission — Missed wireless, cloud, physical\_port.

### photo-045 · images/photo-045.jpg · clean

- Expected — Accept device · Raspberry Pi 4 Model B single-board computer · computer · generic\_device / areas corporate\_office, control\_room, crew\_office / Purdue 3, 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios wifi, bluetooth / ports RJ45, USB-A, USB-C, micro HDMI, microSD, GPIO, MIPI CSI, MIPI DSI, 3.5 mm A/V jack / visible defaults no / risks wireless, removable\_media, physical\_port
- Baseline — Device · Continued / Single-board computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment, visitor\_corridor / radios wifi, bluetooth / ports Ethernet, 2x USB 3.0, 2x USB 2.0, 2x micro-HDMI, USB-C (Power In), 3.5mm A/V, 40-pin GPIO, CSI Camera, DSI Display, PoE header / visible defaults no · cloud unknown / risks wireless, removable\_media, washdown / ATT&CK T0848, T0847 / rule check passed / P(type match) 0.220
- System — networked\_device · Continued / Single-board computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports Ethernet, USB 3.0, USB 2.0, USB-C, micro-HDMI, 3.5mm A/V, GPIO, DSI, CSI / visible defaults no · cloud unknown / risks removable\_media, washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.220
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.22).
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in radios, ports, device type (P(match) 0.22).
- System risk omission — Missed wireless.

### photo-046 · images/photo-046.jpg · clean

- Expected — Accept device · Rosemount temperature transmitter and thermowell · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Industrial Temperature Transmitter / RTD Sensor Assembly · sensor · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports 1x threaded electrical conduit entry / visible defaults no · cloud no / risks hazardous\_area, washdown / ATT&CK T0836 / rule check passed / P(type match) 0.762
- System — electrical\_equipment · Continued / Temperature transmitter and thermowell assembly · instrument · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.847
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-051 · images/photo-051.jpg · clean

- Expected — Accept device · KSB Etanorm centrifugal pump and variable-frequency drive · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0, 1 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Centrifugal pump with motor-mounted VFD · rotating\_equipment · pump / utilities / Purdue 0 / never syrup\_room, filler3, corporate\_office / radios none / ports flanged suction/discharge, cable glands / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.690
- System — process\_equipment · Continued / Centrifugal pump with motor-mounted drive · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.658
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### text-04 · Text capture · clean

- Expected — Accept device · wired Modbus serial-to-Ethernet gateway · gateway · gateway / areas packaging / Purdue 1 / forbidden filler3, washdown, nh3\_hazard / radios none / ports RS-485, RJ45 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Serial-to-Ethernet Modbus Gateway · gateway · gateway / packaging / Purdue 1 / never nh3\_hazard, washdown, parking\_lot, corporate\_office / radios none / ports RS485, RJ45 / visible defaults no · cloud no / size Small DIN box / risks default\_creds, physical\_port / ATT&CK T0855 / rule check passed / P(type match) 0.930
- System — networked\_device · Continued / DIN-rail serial-to-Ethernet gateway · gateway · gateway / packaging / Purdue 1 / never filler3 / radios none / ports RS485, RJ45 / visible defaults no · cloud no / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.431
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- Baseline risk omission — Missed washdown.
- System perception miss — Label mismatch in device type (P(match) 0.43).

### text-05 · Text capture · clean

- Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Vertical jacketed stainless steel buffer tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume, 3 bar rated / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.456
- System — process\_equipment · Continued / Vertical jacketed stainless tank · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L working volume / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.257
- Baseline perception miss — Label mismatch in device type (P(match) 0.46).
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.26).
- System wrong zone — Recommended packaging at Purdue 0, outside the labeled placements.
- System rule conflict — No clear footprint or valid network location for the recommendation.

### text-09 · Text capture · clean

- Expected — Accept device · mechanical compressed-air pressure gauge · instrument · instrument / areas utilities / Purdue 0 / forbidden washdown, filler3, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — Device · Continued / Mechanical Pressure Gauge · instrument · instrument / utilities / Purdue 0 / never nh3\_hazard, corporate\_office / radios none / ports none / visible defaults no · cloud no / size 0-10 bar / rule check passed / P(type match) 0.215
- System — process\_equipment · Continued / Analog pressure gauge · instrument · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 0-10 bar / risks washdown / rule check passed / P(type match) 0.378
- Baseline perception miss — Label mismatch in device type (P(match) 0.21).
- System perception miss — Label mismatch in device type (P(match) 0.38).

## Device type judgments

| Item | Labeled type | Baseline P(match) | System P(match) |
| --- | --- | ---: | ---: |
| photo-002 | Linksys Wireless-G broadband router | 0.894 | 0.894 |
| photo-001 | Ubiquiti UniFi AC Lite access point | 0.489 | 0.454 |
| photo-003 | AXIS 2100 network webcam | 0.582 | 0.612 |
| photo-005 | Huawei 4G+ desktop cellular modem router | 0.607 | 0.594 |
| photo-004 | outdoor Axis network surveillance camera | 0.708 | 0.733 |
| photo-025 | historic Gwynnes centrifugal waterworks pump | 0.570 | 0.489 |
| photo-006 | Siemens SIMATIC S7-1200 modular PLC assembly | 0.477 | 0.477 |
| photo-008 | Lenovo ThinkPad T480 laptop | 0.490 | 0.374 |
| photo-048 | MAXIMATOR 2500 bar mechanical pressure gauge | 0.599 | 0.673 |
| photo-007 | Siemens SIMATIC OP77B keypad operator panel | 0.446 | 0.422 |
| photo-011 | Cisco Catalyst 4006 rack-mount Ethernet switch | 0.571 | 0.284 |
| text-01 | contractor service laptop | 0.403 | 0.681 |
| photo-009 | Apple iPhone 15 smartphone | 0.397 | 0.397 |
| photo-017 | Itron OpenWay digital smart electricity meter | 0.668 | — |
| text-08 | Teltonika TRB140 industrial LTE gateway | 0.629 | 0.590 |
| photo-010 | Apple iPad first-generation Wi-Fi tablet | 0.583 | 0.370 |
| photo-018 | vertical stainless steel fermentation tank | 0.349 | 0.134 |
| photo-012 | Honeywell 4600g wired handheld barcode imager | 0.592 | 0.592 |
| photo-020 | Western Digital My Passport Ultra portable external hard drive | 0.592 | 0.627 |
| photo-013 | Rosemount pressure transmitter with local display | 0.542 | 0.542 |
| photo-022 | wired industrial electrical control cabinet | 0.904 | 0.711 |
| photo-014 | cabled float level switch for an open tank | 0.733 | 0.497 |
| photo-023 | Siemens SIMATIC NET ESM TP80 industrial Ethernet switch | 0.642 | 0.642 |
| photo-015 | three-wire Pt100 RTD temperature probe | 0.815 | 0.761 |
| photo-032 | Siemens SIMATIC S7-300 wired PLC panel | 0.388 | 0.611 |
| photo-016 | Coriolis mass flow meter | 0.558 | 0.654 |
| photo-035 | wall-mounted fixed barcode price-check scanner | 0.844 | 0.735 |
| photo-019 | SanDisk Cruzer Titanium USB flash drive | 0.610 | 0.610 |
| photo-036 | process tank level sensor | 0.676 | 0.746 |
| photo-021 | industrial pushbutton operator station | 0.461 | 0.886 |
| photo-040 | installed refrigerant flow meter | 0.088 | 0.283 |
| photo-024 | plate-and-frame heat exchanger | 0.669 | 0.743 |
| photo-047 | manual quarter-turn shutoff valve | 0.854 | 0.921 |
| photo-031 | Teltonika TRM240 and TRM250 industrial cellular modems | 0.727 | 0.575 |
| photo-049 | Lantronix ETS32PR serial-to-Ethernet console server | 0.808 | 0.452 |
| photo-033 | Siemens SIMATIC ET 200S PROFINET remote I/O station | 0.173 | 0.200 |
| photo-050 | Ring video doorbell surveillance camera | 0.741 | 0.651 |
| photo-034 | WAGO 750-series modular industrial I/O station | 0.471 | 0.546 |
| text-02 | consumer Wi-Fi cloud surveillance camera | 0.468 | 0.468 |
| photo-037 | electrically actuated butterfly valve | 0.941 | 0.941 |
| text-03 | hygienic vibrating-fork point level switch | 0.559 | 0.559 |
| photo-038 | SanDisk Cruzer Blade USB flash drive | 0.692 | 0.692 |
| text-06 | USB-A flash drive with service files | 0.509 | 0.509 |
| photo-039 | industrial Ethernet and fibre switch | 0.718 | 0.718 |
| text-07 | Bluetooth handheld barcode scanner | 0.841 | 0.690 |
| photo-041 | cable-suspended float level switch | 0.480 | 0.480 |
| photo-042 | platinum resistance thermometer calibration probes | 0.556 | 0.120 |
| photo-043 | Rotronic temperature and humidity probe | 0.305 | 0.873 |
| photo-044 | Apple iPad sixth-generation tablet | 0.529 | 0.373 |
| photo-045 | Raspberry Pi 4 Model B single-board computer | 0.220 | 0.220 |
| photo-046 | Rosemount temperature transmitter and thermowell | 0.762 | 0.847 |
| photo-051 | KSB Etanorm centrifugal pump and variable-frequency drive | 0.690 | 0.658 |
| text-04 | wired Modbus serial-to-Ethernet gateway | 0.930 | 0.431 |
| text-05 | vertical stainless steel carbonated beverage buffer tank | 0.456 | 0.257 |
| text-09 | mechanical compressed-air pressure gauge | 0.215 | 0.378 |

## Scoring notes

- Device accuracy uses the returned perception class, then a recognized gate class, then P(device) ≥ 0.5 when the gate supplies a binary answer. Passive maps to non-device. A usability stop and a device classification are separate. Missing classifications count as misses in accuracy. Class-specific error rates use answered labels.
- Non-device cyber claims count any published structured radio, path, technique, cyber-risk, cloud or default-credential assertion on a labeled negative. A stopped capture supplies no claim. Stripped claims recorded by the Inspector are tracked separately. Free-text briefings and unpublished provider fields are outside this score.
- Food-contact coverage uses the default Filler 3 drop on this twin. A physical rule, food-safety finding or explicitly local physical risk counts. All labeled negatives at this drop enter the denominator, including unusable captures. The original baseline declined assessments of non-devices, and its input described the plant without an explicit drop instruction.
- Labeled category, kind, area, Purdue level, flags, sizing and risk recall include missing predictions as misses. Placement coverage counts labeled devices with a recommendation. Never-place violation uses recommendations with at least one labeled forbidden area.
- Rule consistency uses the saved offline verdict for each recommendation against the seed. An unresolved footprint or network reference counts as a rule-check failure. Blocking means severity 4 or 5.
- Radio and port scores are micro-averaged over known lists. Ports use case, punctuation and common connector aliases. Size match uses normalized text and units without unit conversion. Risk tags are extracted from risk titles and descriptions with the same term patterns for both sides. A tag match does not verify the risk description.
- ATT&CK validity checks distinct cited IDs per item against ICS 20.1. It measures delivered citations. System IDs flagged and removed during grounding are recorded independently, including any that prompted revision.
- Wilson 95% intervals use the displayed denominators. For F1, the Wilson interval for Jaccard overlap is transformed to F1, so n is the total matched or unmatched labels. Label-level intervals are descriptive when several labels come from one capture.
- Differences are system minus baseline on eligible paired items. The 95% percentile bootstrap recomputes each statistic on 2,000 resamples of matched items. Small groups yield unstable or degenerate intervals. Latency includes gate rejections and failed executions with a measured time, excludes the offline judge and rule scoring, and uses linear interpolation.
- Both sides receive the same text or image bytes and the same product URL. Each side uses the project link fetcher for its own retrieval, so live pages can vary. Pipeline latency includes briefing when reached.
- Gemini HTTP attempts include retries and interaction retrievals. The paired capture cost excludes the offline type judge, product-page requests and unfinished pairs. A failed or rejected capture can use fewer calls than a completed placement.
- See `eval/dataset/SOURCES.md` for collection and provenance and `FAILURES.md` for case diagnoses.
