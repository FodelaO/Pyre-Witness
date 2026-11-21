# Pyre Witness evaluation

2026-11-21T20:32:44.066Z · Run `run-5` · 71 / 71 paired captures · 71 available

**Observed regressions.** Device category accuracy (81.5% → 79.6%), Product capacity or size match (100.0% → 50.0%, n=2), Completed assessment latency p95 (41624 ms → 42222 ms across all attempts), Gemini request traces per capture (4.00 → 4.08).

Recorded attempts · Baseline 71 · System 71. System collection 7.5 min at 4 capture workers.

Baseline uses one gemini-4-hydrogen interaction at low thinking and a prose plant description (original-output-v1). The system uses gemini-decision-1 for its gate, gemini-4-hydrogen for perception, gemini-4-carbon for reasoning and any revision, the rules engine, and gemini-4-neon for briefing. The type judge uses a separate gemini-decision-1 request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.

Saved fair baseline `run-3-baseline` finished at 2026-11-21T18:34:13.363Z, using 4 workers and 4.1 min. It uses the byte-identical first-run system prompt and request schema, the original prose plant description and capture formatting. The local scorer accepts over-length strings and lists whose limits were absent from the request schema. It preserves the returned content.

The baseline uses Scout’s 45 s Hydrogen deadline, inclusive of retries and backoff, with up to 3 HTTP attempts for transient connection failures, HTTP 429 or 5xx. The shared retry waits at least 250 ms then 500 ms, honors Retry-After and adds jitter. The evaluator also shares its cross-worker 429 cooldown. Every retry sends the same request. A completed model response ends inference. The separate product-page retrieval budget is 18 s.

System results use `run-5` at launch fingerprint `4c5eed7b9eb4361e82efe89f4c6a159cc48646f00a8f6f775b321b4c837f0fba`. Baseline output, offline type judgments and verdicts are reused from `run-3-baseline` at fingerprint `d4b1ecc47007e9332038e4a6fa54d7b873c123599e5f23ff8fc7b602619bd87b`. This run made zero baseline model calls.

All comparisons use one development set that informed the iterations. No held-out set has been evaluated.

Pipeline source SHA-256 at collection launch `a12a09a4a5276acdd7205cc25c819c54a887cc3f988fc4585da44f23f168048f`.

System thinking levels · perception low, reasoning low, briefing low. Offline judge recorded 110 HTTP attempts across 110 judgment receipts.

Source and dataset fingerprint `4c5eed7b9eb4361e82efe89f4c6a159cc48646f00a8f6f775b321b4c837f0fba`.

## Paired results and all attempts

Both sides answered on 68/71 captures. A deliberate usability stop is an answer. All-attempt accuracy includes missing predictions as misses. Output-dependent metrics use their eligible denominators for each side. The paired device-type score requires an available judgment for each returned type.

| Metric | Baseline paired [95% CI] | Pyre Witness paired [95% CI] | Baseline all [95% CI] | Pyre Witness all [95% CI] |
| --- | ---: | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [94.7%–100.0%] (n=68) | 100.0% [94.7%–100.0%] (n=68) | 95.8% [88.3%–98.6%] (n=71) | 100.0% [94.9%–100.0%] (n=71) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) |
| Devices classified as non-devices | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–5.7%] (n=63) |
| Device category accuracy | 87.3% [76.0%–93.7%] (n=55) | 80.0% [67.6%–88.4%] (n=55) | 87.3% [76.0%–93.7%] (n=55) | 80.0% [67.6%–88.4%] (n=55) |
| Physical-kind accuracy | 95.0% [86.3%–98.3%] (n=60) | 98.3% [91.1%–99.7%] (n=60) | 90.5% [80.7%–95.6%] (n=63) | 98.4% [91.5%–99.7%] (n=63) |
| Device type match (Decisions) | 67.3% [54.1%–78.2%] (n=55) | 78.2% [65.6%–87.1%] (n=55) | 67.3% [54.1%–78.2%] (n=55) | 78.2% [65.6%–87.1%] (n=55) |
| Radio precision | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) |
| Radio recall | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) |
| Radio F1 | 100.0% [86.2%–100.0%] (n=12) | 100.0% [86.2%–100.0%] (n=12) | 100.0% [86.2%–100.0%] (n=12) | 100.0% [86.2%–100.0%] (n=12) |
| Port F1 | 23.7% [13.5%–38.2%] (n=67) | 38.1% [24.6%–53.8%] (n=51) | 23.7% [13.5%–38.2%] (n=67) | 38.1% [24.6%–53.8%] (n=51) |
| Visible default credentials accuracy | 100.0% [93.5%–100.0%] (n=55) | 100.0% [93.5%–100.0%] (n=55) | 100.0% [93.5%–100.0%] (n=55) | 100.0% [93.5%–100.0%] (n=55) |
| Cloud flag accuracy | 88.5% [71.0%–96.0%] (n=26) | 88.5% [71.0%–96.0%] (n=26) | 88.5% [71.0%–96.0%] (n=26) | 88.5% [71.0%–96.0%] (n=26) |
| Physical-area accuracy | 86.4% [75.5%–93.0%] (n=59) | 91.5% [81.6%–96.3%] (n=59) | 82.3% [71.0%–89.8%] (n=62) | 88.7% [78.5%–94.4%] (n=62) |
| Purdue-level accuracy | 94.5% [85.1%–98.1%] (n=55) | 94.5% [85.1%–98.1%] (n=55) | 94.5% [85.1%–98.1%] (n=55) | 94.5% [85.1%–98.1%] (n=55) |
| Unsafe recommendations in labeled forbidden areas | 5.5% [1.9%–14.9%] (n=55) | 0.0% [0.0%–6.5%] (n=55) | 5.5% [1.9%–14.9%] (n=55) | 0.0% [0.0%–6.5%] (n=55) |
| Expected risk-tag recall | 51.7% [42.8%–60.4%] (n=120) | 70.0% [61.3%–77.5%] (n=120) | 50.0% [41.3%–58.7%] (n=124) | 71.0% [62.4%–78.2%] (n=124) |
| Valid ATT&CK citations | 86.3% [74.3%–93.2%] (n=51) | 100.0% [91.2%–100.0%] (n=40) | 86.3% [74.3%–93.2%] (n=51) | 100.0% [91.2%–100.0%] (n=40) |
| Invalid ATT&CK citations | 13.7% [6.8%–25.7%] (n=51) | 0.0% [0.0%–8.8%] (n=40) | 13.7% [6.8%–25.7%] (n=51) | 0.0% [0.0%–8.8%] (n=40) |
| Rule consistency | 85.0% [73.9%–91.9%] (n=60) | 100.0% [94.5%–100.0%] (n=66) | 85.0% [73.9%–91.9%] (n=60) | 97.1% [90.0%–99.2%] (n=69) |
| Placement coverage | 100.0% [94.0%–100.0%] (n=60) | 100.0% [94.0%–100.0%] (n=60) | 95.2% [86.9%–98.4%] (n=63) | 100.0% [94.3%–100.0%] (n=63) |
| Product capacity or size match | 0.0% [0.0%–65.8%] (n=2) | 50.0% [9.5%–90.5%] (n=2) | 0.0% [0.0%–43.4%] (n=5) | 20.0% [3.6%–62.4%] (n=5) |
| Execution failure rate | 0.0% [0.0%–5.3%] (n=68) | 0.0% [0.0%–5.3%] (n=68) | 4.2% [1.4%–11.7%] (n=71) | 0.0% [0.0%–5.1%] (n=71) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) |
| Rules-engine revision rate | N/A | 6.1% [2.4%–14.6%] (n=66) | N/A | 8.7% [4.0%–17.7%] (n=69) |

### Exact paired tests and risk recall interval

| Metric | Scope | Pairs | Both positive | Hydrogen only | Pyre Witness only | Neither | Exact McNemar (two-sided) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Physical-area accuracy | Both answered | 59 | 47 | 4 | 7 | 1 | p=0.549 |
| Physical-area accuracy | All attempts | 62 | 47 | 4 | 8 | 3 | p=0.388 |
| Physical-kind accuracy | Both answered | 60 | 56 | 1 | 3 | 0 | p=0.625 |
| Physical-kind accuracy | All attempts | 63 | 56 | 1 | 6 | 0 | p=0.125 |
| Unsafe recommendations in labeled forbidden areas | Both answered | 55 | 0 | 3 | 0 | 52 | p=0.250 |
| Unsafe recommendations in labeled forbidden areas | All attempts | 55 | 0 | 3 | 0 | 52 | p=0.250 |

A positive outcome is a correct answer for area and kind, and a labeled forbidden placement for the safety test. The safety test uses pairs with two applicable recommendations.

Key-risk recall difference (Pyre Witness minus Hydrogen), bootstrapped by capture with a 95% interval. Both answered +18.3 pp [+9.3 pp, +26.9 pp] (pairs=56). All attempts +21.0 pp [+12.2 pp, +29.5 pp] (pairs=59).

The paired area difference is inconclusive at the 5% level.

The two sides tied on Device vs non-device accuracy, Purdue-level accuracy.

Intervals are Wilson 95%. F1 transforms the Wilson bounds on Jaccard overlap. Tags, citations and connector counts can be correlated within a capture. An unsafe recommendation places the capture in an explicitly forbidden area from its labels. Rule consistency uses the recorded offline placement verdict, with the baseline verdict preserved from the fair run. The live revision rate counts archived revision starts among initial recommendations checked by the rules engine. The single-call baseline has no revision stage.

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 71 | 63 / 8 | 0 / 0 | 3 | 3 / 1 | 0 / 0 | 0 |
| System | 71 | 63 / 8 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13277 ms (n=71) | 23297 ms (n=71) | +10020 ms [+8987 ms, +11173 ms] (pairs=71) |
| End-to-end latency p95 | 18388 ms (n=71) | 41976 ms (n=71) | +23588 ms [+8292 ms, +37395 ms] (pairs=71) |
| Completed assessments, latency p50 / p95 | 13426 ms / 18324 ms (n=60) | 23389 ms / 42222 ms (n=69) | — |
| Recorded Gemini HTTP attempts, total / mean per capture | 69 / 0.97 (n=71) | 291 / 4.10 (n=71) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=71) | 4 / 5 (n=71) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.586 (n=55) | 0.723 (n=55) | +0.137 [+0.082, +0.196] (pairs=55) |

## Run 4 vs Run 5

The table joins 71 captured inputs by fingerprint. Its common cohort comprises the 66 inputs answered by both system versions and the saved Hydrogen baseline. Device-type naming uses jointly scorable judgments in the common cohort. Output-dependent denominators use the opportunities recorded for each version.

Scout latency comes from the published `perception.done.latencyMs` event and includes the Scout request, validation and post-processing. Missing events contribute no latency. Common p50 and p95 use the same inputs with both timings recorded. Run 4 used six workers and Run 5 used four. The timing difference reflects both collection conditions and pipeline changes.

- **Radio recall** moved from 33.3% (n=12) to 100.0% (n=12).
- **Cloud flag accuracy** moved from 23.1% (n=26) to 88.5% (n=26).
- **Device category accuracy** moved from 81.5% (n=54) to 79.6% (n=54).
- **Device type match (Decisions)** moved from 61.1% (n=54) to 77.8% (n=54).
- **Scout latency p50** moved from 6775 ms (n=67) to 5927 ms (n=69).
- **Scout latency p95** moved from 10834 ms (n=67) to 8128 ms (n=69).

| System metric | Run 4 common | Run 5 common | Δ common | Run 4 all | Run 5 all | Δ all |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% (n=66) | 100.0% (n=66) | 0.0 pp | 98.6% (n=71) | 100.0% (n=71) | +1.4 pp |
| Non-devices classified as devices | 0.0% (n=8) | 0.0% (n=8) | 0.0 pp | 0.0% (n=8) | 0.0% (n=8) | 0.0 pp |
| Devices classified as non-devices | 0.0% (n=58) | 0.0% (n=58) | 0.0 pp | 0.0% (n=62) | 0.0% (n=63) | 0.0 pp |
| Device category accuracy | 81.5% (n=54) | 79.6% (n=54) | -1.9 pp | 80.0% (n=55) | 80.0% (n=55) | 0.0 pp |
| Physical-kind accuracy | 98.3% (n=58) | 98.3% (n=58) | 0.0 pp | 95.2% (n=63) | 98.4% (n=63) | +3.2 pp |
| Device type match (Decisions) | 61.1% (n=54) | 77.8% (n=54) | +16.7 pp | 60.0% (n=55) | 78.2% (n=55) | +18.2 pp |
| Radio precision | 100.0% (n=4) | 100.0% (n=12) | 0.0 pp | 100.0% (n=4) | 100.0% (n=12) | 0.0 pp |
| Radio recall | 33.3% (n=12) | 100.0% (n=12) | +66.7 pp | 33.3% (n=12) | 100.0% (n=12) | +66.7 pp |
| Radio F1 | 50.0% (n=12) | 100.0% (n=12) | +50.0 pp | 50.0% (n=12) | 100.0% (n=12) | +50.0 pp |
| Port F1 | 37.3% (n=48) | 38.1% (n=51) | +0.8 pp | 37.3% (n=48) | 38.1% (n=51) | +0.8 pp |
| Visible default credentials accuracy | 100.0% (n=54) | 100.0% (n=54) | 0.0 pp | 98.2% (n=55) | 100.0% (n=55) | +1.8 pp |
| Cloud flag accuracy | 23.1% (n=26) | 88.5% (n=26) | +65.4 pp | 23.1% (n=26) | 88.5% (n=26) | +65.4 pp |
| Physical-area accuracy | 89.5% (n=57) | 91.2% (n=57) | +1.8 pp | 82.3% (n=62) | 88.7% (n=62) | +6.5 pp |
| Purdue-level accuracy | 94.4% (n=54) | 94.4% (n=54) | 0.0 pp | 92.7% (n=55) | 94.5% (n=55) | +1.8 pp |
| Unsafe recommendations in labeled forbidden areas | 0.0% (n=54) | 0.0% (n=54) | 0.0 pp | 0.0% (n=54) | 0.0% (n=55) | 0.0 pp |
| Expected risk-tag recall | 58.5% (n=118) | 69.5% (n=118) | +11.0 pp | 58.9% (n=124) | 71.0% (n=124) | +12.1 pp |
| Valid ATT&CK citations | 100.0% (n=28) | 100.0% (n=40) | 0.0 pp | 100.0% (n=28) | 100.0% (n=40) | 0.0 pp |
| Invalid ATT&CK citations | 0.0% (n=28) | 0.0% (n=40) | 0.0 pp | 0.0% (n=28) | 0.0% (n=40) | 0.0 pp |
| Rule consistency | 98.4% (n=64) | 100.0% (n=64) | +1.6 pp | 95.5% (n=67) | 97.1% (n=69) | +1.6 pp |
| Placement coverage | 100.0% (n=58) | 100.0% (n=58) | 0.0 pp | 96.8% (n=63) | 100.0% (n=63) | +3.2 pp |
| Product capacity or size match | 100.0% (n=2) | 50.0% (n=2) | -50.0 pp | 40.0% (n=5) | 20.0% (n=5) | -20.0 pp |
| Execution failure rate | 0.0% (n=66) | 0.0% (n=66) | 0.0 pp | 2.8% (n=71) | 0.0% (n=71) | -2.8 pp |
| Non-devices with invented cyber claims | 0.0% (n=8) | 0.0% (n=8) | 0.0 pp | 0.0% (n=8) | 0.0% (n=8) | 0.0 pp |
| Non-device physical-safety coverage | 75.0% (n=8) | 75.0% (n=8) | 0.0 pp | 75.0% (n=8) | 75.0% (n=8) | 0.0 pp |
| Scout latency p50 | 6642 ms (n=64) | 5892 ms (n=64) | -750 ms | 6775 ms (n=67) | 5927 ms (n=69) | -848 ms |
| Scout latency p95 | 9654 ms (n=64) | 7755 ms (n=64) | -1899 ms | 10834 ms (n=67) | 8128 ms (n=69) | -2706 ms |
| End-to-end latency p50 | 24343 ms (n=66) | 22970 ms (n=66) | -1373 ms | 24635 ms (n=71) | 23297 ms (n=71) | -1338 ms |
| End-to-end latency p95 | 40226 ms (n=66) | 39494 ms (n=66) | -732 ms | 42022 ms (n=71) | 41976 ms (n=71) | -46 ms |
| Completed assessment latency p50 | 24530 ms (n=64) | 23136 ms (n=64) | -1394 ms | 24761 ms (n=67) | 23389 ms (n=69) | -1372 ms |
| Completed assessment latency p95 | 40267 ms (n=64) | 39993 ms (n=64) | -274 ms | 41624 ms (n=67) | 42222 ms (n=69) | +598 ms |
| Mean device-type P(match) | 0.56 (n=54) | 0.72 (n=54) | +0.16 | 0.56 (n=54) | 0.72 (n=55) | +0.16 |
| Rules-engine revision rate | 4.7% (n=64) | 6.3% (n=64) | +1.6 pp | 7.5% (n=67) | 8.7% (n=69) | +1.2 pp |
| Execution timeout rate | 0.0% (n=66) | 0.0% (n=66) | 0.0 pp | 1.4% (n=71) | 0.0% (n=71) | -1.4 pp |
| Gate fallback rate | 4.5% (n=66) | 0.0% (n=66) | -4.5 pp | 5.6% (n=71) | 0.0% (n=71) | -5.6 pp |
| Gemini request traces per capture | 4.00 (n=66) | 4.08 (n=66) | +0.08 | 3.96 (n=71) | 4.10 (n=71) | +0.14 |
| Gemini HTTP attempts per capture | — | 4.08 (n=66) | — | — | 4.10 (n=71) | — |
| Gemini HTTP attempts per capture, p50 | — | 4.00 (n=66) | — | — | 4.00 (n=71) | — |
| Gemini HTTP attempts per capture, p95 | — | 5.00 (n=66) | — | — | 5.00 (n=71) | — |
| HTTP 429 responses | — | 0.00 (n=66) | — | — | 0.00 (n=71) | — |
| Displayed rule paths per capture | 0.70 (n=66) | 1.92 (n=66) | +1.23 | 0.65 (n=71) | 1.79 (n=71) | +1.14 |
| Deterministic rule checks per capture | 2.00 (n=66) | 2.00 (n=66) | 0.00 | 2.00 (n=71) | 2.06 (n=71) | +0.06 |
| Rules-engine latency p50 per check | 14 ms (n=132) | 3 ms (n=132) | -11 ms | 14 ms (n=142) | 3 ms (n=146) | -11 ms |
| Rules-engine total latency p50 per checked capture | 78 ms (n=64) | 14 ms (n=64) | -64 ms | 78 ms (n=67) | 12 ms (n=69) | -66 ms |

Key-risk recall change from Run 4 to Run 5 with paired bootstrap 95% intervals. Common answers +11.0 pp [+4.6 pp, +17.8 pp] (pairs=54). All attempts +12.1 pp [+5.7 pp, +18.9 pp] (pairs=59).

Run 4’s incomplete HTTP counters make its HTTP-cost deltas unavailable. The request-trace row uses the same event definition for both runs. This comparison uses the same development set and scoring definitions as the previous run.

## Changes after failures

| Run | Recorded captures | Workers | p50 to outcome | Timeouts | Execution errors | Gate stage errors | Gate fallbacks | Device placements |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Run 1 | 67/71 | 6 | 129180 ms | 59 | 67 | 1 | — | 0 |
| Run 2 | 71/71 | 8 | 23549 ms | 5 | 34 | 21 | — | 32 |
| Run 3 | 71/71 | 6 | 25994 ms | 0 | 0 | 0 | 0 | 63 |
| Fair Hydrogen baseline | 71/71 | 4 | 13277 ms | 1 | 3 | — | — | 60 |
| Run 4 | 71/71 | 6 | 24635 ms | 1 | 2 | 0 | 4 | 61 |
| Run 5 | 71/71 | 4 | 23297 ms | 0 | 0 | 0 | 0 | 63 |

Run 2 used compact prompts, Carbon low, an as-dropped rules check before reasoning and targeted revision. Run 3 measured gate failure isolation and retry with backoff.

The fair baseline after Run 3 answered 68/71. It kept the original Hydrogen request and accepted otherwise valid answers that exceeded local length caps. Run 4 reuses these receipts.

Run 4 evaluates Scout’s function-first equipment-kind guide and a final risk list that combines Architect risks, rules-engine findings and Scout evidence on the same development set.

Run 5 separates Scout’s capability evidence from enabled state, fills connectivity only from explicit evidence, and sorts merged risks before capping the list.

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

The receipts contain 127 distinct displayed rules-engine paths across 71 captures (1.79 per capture) and 146 completed checks (2.06 per capture). The median was 3 ms per check and 12 ms summed per checked capture. 13 distinct rule IDs triggered. Individual rule invocations are untracked. Paths are deduplicated per capture across the as-dropped and final recommendation checks.

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
| photo-026 | passive_object | ok | none | FOOD-03 Non-production item in a process area, Foreign material and brittle ceramic contamination | none |
| photo-027 | non-device | rejected | none | none | none |
| photo-028 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle foreign material and personal item contamination | none |
| photo-029 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |
| photo-030 | non-device | rejected | none | none | none |
| photo-052 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material and microbial harborage | none |
| photo-053 | passive_object | ok | none | FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area | none |
| photo-054 | passive_object | ok | none | FOOD-03 Non-production item in a process area | none |

## Hardest inputs

A pass requires a usable result matching labeled kind and placement, or correct non-device handling. Edge captures rank first, then messy, links and clean.

| Input | Pyre Witness case pass rate [95% CI] |
| --- | ---: |
| Clean | 100.0% [87.5%–100.0%] (n=27) |
| Messy | 68.8% [44.4%–85.8%] (n=16) |
| Edge | 100.0% [43.9%–100.0%] (n=3) |
| Non-devices | 100.0% [67.6%–100.0%] (n=8) |
| Links | 75.0% [40.9%–92.9%] (n=8) |
| Text | 66.7% [35.4%–87.9%] (n=9) |

### Hardest correct

- **photo-003**. Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port System response — networked\_device · Continued / Axis 2100 Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.978
- **photo-025**. Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no System response — process\_equipment · Continued / Gwynnes pump · rotating\_equipment · pump / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.378
- **photo-026**. Non-device. Evaluate physical and food-safety concerns if the capture is usable. System response — passive\_object · Continued / Potted plant · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / as dropped FOOD-03 Non-production item in a process area, Foreign material and brittle ceramic contamination / rule check passed

### Hardest misses

- **photo-004**. Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view System response — networked\_device · Continued / Outdoor IP surveillance camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.831
- **photo-018**. Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown System response — process\_equipment · Continued / Vertical stainless steel process tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 150 Hls / risks washdown / rule check passed / P(type match) 0.431
- **photo-022**. Accept device · wired industrial electrical control cabinet · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port System response — electrical\_equipment · Continued / Electrical control and distribution panel · other · generic\_device / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.643

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
| Device vs non-device accuracy | 95.8% [88.3%–98.6%] (n=71) | 100.0% [94.9%–100.0%] (n=71) | +4.2 pp [0.0 pp, +9.9 pp] (pairs=71) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Devices classified as non-devices | 0.0% [0.0%–6.0%] (n=60) | 0.0% [0.0%–5.7%] (n=63) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=60) |
| Device category accuracy | 87.3% [76.0%–93.7%] (n=55) | 80.0% [67.6%–88.4%] (n=55) | -7.3 pp [-20.0 pp, +5.5 pp] (pairs=55) |
| Physical-kind accuracy | 90.5% [80.7%–95.6%] (n=63) | 98.4% [91.5%–99.7%] (n=63) | +7.9 pp [0.0 pp, +15.9 pp] (pairs=63) |
| Device type match (Decisions) | 67.3% [54.1%–78.2%] (n=55) | 78.2% [65.6%–87.1%] (n=55) | +10.9 pp [-1.8 pp, +23.7 pp] (pairs=55) |
| Radio precision | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=7) |
| Radio recall | 100.0% [75.8%–100.0%] (n=12) | 100.0% [75.8%–100.0%] (n=12) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=7) |
| Radio F1 | 100.0% [86.2%–100.0%] (n=12) | 100.0% [86.2%–100.0%] (n=12) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=7) |
| Port F1 | 23.7% [13.5%–38.2%] (n=67) | 38.1% [24.6%–53.8%] (n=51) | +14.4 pp [+2.5 pp, +26.5 pp] (pairs=24) |
| Visible default credentials accuracy | 100.0% [93.5%–100.0%] (n=55) | 100.0% [93.5%–100.0%] (n=55) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=55) |
| Cloud flag accuracy | 88.5% [71.0%–96.0%] (n=26) | 88.5% [71.0%–96.0%] (n=26) | 0.0 pp [-11.5 pp, +11.5 pp] (pairs=26) |
| Physical-area accuracy | 82.3% [71.0%–89.8%] (n=62) | 88.7% [78.5%–94.4%] (n=62) | +6.5 pp [-3.2 pp, +17.7 pp] (pairs=62) |
| Purdue-level accuracy | 94.5% [85.1%–98.1%] (n=55) | 94.5% [85.1%–98.1%] (n=55) | 0.0 pp [-9.1 pp, +9.1 pp] (pairs=55) |
| Never-place violation rate | 5.5% [1.9%–14.9%] (n=55) | 0.0% [0.0%–6.5%] (n=55) | -5.5 pp [-12.7 pp, 0.0 pp] (pairs=55) |
| Expected risk-tag recall | 50.0% [41.3%–58.7%] (n=124) | 71.0% [62.4%–78.2%] (n=124) | +21.0 pp [+12.2 pp, +29.5 pp] (pairs=59) |
| Valid ATT&CK citations | 86.3% [74.3%–93.2%] (n=51) | 100.0% [91.2%–100.0%] (n=40) | +9.7 pp [0.0 pp, +20.0 pp] (pairs=23) |
| Invalid ATT&CK citations | 13.7% [6.8%–25.7%] (n=51) | 0.0% [0.0%–8.8%] (n=40) | -9.7 pp [-20.0 pp, 0.0 pp] (pairs=23) |
| Rule consistency | 85.0% [73.9%–91.9%] (n=60) | 97.1% [90.0%–99.2%] (n=69) | +15.0 pp [+6.7 pp, +25.0 pp] (pairs=60) |
| Placement coverage | 95.2% [86.9%–98.4%] (n=63) | 100.0% [94.3%–100.0%] (n=63) | +4.8 pp [0.0 pp, +11.1 pp] (pairs=63) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 20.0% [3.6%–62.4%] (n=5) | +20.0 pp [0.0 pp, +60.0 pp] (pairs=5) |
| Execution failure rate | 4.2% [1.4%–11.7%] (n=71) | 0.0% [0.0%–5.1%] (n=71) | -4.2 pp [-9.9 pp, 0.0 pp] (pairs=71) |
| Non-devices with invented cyber claims | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Non-device physical-safety coverage | 0.0% [0.0%–32.4%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | +75.0 pp [+50.0 pp, +100.0 pp] (pairs=8) |

## Breakdown by difficulty

### clean (n=30)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [88.6%–100.0%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–11.4%] (n=30) | 0.0% [0.0%–11.4%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Device category accuracy | 83.3% [66.4%–92.7%] (n=30) | 76.7% [59.1%–88.2%] (n=30) | -6.7 pp [-23.3 pp, +10.1 pp] (pairs=30) |
| Physical-kind accuracy | 90.0% [74.4%–96.5%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | +10.0 pp [0.0 pp, +23.3 pp] (pairs=30) |
| Device type match (Decisions) | 63.3% [45.5%–78.1%] (n=30) | 83.3% [66.4%–92.7%] (n=30) | +20.0 pp [+3.3 pp, +36.7 pp] (pairs=30) |
| Radio precision | 100.0% [72.2%–100.0%] (n=10) | 100.0% [72.2%–100.0%] (n=10) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Radio recall | 100.0% [72.2%–100.0%] (n=10) | 100.0% [72.2%–100.0%] (n=10) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Radio F1 | 100.0% [83.9%–100.0%] (n=10) | 100.0% [83.9%–100.0%] (n=10) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Port F1 | 26.9% [14.4%–44.7%] (n=45) | 40.0% [24.2%–58.2%] (n=36) | +13.1 pp [-4.0 pp, +27.7 pp] (pairs=15) |
| Visible default credentials accuracy | 100.0% [88.6%–100.0%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=30) |
| Cloud flag accuracy | 86.7% [62.1%–96.3%] (n=15) | 86.7% [62.1%–96.3%] (n=15) | 0.0 pp [-20.0 pp, +20.0 pp] (pairs=15) |
| Physical-area accuracy | 86.7% [70.3%–94.7%] (n=30) | 93.3% [78.7%–98.2%] (n=30) | +6.7 pp [-10.0 pp, +23.3 pp] (pairs=30) |
| Purdue-level accuracy | 96.7% [83.3%–99.4%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | +3.3 pp [0.0 pp, +10.0 pp] (pairs=30) |
| Never-place violation rate | 3.3% [0.6%–16.7%] (n=30) | 0.0% [0.0%–11.4%] (n=30) | -3.3 pp [-10.0 pp, 0.0 pp] (pairs=30) |
| Expected risk-tag recall | 51.6% [39.4%–63.6%] (n=62) | 71.0% [58.7%–80.8%] (n=62) | +19.4 pp [+6.6 pp, +30.9 pp] (pairs=28) |
| Valid ATT&CK citations | 88.9% [71.9%–96.1%] (n=27) | 100.0% [83.2%–100.0%] (n=19) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=11) |
| Invalid ATT&CK citations | 11.1% [3.9%–28.1%] (n=27) | 0.0% [0.0%–16.8%] (n=19) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=11) |
| Rule consistency | 86.7% [70.3%–94.7%] (n=30) | 100.0% [88.6%–100.0%] (n=30) | +13.3 pp [+3.3 pp, +26.7 pp] (pairs=30) |
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
| End-to-end latency p50 | 13349 ms (n=30) | 22970 ms (n=30) | +9622 ms [+8439 ms, +10991 ms] (pairs=30) |
| End-to-end latency p95 | 17852 ms (n=30) | 35291 ms (n=30) | +17439 ms [+8392 ms, +38244 ms] (pairs=30) |
| Completed assessments, latency p50 / p95 | 13349 ms / 17852 ms (n=30) | 22970 ms / 35291 ms (n=30) | — |
| Recorded Gemini HTTP attempts, total / mean per capture | 30 / 1.00 (n=30) | 124 / 4.13 (n=30) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=30) | 4 / 5 (n=30) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.575 (n=30) | 0.726 (n=30) | +0.151 [+0.075, +0.229] (pairs=30) |

### messy (n=20)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [83.9%–100.0%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–16.1%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Device category accuracy | 90.0% [69.9%–97.2%] (n=20) | 80.0% [58.4%–91.9%] (n=20) | -10.0 pp [-30.0 pp, +10.0 pp] (pairs=20) |
| Physical-kind accuracy | 100.0% [83.9%–100.0%] (n=20) | 95.0% [76.4%–99.1%] (n=20) | -5.0 pp [-15.0 pp, 0.0 pp] (pairs=20) |
| Device type match (Decisions) | 70.0% [48.1%–85.5%] (n=20) | 75.0% [53.1%–88.8%] (n=20) | +5.0 pp [-15.0 pp, +25.0 pp] (pairs=20) |
| Radio precision | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio recall | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 100.0% [34.2%–100.0%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 21.1% [6.4%–51.1%] (n=17) | 37.5% [15.1%–66.9%] (n=13) | +16.4 pp [0.0 pp, +41.7 pp] (pairs=6) |
| Visible default credentials accuracy | 100.0% [83.9%–100.0%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Cloud flag accuracy | 100.0% [67.6%–100.0%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Physical-area accuracy | 80.0% [58.4%–91.9%] (n=20) | 85.0% [64.0%–94.8%] (n=20) | +5.0 pp [-15.0 pp, +25.0 pp] (pairs=20) |
| Purdue-level accuracy | 90.0% [69.9%–97.2%] (n=20) | 85.0% [64.0%–94.8%] (n=20) | -5.0 pp [-25.0 pp, +20.0 pp] (pairs=20) |
| Never-place violation rate | 10.0% [2.8%–30.1%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | -10.0 pp [-25.0 pp, 0.0 pp] (pairs=20) |
| Expected risk-tag recall | 56.4% [41.0%–70.7%] (n=39) | 69.2% [53.6%–81.4%] (n=39) | +12.8 pp [0.0 pp, +25.0 pp] (pairs=19) |
| Valid ATT&CK citations | 92.3% [66.7%–98.6%] (n=13) | 100.0% [78.5%–100.0%] (n=14) | +12.5 pp [0.0 pp, +33.3 pp] (pairs=6) |
| Invalid ATT&CK citations | 7.7% [1.4%–33.3%] (n=13) | 0.0% [0.0%–21.5%] (n=14) | -12.5 pp [-33.3 pp, 0.0 pp] (pairs=6) |
| Rule consistency | 80.0% [58.4%–91.9%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | +20.0 pp [+5.0 pp, +40.0 pp] (pairs=20) |
| Placement coverage | 100.0% [83.9%–100.0%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 0.0% [0.0%–16.1%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 20 | 20 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| System | 20 | 20 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13203 ms (n=20) | 25252 ms (n=20) | +12049 ms [+9562 ms, +14413 ms] (pairs=20) |
| End-to-end latency p95 | 16759 ms (n=20) | 49777 ms (n=20) | +33018 ms [+11108 ms, +43306 ms] (pairs=20) |
| Completed assessments, latency p50 / p95 | 13203 ms / 16759 ms (n=20) | 25252 ms / 49777 ms (n=20) | — |
| Recorded Gemini HTTP attempts, total / mean per capture | 20 / 1.00 (n=20) | 84 / 4.20 (n=20) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=20) | 4 / 5 (n=20) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.609 (n=20) | 0.716 (n=20) | +0.107 [+0.025, +0.193] (pairs=20) |

### edge (n=13)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 100.0% [77.2%–100.0%] (n=13) | 100.0% [77.2%–100.0%] (n=13) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=13) |
| Non-devices classified as devices | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Devices classified as non-devices | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Device category accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Physical-kind accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Device type match (Decisions) | 80.0% [37.6%–96.4%] (n=5) | 60.0% [23.1%–88.2%] (n=5) | -20.0 pp [-60.0 pp, 0.0 pp] (pairs=5) |
| Radio precision | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio recall | 100.0% [20.7%–100.0%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 100.0% [34.2%–100.0%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 0.0% [0.0%–60.6%] (n=5) | 0.0% [0.0%–79.3%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Visible default credentials accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Cloud flag accuracy | 66.7% [20.8%–93.9%] (n=3) | 66.7% [20.8%–93.9%] (n=3) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Physical-area accuracy | 100.0% [51.0%–100.0%] (n=4) | 100.0% [51.0%–100.0%] (n=4) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Purdue-level accuracy | 100.0% [56.6%–100.0%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Never-place violation rate | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Expected risk-tag recall | 37.5% [13.7%–69.4%] (n=8) | 50.0% [21.5%–78.5%] (n=8) | +12.5 pp [0.0 pp, +37.5 pp] (pairs=4) |
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
| End-to-end latency p50 | 9225 ms (n=13) | 17417 ms (n=13) | +8192 ms [+4613 ms, +14112 ms] (pairs=13) |
| End-to-end latency p95 | 14808 ms (n=13) | 24627 ms (n=13) | +9819 ms [+4872 ms, +13857 ms] (pairs=13) |
| Completed assessments, latency p50 / p95 | 12757 ms / 15231 ms (n=5) | 17520 ms / 24891 ms (n=11) | — |
| Recorded Gemini HTTP attempts, total / mean per capture | 13 / 1.00 (n=13) | 49 / 3.77 (n=13) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=13) | 4 / 4.399999999999999 (n=13) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.557 (n=5) | 0.730 (n=5) | +0.174 [-0.041, +0.365] (pairs=5) |

### Product links (n=8)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device vs non-device accuracy | 62.5% [30.6%–86.3%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |
| Non-devices classified as devices | — (n=0) | — (n=0) | — (pairs=0) |
| Devices classified as non-devices | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Device category accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-kind accuracy | 62.5% [30.6%–86.3%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |
| Device type match (Decisions) | — (n=0) | — (n=0) | — (pairs=0) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | — (n=0) | — (n=0) | — (pairs=0) |
| Radio F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Port F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Visible default credentials accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Cloud flag accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-area accuracy | 62.5% [30.6%–86.3%] (n=8) | 75.0% [40.9%–92.9%] (n=8) | +12.5 pp [0.0 pp, +37.5 pp] (pairs=8) |
| Purdue-level accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Never-place violation rate | — (n=0) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 33.3% [15.2%–58.3%] (n=15) | 86.7% [62.1%–96.3%] (n=15) | +53.3 pp [+21.0 pp, +92.9 pp] (pairs=8) |
| Valid ATT&CK citations | 66.7% [30.0%–90.3%] (n=6) | 100.0% [51.0%–100.0%] (n=4) | +25.0 pp [0.0 pp, +50.0 pp] (pairs=3) |
| Invalid ATT&CK citations | 33.3% [9.7%–70.0%] (n=6) | 0.0% [0.0%–49.0%] (n=4) | -25.0 pp [-50.0 pp, 0.0 pp] (pairs=3) |
| Rule consistency | 100.0% [56.6%–100.0%] (n=5) | 75.0% [40.9%–92.9%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Placement coverage | 62.5% [30.6%–86.3%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +37.5 pp [+12.5 pp, +75.0 pp] (pairs=8) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 20.0% [3.6%–62.4%] (n=5) | +20.0 pp [0.0 pp, +60.0 pp] (pairs=5) |
| Execution failure rate | 37.5% [13.7%–69.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | -37.5 pp [-75.0 pp, -12.5 pp] (pairs=8) |
| Non-devices with invented cyber claims | — (n=0) | — (n=0) | — (pairs=0) |
| Non-device physical-safety coverage | — (n=0) | — (n=0) | — (pairs=0) |

| System | Scored | Device / non-device | False device / non-device label | No classification | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 8 | 8 / 0 | 0 / 0 | 3 | 3 / 1 | 0 / 0 | 0 |
| System | 8 | 8 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 15066 ms (n=8) | 25373 ms (n=8) | +10307 ms [+3104 ms, +28427 ms] (pairs=8) |
| End-to-end latency p95 | 38032 ms (n=8) | 38729 ms (n=8) | +696 ms [-16900 ms, +27081 ms] (pairs=8) |
| Completed assessments, latency p50 / p95 | 15480 ms / 22796 ms (n=5) | 25373 ms / 38729 ms (n=8) | — |
| Recorded Gemini HTTP attempts, total / mean per capture | 6 / 0.75 (n=8) | 34 / 4.25 (n=8) | — |
| Recorded Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=8) | 4 / 5 (n=8) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | — (n=0) | — (pairs=0) |

## Where it still fails

### photo-026 · images/photo-026.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Potted plant · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / as dropped FOOD-03 Non-production item in a process area, Foreign material and brittle ceramic contamination / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-002 · images/photo-002.jpg · clean

- Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
- System — networked\_device · Continued / Wireless-G Broadband Router Linksys WRT54GS · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud no / risks wireless, washdown, physical\_port / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.958
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.

### photo-001 · images/photo-001.jpg · messy

- Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Wireless Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, default\_creds, washdown / rule check passed / P(type match) 0.489
- System — networked\_device · Continued / Ubiquiti UniFi Wi-Fi access point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown, physical\_port / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.568
- Baseline perception miss — Label mismatch in device type (P(match) 0.49).
- Baseline risk omission — Missed physical\_port.

### photo-003 · images/photo-003.jpg · edge

- Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
- Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
- System — networked\_device · Continued / Axis 2100 Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.978
- Baseline perception miss — Label mismatch in ports, cloud flag.
- Baseline risk omission — Missed camera\_view, physical\_port.
- System perception miss — Label mismatch in ports, cloud flag.
- System risk omission — Missed physical\_port.

### link-bright-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / link · Could not read this product page.
- System — process\_equipment · Continued / Vertical insulated bright beer tank (BBTVI-2000C) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
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
- System — networked\_device · Continued / Huawei 4G LTE Wi-Fi router · gateway · gateway / corporate\_office / Purdue 4 / never filler3 / radios wifi, cellular / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.622
- Baseline perception miss — Label mismatch in category.

### photo-004 · images/photo-004.jpg · messy

- Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
- Baseline — Device · Continued / IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3 / radios none / ports none / visible defaults no · cloud unknown / ATT&CK T0886 / rule check passed / P(type match) 0.708
- System — networked\_device · Continued / Outdoor IP surveillance camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.831
- Baseline risk omission — Missed camera\_view.
- System wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.

### photo-025 · images/photo-025.jpg · edge

- Expected — Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — Device · Continued / centrifugal pump · rotating\_equipment · pump / utilities / Purdue 0 / never syrup\_room, blending, filler3, washdown, nh3\_hazard / radios none / ports flanged inlet, flanged outlet / visible defaults no · cloud no / risks washdown / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.570
- System — process\_equipment · Continued / Gwynnes pump · rotating\_equipment · pump / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.378
- Baseline perception miss — Label mismatch in ports.
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- System perception miss — Label mismatch in device type (P(match) 0.38).

### link-hygienic-pressure · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
- Baseline — Device · Continued / Hygienic absolute and gauge pressure transmitter · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports 4...20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar...+40 bar / risks washdown / ATT&CK T0856 / rule check passed
- System — electrical\_equipment · Continued / Endress+Hauser Cerabar PMP23 pressure transmitter · instrument · instrument / blending / Purdue 0 / never filler3 / radios none / ports 4-20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar to +40 bar / risks transient, washdown / rule check passed
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0856.
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### photo-028 · images/photo-028.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Coffee mug · other · generic\_device / corporate\_office / never filler3, syrup\_room / radios none / ports none / visible defaults no · cloud no / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Brittle foreign material and personal item contamination / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-006 · images/photo-006.jpg · clean

- Expected — Accept device · Siemens SIMATIC S7-1200 modular PLC assembly · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never parking\_lot, visitor\_corridor, corporate\_office, washdown, nh3\_hazard / radios none / ports Digital Input (DI), Digital Output (DQ), Analog Output (AQ), Expansion Bus / visible defaults no · cloud no / ATT&CK T0843 / rule check passed / P(type match) 0.477
- System — networked\_device · Continued / Siemens SIMATIC S7-1200 CPU 1214C DC/DC/DC PLC with I/O modules · controller · plc\_cabinet / packaging / Purdue 1 / never filler3 / radios none / ports PROFINET/Ethernet / visible defaults no · cloud unknown / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.916
- Baseline perception miss — Label mismatch in device type (P(match) 0.48).
- Baseline risk omission — Missed washdown, physical\_port.

### photo-008 · images/photo-008.jpg · messy

- Expected — Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media
- Baseline — Device · Continued / Laptop computer · computer · laptop / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, visitor\_corridor / radios wifi, bluetooth / ports USB-C power / visible defaults no · cloud yes / risks wireless, transient, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.490
- System — networked\_device · Continued / Lenovo ThinkPad T480 laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0886, T0860 / rule check passed / P(type match) 0.955
- Baseline perception miss — Label mismatch in device type (P(match) 0.49).
- Baseline risk omission — Missed physical\_port, removable\_media.
- System risk omission — Missed physical\_port, removable\_media.

### photo-048 · images/photo-048.jpg · edge

- Expected — Accept device · MAXIMATOR 2500 bar mechanical pressure gauge · instrument · instrument / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks hazardous\_area
- Baseline — Device · Continued / High-pressure analog pressure gauge · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports bottom process connection / visible defaults no · cloud no / size 0-2500 bar / 0-35000+ psi / risks washdown / rule check passed / P(type match) 0.599
- System — process\_equipment · Continued / Maximator Mechanical Pressure Gauge (0-2500 bar) · instrument · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 0-2500 bar / risks washdown / rule check passed / P(type match) 0.969
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### link-indoor-camera · www.axis.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor / risks camera\_view, physical\_port
- Baseline — Device · Continued / IP Dome Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, washdown, parking\_lot, nh3\_hazard / radios none / ports Ethernet (PoE Class 2) / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed
- System — networked\_device · Continued / AXIS M3085-V Dome Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports Ethernet (PoE), memory card slot / visible defaults no · cloud unknown / risks removable\_media, washdown, physical\_port, camera\_view / ATT&CK T0882 / rule check passed
- Baseline risk omission — Missed camera\_view, physical\_port.

### photo-029 · images/photo-029.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Arabic document · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-007 · images/photo-007.jpg · clean

- Expected — Accept device · Siemens SIMATIC OP77B keypad operator panel · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RS-485, RS-232, USB-A, MMC / visible defaults no / cloud no / risks physical\_port, removable\_media, washdown
- Baseline — Device · Continued / Operator Panel HMI · hmi · hmi / control\_room / Purdue 2 / never nh3\_hazard, washdown, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0855 / rule check passed / P(type match) 0.446
- System — electrical\_equipment · Continued / Siemens SIMATIC HMI operator panel · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.432
- Baseline perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.45).
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- Baseline risk omission — Missed physical\_port, removable\_media.
- System perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.43).
- System risk omission — Missed physical\_port, removable\_media.

### photo-011 · images/photo-011.jpg · messy

- Expected — Accept device · Cisco Catalyst 4006 rack-mount Ethernet switch · network · network\_switch / areas corporate\_office, control\_room / Purdue 2, 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port
- Baseline — Device · Continued / Modular Ethernet Switch · network · network\_switch / control\_room / Purdue 3 / never washdown, nh3\_hazard, visitor\_corridor / radios none / ports 48x 10/100 BASE-T RJ45 per module / visible defaults no · cloud no / size 48 ports per line card / risks washdown, physical\_port / rule check passed / P(type match) 0.571
- System — networked\_device · Continued / Cisco WS-X4148-RJ 48-port 10/100 BASE-T Ethernet switching module · network · network\_switch / control\_room / Purdue 3 / never filler3 / radios none / ports RJ45 (48x 10/100 BASE-T) / visible defaults no · cloud unknown / size 48 ports / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.407
- System perception miss — Label mismatch in device type (P(match) 0.41).

### text-01 · Text capture · edge

- Expected — Accept device · contractor service laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / visible defaults no / risks transient, remote\_access
- Baseline — Device · Continued / OEM technician laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks wireless, removable\_media, transient / ATT&CK T0886, T0847 / rule check passed / P(type match) 0.403
- System — networked\_device · Continued / OEM technician laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0864 / rule check passed / P(type match) 0.403
- Baseline perception miss — Label mismatch in device type (P(match) 0.40).
- Baseline risk omission — Missed remote\_access.
- System perception miss — Label mismatch in device type (P(match) 0.40).
- System risk omission — Missed remote\_access.

### link-lte-gateway · teltonika.gnshk.com · links

- Expected — Accept device · gateway / areas control\_room / size 74.5 x 25 x 64.4 mm / risks wireless, remote\_access, cloud, physical\_port
- Baseline — Device · Continued / Industrial Cellular LTE Gateway · gateway · gateway / control\_room / Purdue 3.5 / never washdown, nh3\_hazard, visitor\_corridor / radios cellular / ports 1 x Gigabit Ethernet (RJ45), 1 x Micro USB (virtual network interface), 1 x SMA (LTE antenna), 1 x 4-pin industrial DC power socket (with 1 x Digital Input, 1 x Digital Output), 1 x Mini SIM slot (2FF) / visible defaults yes · cloud yes / size 74.5 x 25 x 64.4 mm, 136 g / risks wireless, default\_creds, cloud, washdown, physical\_port / ATT&CK T0812, T0822 / rule check passed
- System — networked\_device · Continued / Industrial 4G LTE Gateway (Teltonika Networks TRB140) · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports Ethernet, micro USB, 4-pin DC power, SMA, Mini SIM / visible defaults yes · cloud yes / size 74.5 x 25 x 64.4 mm, 136 g / risks wireless, default\_creds, cloud, washdown, physical\_port / ATT&CK T0883, T1694.001 / rule check passed
- Baseline perception miss — Label mismatch in capacity or size.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed remote\_access.
- System perception miss — Label mismatch in capacity or size.
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
- System — networked\_device · Continued / Apple iPhone smartphone · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth, cellular, nfc / ports none / visible defaults no · cloud yes / risks wireless, cloud, transient, washdown, camera\_view / ATT&CK T0864, T0860, T0886 / rule check passed / P(type match) 0.646
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.40).
- Baseline risk omission — Missed cloud, physical\_port, camera\_view.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-017 · images/photo-017.jpg · messy

- Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
- Baseline — Device · Continued / Smart electric utility meter · instrument · instrument / parking\_lot / Purdue 5 / never nh3\_hazard, filler3, washdown, control\_room / radios none / ports optical / visible defaults no · cloud unknown / size CL200 (200A) / risks transient / rule check passed / P(type match) 0.668
- System — networked\_device · Continued / Itron OpenWay Centron smart electric meter (C2SOD)}{"error":"invalid"} · instrument · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports optical / visible defaults no · cloud unknown / size CL200 (200A) / risks wireless, transient, washdown / rule check passed / P(type match) 0.906
- Baseline wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.
- Baseline risk omission — Missed wireless.

### text-08 · Text capture · edge

- Expected — Accept device · Teltonika TRB140 industrial LTE gateway · gateway · gateway / areas control\_room / Purdue 3.5 / forbidden packaging, water\_treatment, syrup\_room, blending, utilities, filler3, washdown, nh3\_hazard / radios cellular / visible defaults no / risks wireless, remote\_access, physical\_port
- Baseline — Device · Continued / Industrial LTE Gateway · gateway · gateway / control\_room / Purdue 3.5 / never packaging, visitor\_corridor / radios cellular / ports none / visible defaults no · cloud yes / risks wireless, default\_creds, remote\_access / ATT&CK T0886, T0812 / rule check passed / P(type match) 0.629
- System — networked\_device · Continued / Teltonika TRB140 LTE gateway · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports Ethernet / visible defaults no · cloud yes / risks wireless, cloud, washdown, physical\_port / ATT&CK T0883 / rule check passed / P(type match) 0.922
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed physical\_port.
- System risk omission — Missed remote\_access.

### link-mixing-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
- Baseline — No classification · No gate answer / baseline · The baseline stage timed out.
- System — process\_equipment · Continued / Agitated mixing tank (MXTP-2000MG) · vessel · agitated\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L (1200 x 1200 x 2100 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- Baseline timeout — baseline · The baseline stage timed out.
- System perception miss — Label mismatch in capacity or size.
- System wrong zone — Recommended packaging at Purdue 0, outside the labeled placements.
- System rule conflict — No clear footprint or valid network location for the recommendation.

### photo-052 · images/photo-052.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Wooden armchair · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / risks washdown / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area, Foreign material and microbial harborage / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-010 · images/photo-010.jpg · clean

- Expected — Accept device · Apple iPad first-generation Wi-Fi tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth / ports 30-pin dock, 3.5 mm audio jack / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Device · Continued / tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never nh3\_hazard, filler3, washdown / radios wifi, bluetooth / ports 30-pin dock connector, 3.5mm audio jack / visible defaults no · cloud yes / risks wireless, cloud, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.583
- System — networked\_device · Continued / Apple iPad tablet · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.772
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in category, ports.
- System risk omission — Missed physical\_port.

### photo-018 · images/photo-018.jpg · messy

- Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Stainless steel jacketed vertical tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 150 Hls (15,000 L) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.349
- System — process\_equipment · Continued / Vertical stainless steel process tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 150 Hls / risks washdown / rule check passed / P(type match) 0.431
- Baseline perception miss — Label mismatch in device type (P(match) 0.35).
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- System perception miss — Label mismatch in device type (P(match) 0.43).
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
- System — passive\_object · Continued / Cardboard box · other · generic\_device / corporate\_office / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / as dropped FOOD-02 Foreign-material risk near open product, FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-012 · images/photo-012.jpg · clean

- Expected — Accept device · Honeywell 4600g wired handheld barcode imager · sensor · generic\_device / areas packaging, corporate\_office / Purdue 1, 2, 4 / forbidden filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks physical\_port, transient
- Baseline — Device · Continued / Handheld barcode scanner · other · generic\_device / packaging / Purdue 2 / never nh3\_hazard, filler3, washdown, visitor\_corridor / radios none / ports USB Type-A / visible defaults no · cloud no / risks washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.592
- System — electrical\_equipment · Continued / Wired handheld barcode scanner · other · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media, washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.755
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed transient.
- System perception miss — Label mismatch in category.
- System risk omission — Missed transient.

### photo-020 · images/photo-020.jpg · messy

- Expected — Accept device · Western Digital My Passport Ultra portable external hard drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB 3.0 Micro-B / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / Portable External Hard Drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3, nh3\_hazard / radios none / ports USB 3.0 / visible defaults no · cloud no / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.592
- System — electrical\_equipment · Continued / WD My Passport Ultra portable external hard drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3 / radios none / ports USB 3.0 / visible defaults no · cloud no / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.976
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-054 · images/photo-054.jpg · edge

- Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable.
- Baseline — Non-device · Stopped
- System — passive\_object · Continued / Traffic cone · other · generic\_device / parking\_lot / never filler3, washdown / radios none / ports none / visible defaults no · cloud no / size 750 mm / as dropped FOOD-03 Non-production item in a process area / rule check passed
- Baseline physical-safety omission — No as-dropped physical or food-safety concern for filler3. The baseline declined assessment.

### photo-013 · images/photo-013.jpg · clean

- Expected — Accept device · Rosemount pressure transmitter with local display · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area, washdown
- Baseline — Device · Continued / Pressure transmitter · instrument · instrument / nh3\_hazard / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud no / risks hazardous\_area / ATT&CK T0831 / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.542
- System — electrical\_equipment · Continued / Rosemount 3051 / 3001 Pressure Transmitter · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.765
- Baseline perception miss — Label mismatch in category.
- Baseline wrong zone — Recommended forbidden area nh3\_hazard.
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- Baseline risk omission — Missed washdown.
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-022 · images/photo-022.jpg · messy

- Expected — Accept device · wired industrial electrical control cabinet · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / Industrial electrical control cabinet (MCC / relay panel) · controller · plc\_cabinet / utilities / Purdue 1 / never filler3, nh3\_hazard, visitor\_corridor, corporate\_office / radios none / ports none / visible defaults no · cloud no / risks washdown / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.904
- System — electrical\_equipment · Continued / Electrical control and distribution panel · other · generic\_device / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.643
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in category, physical kind.
- System risk omission — Missed physical\_port.

### link-serial-gateway · www.moxa.com · links

- Expected — Accept device · gateway / areas water\_treatment, syrup\_room, blending, packaging, utilities / size 22 x 52 x 80 mm / risks physical\_port, washdown
- Baseline — No classification · No gate answer / link · Could not read this product page.
- System — networked\_device · Continued / Modbus TCP Gateway (Moxa MGate MB3180) · gateway · gateway / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports Ethernet, Serial (1-port Modbus RTU/ASCII/TCP gateway port / visible defaults no · cloud unknown / size 22 x 52 x 80 mm (without ears), 340 g / risks transient, washdown, physical\_port / rule check passed
- Baseline product link retrieval — link · Could not read this product page.
- System perception miss — Label mismatch in capacity or size.

### photo-014 · images/photo-014.jpg · clean

- Expected — Accept device · cabled float level switch for an open tank · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Float switch (liquid level switch) with counterweight · sensor · instrument / water\_treatment / Purdue 0 / never nh3\_hazard, syrup\_room, corporate\_office / radios none / ports Hardwired 3-core cable / visible defaults no · cloud no / risks hazardous\_area, washdown / rule check passed / P(type match) 0.733
- System — electrical\_equipment · Continued / Float switch · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.497
- Baseline perception miss — Label mismatch in ports.
- System perception miss — Label mismatch in category, device type (P(match) 0.50).
- System risk omission — Missed hazardous\_area.

### photo-023 · images/photo-023.jpg · messy

- Expected — Accept device · Siemens SIMATIC NET ESM TP80 industrial Ethernet switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, DB9 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Industrial Ethernet switch · network · network\_switch / packaging / Purdue 1 / never washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports 8x RJ45 Ethernet (Port 1-8), 1x V24 DB9, 1x Standby DB9, Power terminal block (L1/L2), Input/signaling terminal blocks (I1-I8) / visible defaults no · cloud no / risks washdown, physical\_port / rule check passed / P(type match) 0.642
- System — networked\_device · Continued / Industrial Ethernet switch (Siemens ESM TP80) · network · network\_switch / control\_room / Purdue 2 / never filler3 / radios none / ports 8x RJ45 Ethernet (Ports 1-8), V24 (DB9 serial), Standby (DB9), Power and I/O terminal blocks / visible defaults no · cloud no / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.951
- Baseline perception miss — Label mismatch in ports.
- System perception miss — Label mismatch in ports.

### photo-015 · images/photo-015.jpg · clean

- Expected — Accept device · three-wire Pt100 RTD temperature probe · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Pt100 RTD Temperature Sensor · sensor · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports 3-wire flying leads / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.815
- System — electrical\_equipment · Continued / Pt100 RTD temperature sensor · sensor · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / rule check passed / P(type match) 0.761
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### photo-032 · images/photo-032.jpg · messy

- Expected — Accept device · Siemens SIMATIC S7-300 wired PLC panel · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — Device · Continued / PLC · controller · plc\_cabinet / filler3 / Purdue 1 / never corporate\_office, parking\_lot, visitor\_corridor / radios none / ports PROFIBUS DP, MPI / visible defaults no · cloud no / risks washdown / ATT&CK T0843 / blocked (WASH-01 Washdown or food-contact design gap) / P(type match) 0.388
- System — networked\_device · Continued / Siemens SIMATIC S7-300 PLC (CPU 314C-2 DP) · controller · plc\_cabinet / packaging / Purdue 1 / never filler3, nh3\_hazard / radios none / ports MPI, PROFIBUS DP / visible defaults no · cloud no / risks transient, washdown / rule check passed / P(type match) 0.807
- Baseline perception miss — Label mismatch in device type (P(match) 0.39).
- Baseline wrong zone — Recommended forbidden area filler3.
- Baseline rule conflict — WASH-01 Washdown or food-contact design gap
- Baseline risk omission — Missed physical\_port.
- System risk omission — Missed physical\_port.

### photo-016 · images/photo-016.jpg · clean

- Expected — Accept device · Coriolis mass flow meter · instrument · instrument / areas water\_treatment, utilities, blending, syrup\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Coriolis mass flowmeter sensor · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports 2x process fluid connections, 1x internal sensor/coil electrical interface / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.558
- System — process\_equipment · Continued / Coriolis mass flow meter sensor · instrument · instrument / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.654
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### photo-035 · images/photo-035.jpg · messy

- Expected — Accept device · wall-mounted fixed barcode price-check scanner · sensor · generic\_device / areas corporate\_office, packaging / Purdue 2, 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — Device · Continued / Barcode price checker / article scanner terminal · other · generic\_device / packaging / Purdue 2 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0846 / rule check passed / P(type match) 0.844
- System — networked\_device · Continued / Scantech ID Discovery barcode price checker · other · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.893
- Baseline perception miss — Label mismatch in category.
- System perception miss — Label mismatch in category.

### photo-019 · images/photo-019.jpg · clean

- Expected — Accept device · SanDisk Cruzer Titanium USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3 / radios none / ports USB-A / visible defaults no · cloud no / size 8 GB / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.610
- System — electrical\_equipment · Continued / SanDisk Cruzer Titanium 8 GB USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB-A / visible defaults no · cloud no / size 8 GB / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.945
- Baseline risk omission — Missed transient, physical\_port.
- System risk omission — Missed physical\_port.

### photo-036 · images/photo-036.jpg · messy

- Expected — Accept device · process tank level sensor · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Industrial level transmitter · sensor · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, control\_room / radios none / ports cable\_gland / visible defaults no · cloud no / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.676
- System — electrical\_equipment · Continued / Flanged level transmitter · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.738
- Baseline risk omission — Missed hazardous\_area.
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-021 · images/photo-021.jpg · clean

- Expected — Accept device · industrial pushbutton operator station · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown
- Baseline — Device · Continued / Industrial control panel · controller · plc\_cabinet / utilities / Purdue 1 / never filler3, washdown, nh3\_hazard, corporate\_office / radios none / ports none / visible defaults no · cloud unknown / size 760 x 760 x 210 mm / risks washdown / ATT&CK T0859 / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.461
- System — electrical\_equipment · Continued / Industrial pushbutton control panel · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.928
- Baseline perception miss — Label mismatch in category, physical kind, device type (P(match) 0.46).
- Baseline wrong zone — Recommended utilities at Purdue 1, outside the labeled placements.
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified

### photo-040 · images/photo-040.jpg · messy

- Expected — Accept device · installed refrigerant flow meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area
- Baseline — Device · Continued / Industrial process transmitter · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud no / ATT&CK T0836 / rule check passed / P(type match) 0.088
- System — electrical\_equipment · Continued / Process flow transmitter · instrument · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.132
- Baseline perception miss — Label mismatch in device type (P(match) 0.09).
- Baseline risk omission — Missed hazardous\_area.
- System perception miss — Label mismatch in device type (P(match) 0.13).
- System risk omission — Missed hazardous\_area.

### photo-024 · images/photo-024.jpg · clean

- Expected — Accept device · plate-and-frame heat exchanger · machine · heat\_exchanger / areas water\_treatment, blending, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Plate Heat Exchanger · other · heat\_exchanger / utilities / Purdue 0 / never corporate\_office, control\_room, visitor\_corridor / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.669
- System — process\_equipment · Continued / Plate heat exchanger · machine · heat\_exchanger / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.743
- Baseline perception miss — Label mismatch in category.

### photo-047 · images/photo-047.jpg · messy

- Expected — Accept device · manual quarter-turn shutoff valve · valve · valve / areas water\_treatment, utilities, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Manual ball valve (1" DN25) · valve · valve / utilities / Purdue 0 / never syrup\_room, nh3\_hazard / radios none / ports 1" threaded pipe connection / visible defaults no · cloud no / size 1" / DN25 / risks hazardous\_area, washdown / rule check passed / P(type match) 0.854
- System — process\_equipment · Continued / Manual ball valve · valve · valve / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 1" / DN25 / risks washdown / rule check passed / P(type match) 0.775
- Baseline perception miss — Label mismatch in ports.

### photo-031 · images/photo-031.jpg · clean

- Expected — Accept device · Teltonika TRM240 and TRM250 industrial cellular modems · gateway · gateway / areas control\_room, corporate\_office / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios cellular / ports microUSB, SMA, SIM / visible defaults no / risks wireless, physical\_port
- Baseline — Device · Continued / Industrial cellular modem · gateway · gateway / control\_room / Purdue 3.5 / never filler3, nh3\_hazard, visitor\_corridor, water\_treatment / radios cellular / ports SMA antenna connector / visible defaults no · cloud yes / risks wireless, hazardous\_area, washdown / ATT&CK T0822 / rule check passed / P(type match) 0.727
- System — networked\_device · Continued / Cellular modem (Teltonika TRM250) · gateway · gateway / control\_room / Purdue 3.5 / never filler3 / radios cellular / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860 / rule check passed / P(type match) 0.809
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-049 · images/photo-049.jpg · messy

- Expected — Accept device · Lantronix ETS32PR serial-to-Ethernet console server · gateway · gateway / areas control\_room, corporate\_office / Purdue 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, AUI / visible defaults no / risks physical\_port, remote\_access
- Baseline — Device · Continued / 32-port serial-to-Ethernet terminal server · network · gateway / control\_room / Purdue 3 / never filler3, nh3\_hazard, parking\_lot, corporate\_office / radios none / ports 32x RJ45 serial, 1x RJ45 Ethernet, 1x DB15/DB9 port / visible defaults no · cloud no / size 1U rackmount, 32 ports / ATT&CK T0886 / rule check passed / P(type match) 0.808
- System — networked\_device · Continued / Lantronix ETS32P 32-port terminal server · gateway · gateway / control\_room / Purdue 2 / never filler3 / radios none / ports RJ45, DB15 / visible defaults no · cloud unknown / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.898
- Baseline perception miss — Label mismatch in category, ports.
- Baseline risk omission — Missed physical\_port, remote\_access.
- System perception miss — Label mismatch in ports.
- System wrong zone — Recommended control\_room at Purdue 2, outside the labeled placements.
- System risk omission — Missed remote\_access.

### photo-033 · images/photo-033.jpg · clean

- Expected — Accept device · Siemens SIMATIC ET 200S PROFINET remote I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Programmable Logic Controller (PLC) · controller · plc\_cabinet / packaging / Purdue 1 / never corporate\_office, parking\_lot, washdown, nh3\_hazard / radios none / ports RJ45 PROFINET (X1 P3), 2x RJ45 PROFINET (BA 2xRJ45), SIMATIC Memory Card slot (X50), 24VDC power terminal / visible defaults no · cloud no / risks washdown / ATT&CK T0843 / rule check passed / P(type match) 0.173
- System — networked\_device · Continued / Siemens SIMATIC ET 200SP CPU 1510SP-1 PN PLC · controller · plc\_cabinet / water\_treatment / Purdue 1 / never filler3 / radios none / ports RJ45 (PROFINET LAN X1 P3, P1R, P2R) / visible defaults no · cloud unknown / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.222
- Baseline perception miss — Label mismatch in device type (P(match) 0.17).
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.22).

### photo-050 · images/photo-050.jpg · messy

- Expected — Accept device · Ring video doorbell surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / cloud yes / risks wireless, cloud, camera\_view
- Baseline — Device · Continued / smart video doorbell · camera · ip\_camera / parking\_lot / Purdue 5 / never control\_room, filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud yes / risks wireless, cloud, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.741
- System — networked\_device · Continued / Ring Video Doorbell · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults no · cloud yes / risks wireless, cloud, washdown, camera\_view / ATT&CK T0883, T0860, T0886 / rule check passed / P(type match) 0.897
- Baseline wrong zone — Recommended parking\_lot at Purdue 5, outside the labeled placements.
- Baseline risk omission — Missed camera\_view.
- System wrong zone — Recommended visitor\_corridor at Purdue 4, outside the labeled placements.

### photo-034 · images/photo-034.jpg · clean

- Expected — Accept device · WAGO 750-series modular industrial I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks physical\_port, washdown
- Baseline — Device · Continued / Programmable Logic Controller (PLC) - PFC200 · controller · plc\_cabinet / packaging / Purdue 1 / never washdown, nh3\_hazard, visitor\_corridor, corporate\_office / radios none / ports 2x RJ45 Ethernet (X1, X2), 1x DB9 RS-232/485 (X3), SD card slot / visible defaults no · cloud unknown / risks default\_creds, removable\_media, washdown / ATT&CK T0858 / rule check passed / P(type match) 0.471
- System — networked\_device · Continued / WAGO 750-8212 PFC200 Controller · controller · plc\_cabinet / water\_treatment / Purdue 1 / never filler3, nh3\_hazard / radios none / ports Ethernet (RJ45) x2, RS-232/485 (DB9) / visible defaults no · cloud unknown / risks removable\_media, transient, washdown, physical\_port / ATT&CK T0847 / rule check passed / P(type match) 0.808
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
- System — process\_equipment · Continued / Electric-actuated butterfly valve · valve · valve / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.941
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- System risk omission — Missed hazardous\_area.

### text-03 · Text capture · messy

- Expected — Accept device · hygienic vibrating-fork point level switch · sensor · instrument / areas water\_treatment, syrup\_room, blending, filler3, washdown, utilities / Purdue 0 / forbidden nh3\_hazard / radios none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Vibronic high level switch · sensor · instrument / filler3 / Purdue 0 / never nh3\_hazard, corporate\_office, parking\_lot / radios none / ports 24V hard-wired I/O / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.559
- System — electrical\_equipment · Continued / Hygienic vibronic high-level switch · instrument · instrument / filler3 / Purdue 0 / never nh3\_hazard / radios none / ports none / visible defaults no · cloud no / rule check passed / P(type match) 0.762
- System perception miss — Label mismatch in category.
- System risk omission — Missed washdown.

### photo-038 · images/photo-038.jpg · clean

- Expected — Accept device · SanDisk Cruzer Blade USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3, nh3\_hazard / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.692
- System — electrical\_equipment · Continued / SanDisk Cruzer Blade USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media, transient, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.970
- Baseline risk omission — Missed transient, physical\_port.
- System risk omission — Missed physical\_port.

### text-06 · Text capture · messy

- Expected — Accept device · USB-A flash drive with service files · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Device · Continued / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never packaging, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media / ATT&CK T0847, T0843 / rule check passed / P(type match) 0.509
- System — electrical\_equipment · Continued / USB-A flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never filler3 / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.442
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in device type (P(match) 0.44).
- System risk omission — Missed transient, physical\_port.

### text-07 · Text capture · messy

- Expected — Accept device · Bluetooth handheld barcode scanner · sensor · generic\_device / areas packaging / Purdue 1, 2 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Device · Continued / Bluetooth barcode scanner · sensor · generic\_device / packaging / Purdue 2 / never nh3\_hazard, washdown / radios bluetooth / ports USB / visible defaults no · cloud unknown / risks wireless, transient / blocked (RF-01 Wireless within untrusted reach) / P(type match) 0.841
- System — networked\_device · Continued / Bluetooth barcode scanner · sensor · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios bluetooth / ports USB / visible defaults no · cloud no / risks wireless, washdown, physical\_port / ATT&CK T0860 / rule check passed / P(type match) 0.841
- Baseline rule conflict — RF-01 Wireless within untrusted reach
- Baseline risk omission — Missed physical\_port.
- System wrong zone — Recommended corporate\_office at Purdue 4, outside the labeled placements.
- System risk omission — Missed transient.

### photo-041 · images/photo-041.jpg · clean

- Expected — Accept device · cable-suspended float level switch · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Float level switch · sensor · instrument / water\_treatment / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports hardwired cable / visible defaults no · cloud no / rule check passed / P(type match) 0.480
- System — electrical\_equipment · Continued / Float level switch · instrument · instrument / water\_treatment / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.480
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.48).
- Baseline risk omission — Missed washdown.
- System perception miss — Label mismatch in category, device type (P(match) 0.48).

### photo-042 · images/photo-042.jpg · clean

- Expected — Accept device · platinum resistance thermometer calibration probes · sensor · instrument / areas utilities, control\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports Info-Con / visible defaults no / cloud no / risks transient, physical\_port
- Baseline — Device · Continued / RTD temperature probe · sensor · instrument / blending / Purdue 0 / never visitor\_corridor, nh3\_hazard / radios none / ports LEMO circular connector / visible defaults no · cloud no / risks washdown / ATT&CK T0831 / rule check passed / P(type match) 0.556
- System — electrical\_equipment · Continued / Hart Scientific 5615 PRT temperature probe · sensor · instrument / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports circular push-pull connector / visible defaults no · cloud no / risks transient, washdown / rule check passed / P(type match) 0.907
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed transient, physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed physical\_port.

### photo-043 · images/photo-043.jpg · clean

- Expected — Accept device · Rotronic temperature and humidity probe · sensor · instrument / areas utilities, control\_room, corporate\_office, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — Device · Continued / environmental sensor probe · sensor · instrument / packaging / Purdue 0 / never filler3, nh3\_hazard, syrup\_room, corporate\_office / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.305
- System — electrical\_equipment · Continued / Temperature and humidity probe · sensor · instrument / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.796
- Baseline perception miss — Label mismatch in device type (P(match) 0.31).

### photo-044 · images/photo-044.jpg · clean

- Expected — Accept device · Apple iPad sixth-generation tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / ports Lightning, 3.5 mm audio jack / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — Device · Continued / Tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, washdown / radios wifi, bluetooth / ports none / visible defaults no · cloud unknown / risks wireless, cloud, washdown / ATT&CK T0822 / rule check passed / P(type match) 0.529
- System — networked\_device · Continued / Apple iPad tablet · phone · phone / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, transient, washdown, camera\_view / ATT&CK T0864, T0860, T0886 / rule check passed / P(type match) 0.738
- Baseline perception miss — Label mismatch in physical kind, ports, cloud flag.
- Baseline risk omission — Missed transient, physical\_port, camera\_view.
- System perception miss — Label mismatch in category, ports.
- System risk omission — Missed physical\_port.

### photo-045 · images/photo-045.jpg · clean

- Expected — Accept device · Raspberry Pi 4 Model B single-board computer · computer · generic\_device / areas corporate\_office, control\_room, crew\_office / Purdue 3, 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios wifi, bluetooth / ports RJ45, USB-A, USB-C, micro HDMI, microSD, GPIO, MIPI CSI, MIPI DSI, 3.5 mm A/V jack / visible defaults no / risks wireless, removable\_media, physical\_port
- Baseline — Device · Continued / Single-board computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment, visitor\_corridor / radios wifi, bluetooth / ports Ethernet, 2x USB 3.0, 2x USB 2.0, 2x micro-HDMI, USB-C (Power In), 3.5mm A/V, 40-pin GPIO, CSI Camera, DSI Display, PoE header / visible defaults no · cloud unknown / risks wireless, removable\_media, washdown / ATT&CK T0848, T0847 / rule check passed / P(type match) 0.220
- System — networked\_device · Continued / Single-board computer (Raspberry Pi 4 Model B) · computer · generic\_device / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth / ports Ethernet, USB 3.0, USB 2.0, USB-C (Power), Micro-HDMI, 3.5mm A/V, GPIO, DSI (Display), CSI (Camera), PoE header / visible defaults no · cloud unknown / risks wireless, transient, washdown, physical\_port / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.964
- Baseline perception miss — Label mismatch in ports, device type (P(match) 0.22).
- Baseline risk omission — Missed physical\_port.
- System perception miss — Label mismatch in ports.
- System risk omission — Missed removable\_media.

### photo-046 · images/photo-046.jpg · clean

- Expected — Accept device · Rosemount temperature transmitter and thermowell · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Industrial Temperature Transmitter / RTD Sensor Assembly · sensor · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports 1x threaded electrical conduit entry / visible defaults no · cloud no / risks hazardous\_area, washdown / ATT&CK T0836 / rule check passed / P(type match) 0.762
- System — electrical\_equipment · Continued / Rosemount temperature sensor and transmitter assembly · instrument · instrument / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.576
- System perception miss — Label mismatch in category.
- System risk omission — Missed hazardous\_area.

### photo-051 · images/photo-051.jpg · clean

- Expected — Accept device · KSB Etanorm centrifugal pump and variable-frequency drive · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0, 1 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Device · Continued / Centrifugal pump with motor-mounted VFD · rotating\_equipment · pump / utilities / Purdue 0 / never syrup\_room, filler3, corporate\_office / radios none / ports flanged suction/discharge, cable glands / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.690
- System — process\_equipment · Continued / Centrifugal pump with motor-mounted variable frequency drive · rotating\_equipment · pump / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks washdown / rule check passed / P(type match) 0.757
- Baseline rule conflict — HAZ-01 Ammonia-area rating unverified
- Baseline risk omission — Missed hazardous\_area.
- System risk omission — Missed hazardous\_area.

### text-04 · Text capture · clean

- Expected — Accept device · wired Modbus serial-to-Ethernet gateway · gateway · gateway / areas packaging / Purdue 1 / forbidden filler3, washdown, nh3\_hazard / radios none / ports RS-485, RJ45 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — Device · Continued / Serial-to-Ethernet Modbus Gateway · gateway · gateway / packaging / Purdue 1 / never nh3\_hazard, washdown, parking\_lot, corporate\_office / radios none / ports RS485, RJ45 / visible defaults no · cloud no / size Small DIN box / risks default\_creds, physical\_port / ATT&CK T0855 / rule check passed / P(type match) 0.930
- System — networked\_device · Continued / Modbus serial-to-Ethernet gateway · gateway · gateway / packaging / Purdue 1 / never filler3 / radios none / ports RS485, RJ45 / visible defaults no · cloud no / risks transient, washdown, physical\_port / rule check passed / P(type match) 0.805
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0855.
- Baseline risk omission — Missed washdown.

### text-05 · Text capture · clean

- Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Device · Continued / Vertical jacketed stainless steel buffer tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume, 3 bar rated / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.456
- System — process\_equipment · Continued / Vertical jacketed stainless steel tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume / risks washdown / rule check passed / P(type match) 0.237
- Baseline perception miss — Label mismatch in device type (P(match) 0.46).
- Baseline rule conflict — No clear footprint or valid network location for the recommendation.
- System perception miss — Label mismatch in device type (P(match) 0.24).
- System wrong zone — Recommended utilities at Purdue 0, outside the labeled placements.

### text-09 · Text capture · clean

- Expected — Accept device · mechanical compressed-air pressure gauge · instrument · instrument / areas utilities / Purdue 0 / forbidden washdown, filler3, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — Device · Continued / Mechanical Pressure Gauge · instrument · instrument / utilities / Purdue 0 / never nh3\_hazard, corporate\_office / radios none / ports none / visible defaults no · cloud no / size 0-10 bar / rule check passed / P(type match) 0.215
- System — process\_equipment · Continued / Dial pressure gauge (0-10 bar) · instrument · instrument / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 0-10 bar / risks washdown / rule check passed / P(type match) 0.551
- Baseline perception miss — Label mismatch in device type (P(match) 0.21).
- System wrong zone — Recommended water\_treatment at Purdue 0, outside the labeled placements.

## Device type judgments

| Item | Labeled type | Baseline P(match) | System P(match) |
| --- | --- | ---: | ---: |
| photo-002 | Linksys Wireless-G broadband router | 0.894 | 0.958 |
| photo-001 | Ubiquiti UniFi AC Lite access point | 0.489 | 0.568 |
| photo-003 | AXIS 2100 network webcam | 0.582 | 0.978 |
| photo-005 | Huawei 4G+ desktop cellular modem router | 0.607 | 0.622 |
| photo-004 | outdoor Axis network surveillance camera | 0.708 | 0.831 |
| photo-025 | historic Gwynnes centrifugal waterworks pump | 0.570 | 0.378 |
| photo-006 | Siemens SIMATIC S7-1200 modular PLC assembly | 0.477 | 0.916 |
| photo-008 | Lenovo ThinkPad T480 laptop | 0.490 | 0.955 |
| photo-048 | MAXIMATOR 2500 bar mechanical pressure gauge | 0.599 | 0.969 |
| photo-007 | Siemens SIMATIC OP77B keypad operator panel | 0.446 | 0.432 |
| photo-011 | Cisco Catalyst 4006 rack-mount Ethernet switch | 0.571 | 0.407 |
| text-01 | contractor service laptop | 0.403 | 0.403 |
| photo-009 | Apple iPhone 15 smartphone | 0.397 | 0.646 |
| photo-017 | Itron OpenWay digital smart electricity meter | 0.668 | 0.906 |
| text-08 | Teltonika TRB140 industrial LTE gateway | 0.629 | 0.922 |
| photo-010 | Apple iPad first-generation Wi-Fi tablet | 0.583 | 0.772 |
| photo-018 | vertical stainless steel fermentation tank | 0.349 | 0.431 |
| photo-012 | Honeywell 4600g wired handheld barcode imager | 0.592 | 0.755 |
| photo-020 | Western Digital My Passport Ultra portable external hard drive | 0.592 | 0.976 |
| photo-013 | Rosemount pressure transmitter with local display | 0.542 | 0.765 |
| photo-022 | wired industrial electrical control cabinet | 0.904 | 0.643 |
| photo-014 | cabled float level switch for an open tank | 0.733 | 0.497 |
| photo-023 | Siemens SIMATIC NET ESM TP80 industrial Ethernet switch | 0.642 | 0.951 |
| photo-015 | three-wire Pt100 RTD temperature probe | 0.815 | 0.761 |
| photo-032 | Siemens SIMATIC S7-300 wired PLC panel | 0.388 | 0.807 |
| photo-016 | Coriolis mass flow meter | 0.558 | 0.654 |
| photo-035 | wall-mounted fixed barcode price-check scanner | 0.844 | 0.893 |
| photo-019 | SanDisk Cruzer Titanium USB flash drive | 0.610 | 0.945 |
| photo-036 | process tank level sensor | 0.676 | 0.738 |
| photo-021 | industrial pushbutton operator station | 0.461 | 0.928 |
| photo-040 | installed refrigerant flow meter | 0.088 | 0.132 |
| photo-024 | plate-and-frame heat exchanger | 0.669 | 0.743 |
| photo-047 | manual quarter-turn shutoff valve | 0.854 | 0.775 |
| photo-031 | Teltonika TRM240 and TRM250 industrial cellular modems | 0.727 | 0.809 |
| photo-049 | Lantronix ETS32PR serial-to-Ethernet console server | 0.808 | 0.898 |
| photo-033 | Siemens SIMATIC ET 200S PROFINET remote I/O station | 0.173 | 0.222 |
| photo-050 | Ring video doorbell surveillance camera | 0.741 | 0.897 |
| photo-034 | WAGO 750-series modular industrial I/O station | 0.471 | 0.808 |
| text-02 | consumer Wi-Fi cloud surveillance camera | 0.468 | 0.468 |
| photo-037 | electrically actuated butterfly valve | 0.941 | 0.941 |
| text-03 | hygienic vibrating-fork point level switch | 0.559 | 0.762 |
| photo-038 | SanDisk Cruzer Blade USB flash drive | 0.692 | 0.970 |
| text-06 | USB-A flash drive with service files | 0.509 | 0.442 |
| photo-039 | industrial Ethernet and fibre switch | 0.718 | 0.824 |
| text-07 | Bluetooth handheld barcode scanner | 0.841 | 0.841 |
| photo-041 | cable-suspended float level switch | 0.480 | 0.480 |
| photo-042 | platinum resistance thermometer calibration probes | 0.556 | 0.907 |
| photo-043 | Rotronic temperature and humidity probe | 0.305 | 0.796 |
| photo-044 | Apple iPad sixth-generation tablet | 0.529 | 0.738 |
| photo-045 | Raspberry Pi 4 Model B single-board computer | 0.220 | 0.964 |
| photo-046 | Rosemount temperature transmitter and thermowell | 0.762 | 0.576 |
| photo-051 | KSB Etanorm centrifugal pump and variable-frequency drive | 0.690 | 0.757 |
| text-04 | wired Modbus serial-to-Ethernet gateway | 0.930 | 0.805 |
| text-05 | vertical stainless steel carbonated beverage buffer tank | 0.456 | 0.237 |
| text-09 | mechanical compressed-air pressure gauge | 0.215 | 0.551 |

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
