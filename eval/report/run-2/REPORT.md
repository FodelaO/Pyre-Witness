# Pyre Witness evaluation

2026-11-21T17:48:19.360Z · Run `run-2` · 71 / 71 paired captures · 71 available

Completed attempts · Baseline 71 · System 71. Elapsed since launch 3.7 min at 8 capture workers. 71 reused artifacts.

Baseline uses one gemini-4-hydrogen interaction at low thinking and a prose plant description (original-output-v1). The system uses gemini-decision-1 for its gate, gemini-4-hydrogen for perception, gemini-4-carbon for reasoning and any revision, the rules engine, and gemini-4-neon for briefing. The type judge uses a separate gemini-decision-1 request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.

All baseline receipts come from run-1, including its validation and provider failures. Capture fingerprints and the plant seed match. Baseline latency and call counts describe those original attempts. This run reused the baseline without new calls.

System thinking levels · perception low, reasoning low, briefing low. Offline judge made 36 HTTP attempts across 36 measured captures.

Source and dataset fingerprint `a23f38c80085a75a4fe59812fda3f5e539bf95be6fce58f0a6fd62979ce3fe1a`.

## Headline results

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 32.4% [22.7%–43.9%] (n=71) | 62.0% [50.3%–72.4%] (n=71) | +29.6 pp [+14.1 pp, +45.1 pp] (pairs=71) |
| Physical-kind accuracy | 20.6% [12.5%–32.2%] (n=63) | 47.6% [35.8%–59.7%] (n=63) | +27.0 pp [+12.7 pp, +39.7 pp] (pairs=63) |
| Physical-area accuracy | 19.4% [11.4%–30.9%] (n=62) | 46.8% [34.9%–59.0%] (n=62) | +27.4 pp [+11.3 pp, +41.9 pp] (pairs=62) |
| Rule consistency | 100.0% [79.6%–100.0%] (n=15) | 94.3% [81.4%–98.4%] (n=35) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=9) |
| Expected risk-tag recall | 11.3% [6.8%–18.1%] (n=124) | 19.4% [13.4%–27.2%] (n=124) | +8.1 pp [0.0 pp, +16.1 pp] (pairs=59) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 37.5% [13.7%–69.4%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 71 | 63 / 8 | 0 / 0 | 48 | 48 / 0 | 4 / 0 | 0 |
| System | 71 | 63 / 8 | 0 / 0 | 27 | 34 / 5 | 3 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 12989 ms (n=71) | 23549 ms (n=71) | +10560 ms [-4915 ms, +12623 ms] (pairs=71) |
| End-to-end latency p95 | 20386 ms (n=71) | 36992 ms (n=71) | +16606 ms [+10318 ms, +42830 ms] (pairs=71) |
| Completed assessments, latency p50 / p95 | 12874 ms / 22040 ms (n=15) | 27308 ms / 36786 ms (n=35) | — |
| Gemini HTTP attempts, total / mean per capture | 70 / 0.99 (n=71) | 260 / 3.66 (n=71) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=71) | 4 / 5 (n=71) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.722 (n=11) | 0.565 (n=28) | -0.101 [-0.259, +0.030] (pairs=10) |

## Accuracy over all attempts and completed responses

Completed responses include a deliberate usability stop. Each metric retains its labeled denominator.

| Metric | Baseline all | Baseline completed | Pyre Witness all | Pyre Witness completed |
| --- | ---: | ---: | ---: | ---: |
| Device vs non-device accuracy | 32.4% [22.7%–43.9%] (n=71) | 100.0% [85.7%–100.0%] (n=23) | 62.0% [50.3%–72.4%] (n=71) | 100.0% [90.6%–100.0%] (n=37) |
| Physical-kind accuracy | 20.6% [12.5%–32.2%] (n=63) | 86.7% [62.1%–96.3%] (n=15) | 47.6% [35.8%–59.7%] (n=63) | 90.6% [75.8%–96.8%] (n=32) |
| Physical-area accuracy | 19.4% [11.4%–30.9%] (n=62) | 80.0% [54.8%–93.0%] (n=15) | 46.8% [34.9%–59.0%] (n=62) | 93.5% [79.3%–98.2%] (n=31) |
| Purdue-level accuracy | 27.3% [17.3%–40.2%] (n=55) | 100.0% [79.6%–100.0%] (n=15) | 52.7% [39.8%–65.3%] (n=55) | 96.7% [83.3%–99.4%] (n=30) |

## Changes after failures

| Run | Paired captures | Workers | System p50 to outcome | Timeouts | Execution errors | Gate stage errors | Gate fallbacks | Device placements |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Run 1 | 67/71 | 6 | 129180 ms | 59 | 67 | 1 | — | 0 |
| Run 2 | 71/71 | 8 | 23549 ms | 5 | 34 | 21 | — | 32 |
| Run 3 | Pending | — | — | — | — | — | — | — |

Run 2 used compact prompts, Carbon low, an as-dropped rules check before reasoning and targeted revision. Run 3 evaluates gate failure isolation and retry with backoff.

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
| photo-026 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |
| photo-027 | non-device | rejected | none | none | none |
| photo-028 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle Ceramic Foreign Material | none |
| photo-029 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |
| photo-030 | non-device | rejected | none | none | none |
| photo-052 | — | error | none | none | none |
| photo-053 | — | error | none | none | none |
| photo-054 | — | error | none | none | none |

## Hardest inputs

A pass requires a usable result matching labeled kind and placement, or correct non-device handling. Edge captures rank first, then messy, links and clean.

| Input | Pyre Witness case pass rate [95% CI] |
| --- | ---: |
| Clean | 44.4% [27.6%–62.7%] (n=27) |
| Messy | 25.0% [10.2%–49.5%] (n=16) |
| Edge | 100.0% [43.9%–100.0%] (n=3) |
| Non-devices | 62.5% [30.6%–86.3%] (n=8) |
| Links | 25.0% [7.1%–59.1%] (n=8) |
| Text | 66.7% [35.4%–87.9%] (n=9) |

### Hardest correct

- **photo-003**. Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port System response — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612
- **photo-025**. Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no System response — process\_equipment · Continued / pump · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.141
- **photo-026**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — passive\_object · Continued / flower pot · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-03 Non-production item in a process area / rule check passed

### Hardest misses

- **photo-052**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- **photo-053**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- **photo-054**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.

## Photo vs one-line description

Pending. 46 labeled device photos qualify.

## All metrics

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 32.4% [22.7%–43.9%] (n=71) | 62.0% [50.3%–72.4%] (n=71) | +29.6 pp [+14.1 pp, +45.1 pp] (pairs=71) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Devices classified as non-devices | 0.0% [0.0%–20.4%] (n=15) | 0.0% [0.0%–9.0%] (n=39) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=10) |
| Device category accuracy | 23.6% [14.4%–36.3%] (n=55) | 52.7% [39.8%–65.3%] (n=55) | +29.1 pp [+14.5 pp, +43.6 pp] (pairs=55) |
| Physical-kind accuracy | 20.6% [12.5%–32.2%] (n=63) | 47.6% [35.8%–59.7%] (n=63) | +27.0 pp [+12.7 pp, +39.7 pp] (pairs=63) |
| Device type match (Decisions) | 17.6% [9.6%–30.3%] (n=51) | 32.7% [21.5%–46.2%] (n=52) | +16.7 pp [+2.1 pp, +31.3 pp] (pairs=48) |
| Radio precision | 100.0% [43.9%–100.0%] (n=3) | 100.0% [34.2%–100.0%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Radio recall | 25.0% [8.9%–53.2%] (n=12) | 16.7% [4.7%–44.8%] (n=12) | -8.3 pp [-46.7 pp, +27.3 pp] (pairs=7) |
| Radio F1 | 40.0% [16.3%–69.5%] (n=12) | 28.6% [9.0%–61.9%] (n=12) | -11.4 pp [-57.1 pp, +36.7 pp] (pairs=7) |
| Port F1 | 21.7% [10.1%–40.7%] (n=41) | 30.2% [17.0%–47.7%] (n=45) | +8.4 pp [-7.5 pp, +20.4 pp] (pairs=19) |
| Visible default credentials accuracy | 27.3% [17.3%–40.2%] (n=55) | 56.4% [43.3%–68.6%] (n=55) | +29.1 pp [+12.7 pp, +45.5 pp] (pairs=55) |
| Cloud flag accuracy | 38.5% [22.4%–57.5%] (n=26) | 23.1% [11.0%–42.1%] (n=26) | -15.4 pp [-34.6 pp, +3.8 pp] (pairs=26) |
| Physical-area accuracy | 19.4% [11.4%–30.9%] (n=62) | 46.8% [34.9%–59.0%] (n=62) | +27.4 pp [+11.3 pp, +41.9 pp] (pairs=62) |
| Purdue-level accuracy | 27.3% [17.3%–40.2%] (n=55) | 52.7% [39.8%–65.3%] (n=55) | +25.5 pp [+9.1 pp, +41.8 pp] (pairs=55) |
| Never-place violation rate | 6.7% [1.2%–29.8%] (n=15) | 0.0% [0.0%–11.4%] (n=30) | -11.1 pp [-33.3 pp, 0.0 pp] (pairs=9) |
| Expected risk-tag recall | 11.3% [6.8%–18.1%] (n=124) | 19.4% [13.4%–27.2%] (n=124) | +8.1 pp [0.0 pp, +16.1 pp] (pairs=59) |
| Valid ATT&CK citations | 66.7% [39.1%–86.2%] (n=12) | 100.0% [83.2%–100.0%] (n=19) | +20.0 pp [0.0 pp, +75.0 pp] (pairs=4) |
| Invalid ATT&CK citations | 33.3% [13.8%–60.9%] (n=12) | 0.0% [0.0%–16.8%] (n=19) | -20.0 pp [-75.0 pp, 0.0 pp] (pairs=4) |
| Rule consistency | 100.0% [79.6%–100.0%] (n=15) | 94.3% [81.4%–98.4%] (n=35) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=9) |
| Placement coverage | 23.8% [15.0%–35.6%] (n=63) | 50.8% [38.8%–62.7%] (n=63) | +27.0 pp [+11.1 pp, +41.3 pp] (pairs=63) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Execution failure rate | 67.6% [56.1%–77.3%] (n=71) | 47.9% [36.7%–59.3%] (n=71) | -19.7 pp [-35.2 pp, -5.6 pp] (pairs=71) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 37.5% [13.7%–69.4%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |

## Breakdown by difficulty

### clean (n=30)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 36.7% [21.9%–54.5%] (n=30) | 63.3% [45.5%–78.1%] (n=30) | +26.7 pp [+3.3 pp, +50.0 pp] (pairs=30) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–25.9%] (n=11) | 0.0% [0.0%–16.8%] (n=19) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=7) |
| Device category accuracy | 33.3% [19.2%–51.2%] (n=30) | 56.7% [39.2%–72.6%] (n=30) | +23.3 pp [0.0 pp, +43.3 pp] (pairs=30) |
| Physical-kind accuracy | 30.0% [16.7%–47.9%] (n=30) | 50.0% [33.2%–66.8%] (n=30) | +20.0 pp [-3.3 pp, +40.0 pp] (pairs=30) |
| Device type match (Decisions) | 22.2% [10.6%–40.8%] (n=27) | 34.5% [19.9%–52.7%] (n=29) | +15.4 pp [-3.8 pp, +34.6 pp] (pairs=26) |
| Radio precision | 100.0% [43.9%–100.0%] (n=3) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=2) |
| Radio recall | 30.0% [10.8%–60.3%] (n=10) | 10.0% [1.8%–40.4%] (n=10) | -20.0 pp [-66.7 pp, 0.0 pp] (pairs=5) |
| Radio F1 | 46.2% [19.5%–75.3%] (n=10) | 18.2% [3.5%–57.6%] (n=10) | -28.0 pp [-71.1 pp, 0.0 pp] (pairs=5) |
| Port F1 | 22.2% [9.5%–43.8%] (n=32) | 28.6% [14.6%–48.4%] (n=36) | +6.3 pp [-14.8 pp, +20.6 pp] (pairs=13) |
| Visible default credentials accuracy | 36.7% [21.9%–54.5%] (n=30) | 60.0% [42.3%–75.4%] (n=30) | +23.3 pp [0.0 pp, +46.7 pp] (pairs=30) |
| Cloud flag accuracy | 53.3% [30.1%–75.2%] (n=15) | 26.7% [10.9%–52.0%] (n=15) | -26.7 pp [-53.3 pp, 0.0 pp] (pairs=15) |
| Physical-area accuracy | 30.0% [16.7%–47.9%] (n=30) | 53.3% [36.1%–69.8%] (n=30) | +23.3 pp [0.0 pp, +46.7 pp] (pairs=30) |
| Purdue-level accuracy | 36.7% [21.9%–54.5%] (n=30) | 56.7% [39.2%–72.6%] (n=30) | +20.0 pp [-3.3 pp, +43.3 pp] (pairs=30) |
| Never-place violation rate | 0.0% [0.0%–25.9%] (n=11) | 0.0% [0.0%–18.4%] (n=17) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=6) |
| Expected risk-tag recall | 14.5% [7.8%–25.3%] (n=62) | 24.2% [15.2%–36.2%] (n=62) | +9.7 pp [-4.1 pp, +23.2 pp] (pairs=28) |
| Valid ATT&CK citations | 62.5% [30.6%–86.3%] (n=8) | 100.0% [64.6%–100.0%] (n=7) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=2) |
| Invalid ATT&CK citations | 37.5% [13.7%–69.4%] (n=8) | 0.0% [0.0%–35.4%] (n=7) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=2) |
| Rule consistency | 100.0% [74.1%–100.0%] (n=11) | 100.0% [81.6%–100.0%] (n=17) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=6) |
| Placement coverage | 36.7% [21.9%–54.5%] (n=30) | 56.7% [39.2%–72.6%] (n=30) | +20.0 pp [-3.3 pp, +43.3 pp] (pairs=30) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 63.3% [45.5%–78.1%] (n=30) | 43.3% [27.4%–60.8%] (n=30) | -20.0 pp [-43.3 pp, +3.3 pp] (pairs=30) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 30 | 30 / 0 | 0 / 0 | 19 | 19 / 0 | 3 / 0 | 0 |
| System | 30 | 30 / 0 | 0 / 0 | 11 | 13 / 2 | 1 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13580 ms (n=30) | 25205 ms (n=30) | +11625 ms [-9158 ms, +15188 ms] (pairs=30) |
| End-to-end latency p95 | 15949 ms (n=30) | 37692 ms (n=30) | +21743 ms [+7793 ms, +48942 ms] (pairs=30) |
| Completed assessments, latency p50 / p95 | 12874 ms / 21382 ms (n=11) | 27366 ms / 33466 ms (n=17) | — |
| Gemini HTTP attempts, total / mean per capture | 30 / 1.00 (n=30) | 123 / 4.10 (n=30) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=30) | 4 / 5 (n=30) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.729 (n=8) | 0.596 (n=17) | -0.059 [-0.283, +0.091] (pairs=7) |

### messy (n=20)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 20.0% [8.1%–41.6%] (n=20) | 65.0% [43.3%–81.9%] (n=20) | +45.0 pp [+20.0 pp, +70.0 pp] (pairs=20) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–49.0%] (n=4) | 0.0% [0.0%–22.8%] (n=13) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Device category accuracy | 15.0% [5.2%–36.0%] (n=20) | 40.0% [21.9%–61.3%] (n=20) | +25.0 pp [+10.0 pp, +45.0 pp] (pairs=20) |
| Physical-kind accuracy | 20.0% [8.1%–41.6%] (n=20) | 45.0% [25.8%–65.8%] (n=20) | +25.0 pp [0.0 pp, +50.0 pp] (pairs=20) |
| Device type match (Decisions) | 15.8% [5.5%–37.6%] (n=19) | 26.3% [11.8%–48.8%] (n=19) | +11.1 pp [-11.1 pp, +33.3 pp] (pairs=18) |
| Radio precision | — (n=0) | 100.0% [20.7%–100.0%] (n=1) | — (pairs=1) |
| Radio recall | 0.0% [0.0%–79.3%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=1) |
| Radio F1 | 0.0% [0.0%–88.5%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=1) |
| Port F1 | 25.0% [5.0%–67.8%] (n=7) | 44.4% [15.2%–78.1%] (n=7) | +19.4 pp [0.0 pp, +66.7 pp] (pairs=5) |
| Visible default credentials accuracy | 20.0% [8.1%–41.6%] (n=20) | 45.0% [25.8%–65.8%] (n=20) | +25.0 pp [0.0 pp, +50.0 pp] (pairs=20) |
| Cloud flag accuracy | 25.0% [7.1%–59.1%] (n=8) | 12.5% [2.2%–47.1%] (n=8) | -12.5 pp [-37.5 pp, 0.0 pp] (pairs=8) |
| Physical-area accuracy | 15.0% [5.2%–36.0%] (n=20) | 40.0% [21.9%–61.3%] (n=20) | +25.0 pp [0.0 pp, +55.0 pp] (pairs=20) |
| Purdue-level accuracy | 20.0% [8.1%–41.6%] (n=20) | 40.0% [21.9%–61.3%] (n=20) | +20.0 pp [-5.0 pp, +45.0 pp] (pairs=20) |
| Never-place violation rate | 25.0% [4.6%–69.9%] (n=4) | 0.0% [0.0%–29.9%] (n=9) | -33.3 pp [-100.0 pp, 0.0 pp] (pairs=3) |
| Expected risk-tag recall | 12.8% [5.6%–26.7%] (n=39) | 17.9% [9.0%–32.7%] (n=39) | +5.1 pp [-5.3 pp, +14.0 pp] (pairs=19) |
| Valid ATT&CK citations | 75.0% [30.1%–95.4%] (n=4) | 100.0% [70.1%–100.0%] (n=9) | +33.3 pp [0.0 pp, +100.0 pp] (pairs=2) |
| Invalid ATT&CK citations | 25.0% [4.6%–69.9%] (n=4) | 0.0% [0.0%–29.9%] (n=9) | -33.3 pp [-100.0 pp, 0.0 pp] (pairs=2) |
| Rule consistency | 100.0% [51.0%–100.0%] (n=4) | 88.9% [56.5%–98.0%] (n=9) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Placement coverage | 20.0% [8.1%–41.6%] (n=20) | 45.0% [25.8%–65.8%] (n=20) | +25.0 pp [0.0 pp, +50.0 pp] (pairs=20) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 80.0% [58.4%–91.9%] (n=20) | 55.0% [34.2%–74.2%] (n=20) | -25.0 pp [-50.0 pp, 0.0 pp] (pairs=20) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 20 | 20 / 0 | 0 / 0 | 16 | 16 / 0 | 1 / 0 | 0 |
| System | 20 | 20 / 0 | 0 / 0 | 7 | 11 / 0 | 1 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13193 ms (n=20) | 10871 ms (n=20) | -2322 ms [-9059 ms, +13430 ms] (pairs=20) |
| End-to-end latency p95 | 20687 ms (n=20) | 38768 ms (n=20) | +18081 ms [+5160 ms, +46395 ms] (pairs=20) |
| Completed assessments, latency p50 / p95 | 13519 ms / 19189 ms (n=4) | 28487 ms / 52649 ms (n=9) | — |
| Gemini HTTP attempts, total / mean per capture | 20 / 1.00 (n=20) | 84 / 4.20 (n=20) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=20) | 4 / 5.050000000000001 (n=20) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.705 (n=3) | 0.534 (n=8) | -0.197 [-0.368, +0.028] (pairs=3) |

### edge (n=13)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 61.5% [35.5%–82.3%] (n=13) | 76.9% [49.7%–91.8%] (n=13) | +15.4 pp [-23.1 pp, +53.8 pp] (pairs=13) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Devices classified as non-devices | — (n=0) | 0.0% [0.0%–43.4%] (n=5) | — (pairs=0) |
| Device category accuracy | 0.0% [0.0%–43.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | +80.0 pp [+40.0 pp, +100.0 pp] (pairs=5) |
| Physical-kind accuracy | 0.0% [0.0%–43.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | +80.0 pp [+40.0 pp, +100.0 pp] (pairs=5) |
| Device type match (Decisions) | 0.0% [0.0%–43.4%] (n=5) | 50.0% [15.0%–85.0%] (n=4) | +50.0 pp [0.0 pp, +100.0 pp] (pairs=4) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | 0.0% [0.0%–79.3%] (n=1) | 0.0% [0.0%–79.3%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 0.0% [0.0%–88.5%] (n=1) | 0.0% [0.0%–88.5%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 0.0% [0.0%–79.3%] (n=2) | 0.0% [0.0%–79.3%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Visible default credentials accuracy | 0.0% [0.0%–43.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | +80.0 pp [+40.0 pp, +100.0 pp] (pairs=5) |
| Cloud flag accuracy | 0.0% [0.0%–56.1%] (n=3) | 33.3% [6.1%–79.2%] (n=3) | +33.3 pp [0.0 pp, +100.0 pp] (pairs=3) |
| Physical-area accuracy | 0.0% [0.0%–49.0%] (n=4) | 75.0% [30.1%–95.4%] (n=4) | +75.0 pp [+25.0 pp, +100.0 pp] (pairs=4) |
| Purdue-level accuracy | 0.0% [0.0%–43.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | +80.0 pp [+40.0 pp, +100.0 pp] (pairs=5) |
| Never-place violation rate | — (n=0) | 0.0% [0.0%–49.0%] (n=4) | — (pairs=0) |
| Expected risk-tag recall | 0.0% [0.0%–32.4%] (n=8) | 12.5% [2.2%–47.1%] (n=8) | +12.5 pp [0.0 pp, +37.5 pp] (pairs=4) |
| Valid ATT&CK citations | — (n=0) | 100.0% [34.2%–100.0%] (n=2) | — (pairs=0) |
| Invalid ATT&CK citations | — (n=0) | 0.0% [0.0%–65.8%] (n=2) | — (pairs=0) |
| Rule consistency | — (n=0) | 100.0% [64.6%–100.0%] (n=7) | — (pairs=0) |
| Placement coverage | 0.0% [0.0%–43.4%] (n=5) | 80.0% [37.6%–96.4%] (n=5) | +80.0 pp [+40.0 pp, +100.0 pp] (pairs=5) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 38.5% [17.7%–64.5%] (n=13) | 30.8% [12.7%–57.6%] (n=13) | -7.7 pp [-46.2 pp, +30.8 pp] (pairs=13) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 37.5% [13.7%–69.4%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 13 | 5 / 8 | 0 / 0 | 5 | 5 / 0 | 0 / 0 | 0 |
| System | 13 | 5 / 8 | 0 / 0 | 3 | 4 / 3 | 1 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 6632 ms (n=13) | 24179 ms (n=13) | +17547 ms [+7846 ms, +19486 ms] (pairs=13) |
| End-to-end latency p95 | 13849 ms (n=13) | 35621 ms (n=13) | +21773 ms [+11700 ms, +24026 ms] (pairs=13) |
| Completed assessments, latency p50 / p95 | — (n=0) | 24179 ms / 32547 ms (n=7) | — |
| Gemini HTTP attempts, total / mean per capture | 13 / 1.00 (n=13) | 44 / 3.38 (n=13) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=13) | 4 / 4 (n=13) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | 0.475 (n=3) | — (pairs=0) |

### Product links (n=8)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 0.0% [0.0%–32.4%] (n=8) | 25.0% [7.1%–59.1%] (n=8) | +25.0 pp [0.0 pp, +62.5 pp] (pairs=8) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | — (n=0) | 0.0% [0.0%–65.8%] (n=2) | — (pairs=0) |
| Device category accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-kind accuracy | 0.0% [0.0%–32.4%] (n=8) | 25.0% [7.1%–59.1%] (n=8) | +25.0 pp [0.0 pp, +62.5 pp] (pairs=8) |
| Device type match (Decisions) | — (n=0) | — (n=0) | — (pairs=0) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | — (n=0) | — (n=0) | — (pairs=0) |
| Radio F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Port F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Visible default credentials accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Cloud flag accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-area accuracy | 0.0% [0.0%–32.4%] (n=8) | 25.0% [7.1%–59.1%] (n=8) | +25.0 pp [0.0 pp, +62.5 pp] (pairs=8) |
| Purdue-level accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Never-place violation rate | — (n=0) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 0.0% [0.0%–20.4%] (n=15) | 6.7% [1.2%–29.8%] (n=15) | +6.7 pp [0.0 pp, +27.3 pp] (pairs=8) |
| Valid ATT&CK citations | — (n=0) | 100.0% [20.7%–100.0%] (n=1) | — (pairs=0) |
| Invalid ATT&CK citations | — (n=0) | 0.0% [0.0%–79.3%] (n=1) | — (pairs=0) |
| Rule consistency | — (n=0) | 50.0% [9.5%–90.5%] (n=2) | — (pairs=0) |
| Placement coverage | 0.0% [0.0%–32.4%] (n=8) | 25.0% [7.1%–59.1%] (n=8) | +25.0 pp [0.0 pp, +62.5 pp] (pairs=8) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Execution failure rate | 100.0% [67.6%–100.0%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | -25.0 pp [-62.5 pp, 0.0 pp] (pairs=8) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 8 | 8 / 0 | 0 / 0 | 8 | 8 / 0 | 0 / 0 | 0 |
| System | 8 | 8 / 0 | 0 / 0 | 6 | 6 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 15634 ms (n=8) | 4270 ms (n=8) | -11365 ms [-16515 ms, +7503 ms] (pairs=8) |
| End-to-end latency p95 | 20716 ms (n=8) | 29449 ms (n=8) | +8733 ms [-13523 ms, +14172 ms] (pairs=8) |
| Completed assessments, latency p50 / p95 | — (n=0) | 29058 ms / 30232 ms (n=2) | — |
| Gemini HTTP attempts, total / mean per capture | 7 / 0.88 (n=8) | 9 / 1.13 (n=8) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=8) | 0 / 4.6499999999999995 (n=8) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | — (n=0) | — (pairs=0) |

## Where it still fails

### photo-026 · images/photo-026.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / flower pot · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-002 · images/photo-002.jpg · clean

- Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
- System — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.911
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-001 · images/photo-001.jpg · messy

- Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Wi-Fi Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.469
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in device type (P(match) 0.47).
- System risk omission — Missed physical\_port.

### photo-003 · images/photo-003.jpg · edge

- Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed camera\_view, physical\_port.

### link-bright-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / Cylindrical vertical insulated storage tank (BBT) · vessel · vertical\_tank / blending / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in capacity or size.
- System rule conflict — No clear footprint or valid network location for the recommendation.

### photo-027 · images/photo-027.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — Non-device · Stopped
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.

### photo-005 · images/photo-005.jpg · clean

- Expected — Accept device · Huawei 4G+ desktop cellular modem router · gateway · gateway / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / risks wireless
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Cellular Wi-Fi Router · network · gateway / corporate\_office / Purdue 4 / never filler3 / radios wifi, cellular / ports none / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.607
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in category.

### photo-004 · images/photo-004.jpg · messy

- Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
- Baseline — Device · Continued / Outdoor IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks default\_creds, camera\_view / rule check passed / P(type match) 0.899
- System — networked\_device · Continued / IP camera · camera · ip\_camera / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed / P(type match) 0.532
- System wrong zone — Recommended packaging at Purdue 2, outside the labeled placements.
- System risk omission — Missed camera\_view.

### photo-025 · images/photo-025.jpg · edge

- Expected — Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / pump · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.141
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.14).

### link-hygienic-pressure · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-028 · images/photo-028.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / mug · other · generic\_device / crew\_office / never filler3, blending / radios none / ports none / visible defaults no · cloud unknown / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle Ceramic Foreign Material / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-006 · images/photo-006.jpg · clean

- Expected — Accept device · Siemens SIMATIC S7-1200 modular PLC assembly · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks washdown, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Programmable Logic Controller · controller · generic\_device / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in physical kind.
- System risk omission — Missed physical\_port.

### photo-008 · images/photo-008.jpg · messy

- Expected — Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed / P(type match) 0.302
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in device type (P(match) 0.30).
- System risk omission — Missed wireless, physical\_port, removable\_media.

### photo-048 · images/photo-048.jpg · edge

- Expected — Accept device · MAXIMATOR 2500 bar mechanical pressure gauge · instrument · instrument / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / Analog pressure gauge · instrument · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 0-2500 bar / 0-35000+ psi / risks washdown / rule check passed / P(type match) 0.673
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed hazardous\_area.

### link-indoor-camera · www.axis.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor / risks camera\_view, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Dome Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports Ethernet (PoE) / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed camera\_view, physical\_port.

### photo-029 · images/photo-029.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / framed document · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud unknown / risks washdown / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-007 · images/photo-007.jpg · clean

- Expected — Accept device · Siemens SIMATIC OP77B keypad operator panel · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RS-485, RS-232, USB-A, MMC / visible defaults no / cloud no / risks physical\_port, removable\_media, washdown
- Baseline — Device · Continued / Operator Panel HMI · hmi · hmi / control\_room / Purdue 2 / never washdown, nh3\_hazard, visitor\_corridor / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.477
- System — electrical\_equipment · Continued / Siemens SIMATIC Panel HMI · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.683
- Baseline perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.48).
- Baseline risk omission — Missed physical\_port, removable\_media.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed physical\_port, removable\_media.

### photo-011 · images/photo-011.jpg · messy

- Expected — Accept device · Cisco Catalyst 4006 rack-mount Ethernet switch · network · network\_switch / areas corporate\_office, control\_room / Purdue 2, 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Network Switch · network · network\_switch / control\_room / Purdue 2 / never filler3 / radios none / ports 48x 10/100 BASE-T Ethernet (RJ-45) / visible defaults no · cloud unknown / size 48 ports per module / risks transient, washdown / rule check passed
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed physical\_port.

### text-01 · Text capture · edge

- Expected — Accept device · contractor service laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / visible defaults no / risks transient, remote\_access
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / laptop · computer · laptop / control\_room / Purdue 3.5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed remote\_access.

### link-lte-gateway · teltonika.gnshk.com · links

- Expected — Accept device · gateway / areas control\_room / size 74.5 x 25 x 64.4 mm / risks wireless, remote\_access, cloud, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-030 · images/photo-030.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — Non-device · Stopped
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.

### photo-009 · images/photo-009.jpg · clean

- Expected — Accept device · Apple iPhone 15 smartphone · phone · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth, cellular, nfc / ports USB-C / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — gate · The gate stage timed out after 20 seconds. Try again.

### photo-017 · images/photo-017.jpg · messy

- Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### text-08 · Text capture · edge

- Expected — Accept device · Teltonika TRB140 industrial LTE gateway · gateway · gateway / areas control\_room / Purdue 3.5 / forbidden packaging, water\_treatment, syrup\_room, blending, utilities, filler3, washdown, nh3\_hazard / radios cellular / visible defaults no / risks wireless, remote\_access, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### link-mixing-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-052 · images/photo-052.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System timeout — gate · The gate stage timed out after 20 seconds. Try again.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3.

### photo-010 · images/photo-010.jpg · clean

- Expected — Accept device · Apple iPad first-generation Wi-Fi tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth / ports 30-pin dock, 3.5 mm audio jack / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Device · Continued / tablet · computer · generic\_device / corporate\_office / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, washdown / rule check passed
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-018 · images/photo-018.jpg · messy

- Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### link-outdoor-camera · www.vigi.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / size 78.5 x 188.0 x 71.5 mm / risks camera\_view, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-053 · images/photo-053.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System timeout — gate · The gate stage timed out after 20 seconds. Try again.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3.

### photo-012 · images/photo-012.jpg · clean

- Expected — Accept device · Honeywell 4600g wired handheld barcode imager · sensor · generic\_device / areas packaging, corporate\_office / Purdue 1, 2, 4 / forbidden filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks physical\_port, transient
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-020 · images/photo-020.jpg · messy

- Expected — Accept device · Western Digital My Passport Ultra portable external hard drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB 3.0 Micro-B / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### link-point-level · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-054 · images/photo-054.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.
- System timeout — gate · The gate stage timed out after 20 seconds. Try again.
- System physical-safety omission — No as-dropped physical or food-safety concern for filler3.

### photo-013 · images/photo-013.jpg · clean

- Expected — Accept device · Rosemount pressure transmitter with local display · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area, washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-022 · images/photo-022.jpg · messy

- Expected — Accept device · wired industrial electrical control cabinet · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### link-serial-gateway · www.moxa.com · links

- Expected — Accept device · gateway / areas water\_treatment, syrup\_room, blending, packaging, utilities / size 22 x 52 x 80 mm / risks physical\_port, washdown
- Baseline — No classification · No gate answer / link · Could not read this product page.
- System — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- Baseline product link retrieval — link · Could not read this product page.
- System product link retrieval — link · This page did not return readable product details; try a photo or paste the specs as text.

### photo-014 · images/photo-014.jpg · clean

- Expected — Accept device · cabled float level switch for an open tank · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-023 · images/photo-023.jpg · messy

- Expected — Accept device · Siemens SIMATIC NET ESM TP80 industrial Ethernet switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, DB9 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-015 · images/photo-015.jpg · clean

- Expected — Accept device · three-wire Pt100 RTD temperature probe · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Pt100 RTD temperature sensor · sensor · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports 3-wire RTD leads / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / rule check passed
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed hazardous\_area.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-032 · images/photo-032.jpg · messy

- Expected — Accept device · Siemens SIMATIC S7-300 wired PLC panel · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### photo-016 · images/photo-016.jpg · clean

- Expected — Accept device · Coriolis mass flow meter · instrument · instrument / areas water\_treatment, utilities, blending, syrup\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-035 · images/photo-035.jpg · messy

- Expected — Accept device · wall-mounted fixed barcode price-check scanner · sensor · generic\_device / areas corporate\_office, packaging / Purdue 2, 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-019 · images/photo-019.jpg · clean

- Expected — Accept device · SanDisk Cruzer Titanium USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3, control\_room, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / size 8 GB / risks removable\_media, washdown / ATT&CK T0847 / rule check passed
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline risk omission — Missed transient, physical\_port.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-036 · images/photo-036.jpg · messy

- Expected — Accept device · process tank level sensor · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Level transmitter · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports wired\_signal / visible defaults no · cloud no / ATT&CK T0836 / rule check passed
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed washdown, hazardous\_area.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-021 · images/photo-021.jpg · clean

- Expected — Accept device · industrial pushbutton operator station · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-040 · images/photo-040.jpg · messy

- Expected — Accept device · installed refrigerant flow meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### photo-024 · images/photo-024.jpg · clean

- Expected — Accept device · plate-and-frame heat exchanger · machine · heat\_exchanger / areas water\_treatment, blending, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Plate heat exchanger · other · heat\_exchanger / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, control\_room / radios none / ports none / visible defaults no · cloud no / rule check passed / P(type match) 0.743
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed washdown.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-047 · images/photo-047.jpg · messy

- Expected — Accept device · manual quarter-turn shutoff valve · valve · valve / areas water\_treatment, utilities, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-031 · images/photo-031.jpg · clean

- Expected — Accept device · Teltonika TRM240 and TRM250 industrial cellular modems · gateway · gateway / areas control\_room, corporate\_office / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios cellular / ports microUSB, SMA, SIM / visible defaults no / risks wireless, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System gate error — gate · This stage could not finish. Try the capture again.

### photo-049 · images/photo-049.jpg · messy

- Expected — Accept device · Lantronix ETS32PR serial-to-Ethernet console server · gateway · gateway / areas control\_room, corporate\_office / Purdue 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, AUI / visible defaults no / risks physical\_port, remote\_access
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### photo-033 · images/photo-033.jpg · clean

- Expected — Accept device · Siemens SIMATIC ET 200S PROFINET remote I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / perception · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — perception · This stage could not finish. Try the capture again.

### photo-050 · images/photo-050.jpg · messy

- Expected — Accept device · Ring video doorbell surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / cloud yes / risks wireless, cloud, camera\_view
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / Video Doorbell · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0882 / rule check passed / P(type match) 0.782
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed wireless, cloud, camera\_view.

### photo-034 · images/photo-034.jpg · clean

- Expected — Accept device · WAGO 750-series modular industrial I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks physical\_port, washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / PLC Controller · controller · generic\_device / packaging / Purdue 1 / never filler3 / radios none / ports Ethernet (X1), Ethernet (X2), RS232/485 DB9 (X3), SD card slot / visible defaults no · cloud unknown / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.631
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in physical kind.
- System risk omission — Missed physical\_port.

### text-02 · Text capture · messy

- Expected — Accept device · consumer Wi-Fi cloud surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults yes / cloud yes / risks wireless, cloud, default\_creds, camera\_view
- Baseline — Device · Continued / Wi-Fi IP Camera · camera · ip\_camera / packaging / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults yes · cloud yes / size little / risks wireless, default\_creds, cloud, washdown / ATT&CK T0812 / rule check passed / P(type match) 0.577
- System — networked\_device · Continued / Wi-Fi camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults yes · cloud yes / risks wireless, default\_creds, cloud, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.325
- Baseline wrong zone — Recommended forbidden area packaging.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed camera\_view.
- System perception miss — Label mismatch in device type (P(match) 0.33).
- System risk omission — Missed camera\_view.

### photo-037 · images/photo-037.jpg · clean

- Expected — Accept device · electrically actuated butterfly valve · valve · valve / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / electric actuated butterfly valve · valve · valve / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.938
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed hazardous\_area.

### text-03 · Text capture · messy

- Expected — Accept device · hygienic vibrating-fork point level switch · sensor · instrument / areas water\_treatment, syrup\_room, blending, filler3, washdown, utilities / Purdue 0 / forbidden nh3\_hazard / radios none / visible defaults no / cloud no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / hygienic vibronic high level switch · sensor · instrument / filler3 / Purdue 0 / never nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / rule check passed / P(type match) 0.686
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed washdown.

### photo-038 · images/photo-038.jpg · clean

- Expected — Accept device · SanDisk Cruzer Blade USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3 / radios none / ports USB Type-A / visible defaults no · cloud no / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.732
- System — electrical\_equipment · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3 / radios none / ports USB Type-A / visible defaults no · cloud unknown / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.747
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed physical\_port.

### text-06 · Text capture · messy

- Expected — Accept device · USB-A flash drive with service files · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never packaging, filler3, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media / ATT&CK T0847, T0843 / rule check passed / P(type match) 0.638
- System — electrical\_equipment · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB-A / visible defaults no · cloud unknown / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.666
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in cloud flag.
- System risk omission — Missed transient, physical\_port.

### photo-039 · images/photo-039.jpg · clean

- Expected — Accept device · industrial Ethernet and fibre switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port, washdown
- Baseline — No classification · No gate answer / baseline · This stage could not finish. Try the capture again.
- System — networked\_device · Continued / Industrial Ethernet Switch · network · network\_switch / control\_room / Purdue 2 / never filler3 / radios none / ports 4x RJ45, 4x ST fiber / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.718
- Baseline execution error — baseline · This stage could not finish. Try the capture again.
- System risk omission — Missed physical\_port.

### text-07 · Text capture · messy

- Expected — Accept device · Bluetooth handheld barcode scanner · sensor · generic\_device / areas packaging / Purdue 1, 2 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless, transient, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / barcode scanner · other · generic\_device / packaging / Purdue 2 / never filler3, nh3\_hazard / radios bluetooth / ports usb / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860 / blocked (RF-01 Wireless within untrusted reach, USB-01 Removable media in OT) / P(type match) 0.510
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in category.
- System rule conflict — RF-01 Wireless within untrusted reach · USB-01 Removable media in OT
- System risk omission — Missed transient, physical\_port.

### photo-041 · images/photo-041.jpg · clean

- Expected — Accept device · cable-suspended float level switch · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / Float level switch · sensor · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.480
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in device type (P(match) 0.48).

### photo-042 · images/photo-042.jpg · clean

- Expected — Accept device · platinum resistance thermometer calibration probes · sensor · instrument / areas utilities, control\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports Info-Con / visible defaults no / cloud no / risks transient, physical\_port
- Baseline — Device · Continued / Precision RTD Temperature Probe · sensor · instrument / blending / Purdue 0 / never nh3\_hazard, visitor\_corridor / radios none / ports LEMO-style circular connector / visible defaults no · cloud no / risks washdown / ATT&CK T0856 / rule check passed / P(type match) 0.908
- System — electrical\_equipment · Continued / Temperature Probe · sensor · instrument / utilities / Purdue 0 / never filler3 / radios none / ports circular\_connector / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.234
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0856.
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in ports, device type (P(match) 0.23).
- System risk omission — Missed transient, physical\_port.

### photo-043 · images/photo-043.jpg · clean

- Expected — Accept device · Rotronic temperature and humidity probe · sensor · instrument / areas utilities, control\_room, corporate\_office, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / Sensor probe · sensor · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.163
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in device type (P(match) 0.16).

### photo-044 · images/photo-044.jpg · clean

- Expected — Accept device · Apple iPad sixth-generation tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / ports Lightning, 3.5 mm audio jack / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — Device · Continued / tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, blending / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, remote\_access, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.765
- System — networked\_device · Continued / tablet · computer · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.763
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port, camera\_view.
- System perception miss — Label mismatch in physical kind, ports, cloud flag.
- System risk omission — Missed wireless, cloud, transient, physical\_port, camera\_view.

### photo-045 · images/photo-045.jpg · clean

- Expected — Accept device · Raspberry Pi 4 Model B single-board computer · computer · generic\_device / areas corporate\_office, control\_room, crew\_office / Purdue 3, 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios wifi, bluetooth / ports RJ45, USB-A, USB-C, micro HDMI, microSD, GPIO, MIPI CSI, MIPI DSI, 3.5 mm A/V jack / visible defaults no / risks wireless, removable\_media, physical\_port
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — networked\_device · Continued / single-board computer · computer · generic\_device / control\_room / Purdue 3 / never filler3 / radios none / ports Ethernet, USB 3.0, USB 2.0, USB-C (Power In), Micro HDMI, 3.5mm A/V, GPIO, Display (DSI), Camera (CSI), PoE header / visible defaults no · cloud unknown / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.418
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in radios, ports, device type (P(match) 0.42).
- System risk omission — Missed wireless, physical\_port.

### photo-046 · images/photo-046.jpg · clean

- Expected — Accept device · Rosemount temperature transmitter and thermowell · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — electrical\_equipment · Continued / Temperature Sensor · sensor · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.491
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in device type (P(match) 0.49).
- System risk omission — Missed hazardous\_area.

### photo-051 · images/photo-051.jpg · clean

- Expected — Accept device · KSB Etanorm centrifugal pump and variable-frequency drive · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0, 1 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / Centrifugal pump with integrated VFD · rotating\_equipment · pump / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.767
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System risk omission — Missed hazardous\_area.

### text-04 · Text capture · clean

- Expected — Accept device · wired Modbus serial-to-Ethernet gateway · gateway · gateway / areas packaging / Purdue 1 / forbidden filler3, washdown, nh3\_hazard / radios none / ports RS-485, RJ45 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Modbus Serial-to-Ethernet Gateway · gateway · gateway / packaging / Purdue 1 / never corporate\_office, washdown, nh3\_hazard / radios none / ports RS485, RJ45 / visible defaults no · cloud no / size Small DIN box / risks default\_creds, physical\_port / ATT&CK T0855, T0812 / rule check passed / P(type match) 0.899
- System — networked\_device · Continued / Modbus serial-to-Ethernet gateway · gateway · gateway / packaging / Purdue 1 / never filler3 / radios none / ports RS485, RJ45 / visible defaults no · cloud no / risks transient, washdown / rule check passed / P(type match) 0.891
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855, T0812.
- Baseline risk omission — Missed washdown.
- System risk omission — Missed physical\_port.

### text-05 · Text capture · clean

- Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — process\_equipment · Continued / Vertical jacketed tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L / risks washdown / rule check passed / P(type match) 0.239
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.24).
- System wrong zone — Recommended utilities at Purdue 0, outside the labeled placements.

### text-09 · Text capture · clean

- Expected — Accept device · mechanical compressed-air pressure gauge · instrument · instrument / areas utilities / Purdue 0 / forbidden washdown, filler3, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — Device · Continued / Mechanical Pressure Gauge · instrument · instrument / utilities / Purdue 0 / never nh3\_hazard, filler3 / radios none / ports none / visible defaults no · cloud no / size 0–10 bar / risks washdown / rule check passed / P(type match) 0.400
- System — process\_equipment · Continued / Analog Pressure Gauge · instrument · instrument / radios none / ports none / visible defaults no · cloud no / size 0-10 bar / P(type match) 0.446 / reasoning · The reasoning stage timed out after 60 seconds. Try again.
- Baseline perception miss — Label mismatch in device type (P(match) 0.40).
- System timeout — reasoning · The reasoning stage timed out after 60 seconds. Try again.
- System perception miss — Label mismatch in device type (P(match) 0.45).

## Device type judgments

| Item | Labeled type | Baseline P(match) | System P(match) |
| --- | --- | ---: | ---: |
| photo-002 | Linksys Wireless-G broadband router | 0.907 | 0.911 |
| photo-001 | Ubiquiti UniFi AC Lite access point | — | 0.469 |
| photo-003 | AXIS 2100 network webcam | — | 0.612 |
| photo-005 | Huawei 4G+ desktop cellular modem router | — | 0.607 |
| photo-004 | outdoor Axis network surveillance camera | 0.899 | 0.532 |
| photo-025 | historic Gwynnes centrifugal waterworks pump | — | 0.141 |
| photo-006 | Siemens SIMATIC S7-1200 modular PLC assembly | — | — |
| photo-008 | Lenovo ThinkPad T480 laptop | — | 0.302 |
| photo-048 | MAXIMATOR 2500 bar mechanical pressure gauge | — | 0.673 |
| photo-007 | Siemens SIMATIC OP77B keypad operator panel | 0.477 | 0.683 |
| photo-011 | Cisco Catalyst 4006 rack-mount Ethernet switch | — | — |
| text-01 | contractor service laptop | — | — |
| photo-009 | Apple iPhone 15 smartphone | — | — |
| photo-017 | Itron OpenWay digital smart electricity meter | — | — |
| text-08 | Teltonika TRB140 industrial LTE gateway | — | — |
| photo-010 | Apple iPad first-generation Wi-Fi tablet | — | — |
| photo-018 | vertical stainless steel fermentation tank | — | — |
| photo-012 | Honeywell 4600g wired handheld barcode imager | — | — |
| photo-020 | Western Digital My Passport Ultra portable external hard drive | — | — |
| photo-013 | Rosemount pressure transmitter with local display | — | — |
| photo-022 | wired industrial electrical control cabinet | — | — |
| photo-014 | cabled float level switch for an open tank | — | — |
| photo-023 | Siemens SIMATIC NET ESM TP80 industrial Ethernet switch | — | — |
| photo-015 | three-wire Pt100 RTD temperature probe | — | — |
| photo-032 | Siemens SIMATIC S7-300 wired PLC panel | — | — |
| photo-016 | Coriolis mass flow meter | — | — |
| photo-035 | wall-mounted fixed barcode price-check scanner | — | — |
| photo-019 | SanDisk Cruzer Titanium USB flash drive | — | — |
| photo-036 | process tank level sensor | — | — |
| photo-021 | industrial pushbutton operator station | — | — |
| photo-040 | installed refrigerant flow meter | — | — |
| photo-024 | plate-and-frame heat exchanger | 0.743 | — |
| photo-047 | manual quarter-turn shutoff valve | — | — |
| photo-031 | Teltonika TRM240 and TRM250 industrial cellular modems | — | — |
| photo-049 | Lantronix ETS32PR serial-to-Ethernet console server | — | — |
| photo-033 | Siemens SIMATIC ET 200S PROFINET remote I/O station | — | — |
| photo-050 | Ring video doorbell surveillance camera | — | 0.782 |
| photo-034 | WAGO 750-series modular industrial I/O station | — | 0.631 |
| text-02 | consumer Wi-Fi cloud surveillance camera | 0.577 | 0.325 |
| photo-037 | electrically actuated butterfly valve | — | 0.938 |
| text-03 | hygienic vibrating-fork point level switch | — | 0.686 |
| photo-038 | SanDisk Cruzer Blade USB flash drive | 0.732 | 0.747 |
| text-06 | USB-A flash drive with service files | 0.638 | 0.666 |
| photo-039 | industrial Ethernet and fibre switch | — | 0.718 |
| text-07 | Bluetooth handheld barcode scanner | — | 0.510 |
| photo-041 | cable-suspended float level switch | — | 0.480 |
| photo-042 | platinum resistance thermometer calibration probes | 0.908 | 0.234 |
| photo-043 | Rotronic temperature and humidity probe | — | 0.163 |
| photo-044 | Apple iPad sixth-generation tablet | 0.765 | 0.763 |
| photo-045 | Raspberry Pi 4 Model B single-board computer | — | 0.418 |
| photo-046 | Rosemount temperature transmitter and thermowell | — | 0.491 |
| photo-051 | KSB Etanorm centrifugal pump and variable-frequency drive | — | 0.767 |
| text-04 | wired Modbus serial-to-Ethernet gateway | 0.899 | 0.891 |
| text-05 | vertical stainless steel carbonated beverage buffer tank | — | 0.239 |
| text-09 | mechanical compressed-air pressure gauge | 0.400 | 0.446 |

## Scoring notes

- Device accuracy uses the returned perception class, then a recognized gate class, then P(device) ≥ 0.5 when the gate supplies a binary answer. Passive maps to non-device. A usability stop and a device classification are separate. Missing classifications count as misses in accuracy. Class-specific error rates use answered labels.
- Non-device cyber claims count any published structured radio, path, technique, cyber-risk, cloud or default-credential assertion on a labeled negative. A stopped capture supplies no claim. Stripped claims recorded by the Inspector are tracked separately. Free-text briefings and unpublished provider fields are outside this score.
- Food-contact coverage uses the default Filler 3 drop on this twin. A physical rule, food-safety finding or explicitly local physical risk counts. All labeled negatives at this drop enter the denominator, including unusable captures. The original baseline declined assessments of non-devices, and its input described the plant without an explicit drop instruction.
- Labeled category, kind, area, Purdue level, flags, sizing and risk recall include missing predictions as misses. Placement coverage counts labeled devices with a recommendation. Never-place violation uses recommendations with at least one labeled forbidden area.
- Rule consistency runs both recommendations through the same asset and placement helpers and `evaluatePlacement` against the same seed. An unresolved footprint or network reference counts as a rule-check failure. Blocking means severity 4 or 5.
- Radio and port scores are micro-averaged over known lists. Ports use case, punctuation and common connector aliases. Size match uses normalized text and units without unit conversion. Risk tags are extracted from risk titles and descriptions with the same term patterns for both sides. A tag match does not verify the risk description.
- ATT&CK validity checks distinct cited IDs per item against ICS 20.1. It measures delivered citations. System IDs flagged and removed during grounding are recorded independently, including any that prompted revision.
- Wilson 95% intervals use the displayed denominators. For F1, the Wilson interval for Jaccard overlap is transformed to F1, so n is the total matched or unmatched labels. Label-level intervals are descriptive when several labels come from one capture.
- Differences are system minus baseline on eligible paired items. The 95% percentile bootstrap recomputes each statistic on 2,000 resamples of matched items. Small groups yield unstable or degenerate intervals. Latency includes gate rejections and failed executions with a measured time, excludes the offline judge and rule scoring, and uses linear interpolation.
- Both sides receive the same text or image bytes and the same product URL. Each side uses the project link fetcher for its own retrieval, so live pages can vary. Pipeline latency includes briefing when reached.
- Gemini HTTP attempts include retries and interaction retrievals. The paired capture cost excludes the offline type judge, product-page requests and unfinished pairs. A failed or rejected capture can use fewer calls than a completed placement.
- See `eval/dataset/SOURCES.md` for collection and provenance and `FAILURES.md` for case diagnoses.
