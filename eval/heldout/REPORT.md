# Pyre Witness held-out evaluation

Run `heldout-1` began 2026-11-21T21:45:23.097Z. Latest saved receipt 2026-11-21T21:47:12.089Z. Workers 6.

Pipeline source SHA-256 `dc5d05dad7696e32b0f73afcb58f0a7740c9b8df7af57f1f75764961f82b0cd6`. Dataset SHA-256 `55018add30f920decd82a06da76ba61286824ce1094b4ecda216ac68d26fd25d` covers labels, metadata and capture payloads. Product-link payloads record URLs. Each side fetches the live page through its own adapter.

Baseline uses `gemini-4-hydrogen`. Pyre Witness uses `gemini-decision-1`, `gemini-4-hydrogen`, `gemini-4-carbon` and `gemini-4-neon`. Blinded type judging uses `gemini-decision-1`. Thinking levels perception low, reasoning low, chief low.

Baseline contract `original-output-v1` **matches**. Prompt SHA-256 `a2647ff2dfafb3dd1cb774783c66e748c0ffb59637c7c8b1b328ab07456e8457`. Response schema SHA-256 `f65c7d9c62d09f0c4fd8a45e9c022bba169cdba384549ccdbbb47d6b99c2879e`. Both sides use fresh predictions for the held-out captures. Resume reads receipts from this run only.

- run-4 manifests list `original-output-v1`. Published donor run-3-baseline (`original-output-v1`). Check matches.
- run-5 manifests list `original-output-v1`. Published donor run-3-baseline (`original-output-v1`). Check matches.

**Plant context differs.** The baseline plant description also includes the seed plant name, which changed from Bebidas del Norte to North Beverage Facility. Both held-out sides use the current seed.

20 of 20 captures selected. 20 have receipts from both sides and 20 were answered by both. A deliberate rejection is an answer. Sample sizes are small and significance calls are exploratory at the 5% level, without adjustment for multiple comparisons.

## Shared-answer scores

Rates show Wilson 95% intervals. Risk and radio denominators count labeled tags or radios, which can be correlated within an item. A missing prediction counts as a miss where the metric allows it. Forbidden placements and offline rule checks require a recommendation. Rule consistency uses the stored offline placement verdict against the seed. The naming score requires applicable judgments for both returned names. Quality differences are Pyre Witness minus Hydrogen. Latency includes all measured attempts and excludes the type judge. Paired bootstrap resamples captures 2,000 times.

| Metric | Single-call Hydrogen [95% CI] | Pyre Witness [95% CI] | Paired result |
| --- | --- | --- | --- |
| Plant area accuracy | 88.9% [67.2%–96.9%] (n=18), 16/18 | 83.3% [60.8%–94.2%] (n=18), 15/18 | p=1.00 (pairs=18) · Inconclusive |
| Equipment kind accuracy | 72.2% [49.1%–87.5%] (n=18), 13/18 | 77.8% [54.8%–91.0%] (n=18), 14/18 | p=1.00 (pairs=18) · Inconclusive |
| Purdue level accuracy | 85.7% [60.1%–96.0%] (n=14), 12/14 | 78.6% [52.4%–92.4%] (n=14), 11/14 | -7.1 pp [-28.6 pp, +14.3 pp] (pairs=14) · Inconclusive |
| Device vs non-device accuracy | 100.0% [83.9%–100.0%] (n=20), 20/20 | 100.0% [83.9%–100.0%] (n=20), 20/20 | 0.0 pp [0.0 pp, 0.0 pp] (pairs=20) · Inconclusive |
| Key-risk recall | 40.8% [28.2%–54.8%] (n=49), 20/49 | 61.2% [47.2%–73.6%] (n=49), 30/49 | +20.4 pp [+8.3 pp, +34.0 pp] (pairs=18) · Significant |
| Forbidden-area recommendations | 0.0% [0.0%–21.5%] (n=14), 0/14 | 0.0% [0.0%–21.5%] (n=14), 0/14 | p=1.00 (pairs=14) · Inconclusive |
| Radio recall | 80.0% [37.6%–96.4%] (n=5), 4/5 | 100.0% [56.6%–100.0%] (n=5), 5/5 | +20.0 pp [0.0 pp, +50.0 pp] (pairs=3) · Inconclusive |
| Cloud flag accuracy | 92.3% [66.7%–98.6%] (n=13), 12/13 | 76.9% [49.7%–91.8%] (n=13), 10/13 | -15.4 pp [-38.5 pp, 0.0 pp] (pairs=13) · Inconclusive |
| Device category accuracy | 71.4% [45.4%–88.3%] (n=14), 10/14 | 78.6% [52.4%–92.4%] (n=14), 11/14 | +7.1 pp [-14.3 pp, +28.6 pp] (pairs=14) · Inconclusive |
| Device-type naming match | 57.1% [32.6%–78.6%] (n=14), 8/14 | 92.9% [68.5%–98.7%] (n=14), 13/14 | +35.7 pp [+14.3 pp, +64.3 pp] (pairs=14) · Significant |
| Offline rules-engine pass rate | 83.3% [60.8%–94.2%] (n=18), 15/18 | 100.0% [83.9%–100.0%] (n=20), 20/20 | +16.7 pp [0.0 pp, +33.3 pp] (pairs=18) · Inconclusive |
| Median time per capture | 12.08 s (n=20) | 26.03 s (n=20) | 13.95 s [10.95, 17.20] (pairs=20) · Significant |
| p95 time per capture | 18.22 s (n=20) | 34.24 s (n=20) | 16.02 s [12.45, 40.04] (pairs=20) · Significant |

### Run 5 paired tests

Exact McNemar uses two-sided p-values. A positive outcome means a correct area or kind, or a forbidden placement for the safety test.

| Metric | Scope | Pairs | Both positive | Hydrogen only | Pyre Witness only | Neither | p-value |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Plant area accuracy | Shared answers | 18 | 14 | 2 | 1 | 1 | p=1.00 |
| Plant area accuracy | Completed pairs | 18 | 14 | 2 | 1 | 1 | p=1.00 |
| Equipment kind accuracy | Shared answers | 18 | 13 | 0 | 1 | 4 | p=1.00 |
| Equipment kind accuracy | Completed pairs | 18 | 13 | 0 | 1 | 4 | p=1.00 |
| Forbidden-area recommendations | Shared answers | 14 | 0 | 0 | 0 | 14 | p=1.00 |
| Forbidden-area recommendations | Completed pairs | 14 | 0 | 0 | 0 | 14 | p=1.00 |

Key-risk recall difference on all completed pairs +20.4 pp [+8.3 pp, +34.0 pp] (pairs=18) · Significant.

## Hardest inputs

A pass requires a usable result matching labeled kind and placement, or correct non-device handling. Buckets are disjoint. Each side's pass rate includes its saved execution errors. Pending attempts are excluded.

| Input bucket | Selected | Hydrogen pass rate [95% CI] | Pyre Witness pass rate [95% CI] |
| --- | ---: | --- | --- |
| Clean | 4 | 50.0% [15.0%–85.0%] (n=4), 2/4 | 50.0% [15.0%–85.0%] (n=4), 2/4 |
| Messy | 5 | 60.0% [23.1%–88.2%] (n=5), 3/5 | 40.0% [11.8%–76.9%] (n=5), 2/5 |
| Edge | 2 | 0.0% [0.0%–65.8%] (n=2), 0/2 | 100.0% [34.2%–100.0%] (n=2), 2/2 |
| Non-devices | 2 | 100.0% [34.2%–100.0%] (n=2), 2/2 | 100.0% [34.2%–100.0%] (n=2), 2/2 |
| Links | 4 | 100.0% [51.0%–100.0%] (n=4), 4/4 | 75.0% [30.1%–95.4%] (n=4), 3/4 |
| Text | 3 | 66.7% [20.8%–93.9%] (n=3), 2/3 | 66.7% [20.8%–93.9%] (n=3), 2/3 |

## Item results

| ID | Input | Difficulty | Hydrogen | Pyre Witness | Reason |
| --- | --- | --- | --- | --- | --- |
| `ho-photo-05` | photo | clean | Pass | Pass | Handled non-device correctly |
| `ho-photo-01` | photo | clean | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-04` | photo | messy | Fail | Fail | Equipment kind missed |
| `ho-photo-12` | photo | edge | Fail | Pass | Hydrogen — Purdue level missed. Pyre Witness — Matched applicable kind and placement labels. |
| `ho-link-01` | link | — | Pass | Fail | Hydrogen — Matched applicable kind and placement labels. Pyre Witness — Plant area missed. |
| `ho-photo-11` | photo | edge | Pass | Pass | Handled non-device correctly |
| `ho-photo-02` | photo | clean | Fail | Fail | Equipment kind missed |
| `ho-photo-06` | photo | messy | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-13` | photo | edge | Fail | Pass | Hydrogen — Equipment kind missed. Pyre Witness — Matched applicable kind and placement labels. |
| `ho-link-02` | link | — | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-03` | photo | clean | Fail | Fail | Equipment kind missed |
| `ho-photo-07` | photo | messy | Pass | Pass | Matched applicable kind and placement labels |
| `ho-text-03` | text | edge | Fail | Pass | Hydrogen — Plant area missed. Pyre Witness — Matched applicable kind and placement labels. |
| `ho-link-03` | link | — | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-10` | photo | clean | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-08` | photo | messy | Pass | Fail | Hydrogen — Matched applicable kind and placement labels. Pyre Witness — Purdue level missed. |
| `ho-link-04` | link | — | Pass | Pass | Matched applicable kind and placement labels |
| `ho-photo-09` | photo | messy | Fail | Fail | Equipment kind missed |
| `ho-text-01` | text | messy | Pass | Fail | Hydrogen — Matched applicable kind and placement labels. Pyre Witness — Plant area missed. |
| `ho-text-02` | text | messy | Pass | Pass | Matched applicable kind and placement labels |

## Execution and judge coverage

| Side | Saved attempts | Pending | Errors | Timeouts | Missing judge answers | Judge pending | Gemini HTTP attempts | HTTP 429s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Hydrogen | 20 | 0 | 0 | 0 | 0 | 0 | 20 | 0 |
| Pyre Witness | 20 | 0 | 0 | 0 | 0 | 0 | 83 | 0 |

Type judge saved 14 attempts, with 0 errors and 0 timeouts.

## Run 5 development-set reference

Run 5 had 68/71 shared answers and used 4 baseline workers and 4 system workers. The development and held-out sets use separate captures and run conditions. The columns are descriptive across sets. [Archived Run 5 report](../report/run-5/REPORT.md)

| Metric | Held-out Hydrogen | Held-out Pyre Witness | Run 5 Hydrogen | Run 5 Pyre Witness |
| --- | --- | --- | --- | --- |
| Plant area accuracy | 88.9% [67.2%–96.9%] (n=18), 16/18 | 83.3% [60.8%–94.2%] (n=18), 15/18 | 86.4% [75.5%–93.0%] (n=59), 51/59 | 91.5% [81.6%–96.3%] (n=59), 54/59 |
| Equipment kind accuracy | 72.2% [49.1%–87.5%] (n=18), 13/18 | 77.8% [54.8%–91.0%] (n=18), 14/18 | 95.0% [86.3%–98.3%] (n=60), 57/60 | 98.3% [91.1%–99.7%] (n=60), 59/60 |
| Purdue level accuracy | 85.7% [60.1%–96.0%] (n=14), 12/14 | 78.6% [52.4%–92.4%] (n=14), 11/14 | 94.5% [85.1%–98.1%] (n=55), 52/55 | 94.5% [85.1%–98.1%] (n=55), 52/55 |
| Device vs non-device accuracy | 100.0% [83.9%–100.0%] (n=20), 20/20 | 100.0% [83.9%–100.0%] (n=20), 20/20 | 100.0% [94.7%–100.0%] (n=68), 68/68 | 100.0% [94.7%–100.0%] (n=68), 68/68 |
| Key-risk recall | 40.8% [28.2%–54.8%] (n=49), 20/49 | 61.2% [47.2%–73.6%] (n=49), 30/49 | 51.7% [42.8%–60.4%] (n=120), 62/120 | 70.0% [61.3%–77.5%] (n=120), 84/120 |
| Forbidden-area recommendations | 0.0% [0.0%–21.5%] (n=14), 0/14 | 0.0% [0.0%–21.5%] (n=14), 0/14 | 5.5% [1.9%–14.9%] (n=55), 3/55 | 0.0% [0.0%–6.5%] (n=55), 0/55 |
| Radio recall | 80.0% [37.6%–96.4%] (n=5), 4/5 | 100.0% [56.6%–100.0%] (n=5), 5/5 | 100.0% [75.8%–100.0%] (n=12), 12/12 | 100.0% [75.8%–100.0%] (n=12), 12/12 |
| Cloud flag accuracy | 92.3% [66.7%–98.6%] (n=13), 12/13 | 76.9% [49.7%–91.8%] (n=13), 10/13 | 88.5% [71.0%–96.0%] (n=26), 23/26 | 88.5% [71.0%–96.0%] (n=26), 23/26 |
| Device category accuracy | 71.4% [45.4%–88.3%] (n=14), 10/14 | 78.6% [52.4%–92.4%] (n=14), 11/14 | 87.3% [76.0%–93.7%] (n=55), 48/55 | 80.0% [67.6%–88.4%] (n=55), 44/55 |
| Device-type naming match | 57.1% [32.6%–78.6%] (n=14), 8/14 | 92.9% [68.5%–98.7%] (n=14), 13/14 | 67.3% [54.1%–78.2%] (n=55), 37/55 | 78.2% [65.6%–87.1%] (n=55), 43/55 |
| Offline rules-engine pass rate | 83.3% [60.8%–94.2%] (n=18), 15/18 | 100.0% [83.9%–100.0%] (n=20), 20/20 | 85.0% [73.9%–91.9%] (n=60), 51/60 | 100.0% [94.5%–100.0%] (n=66), 66/66 |
| Median time per capture | 12.08 s (n=20) | 26.03 s (n=20) | 13.28 s (n=71) | 23.30 s (n=71) |
| p95 time per capture | 18.22 s (n=20) | 34.24 s (n=20) | 18.39 s (n=71) | 41.98 s (n=71) |
