# Held-out evaluation

The 71-item development set informed every pipeline change through Run 5. This set tests Pyre Witness on 20 captures that no pipeline change was tuned on.

## What was built

| Path | What |
| --- | --- |
| `eval/heldout/dataset/` | 20 new labelled captures: 13 Wikimedia Commons photos (4 clean, 5 messy, 2 edge, 2 non-devices: a hard hat and safety goggles), 3 hurried free-text descriptions, 4 manufacturer product links. Sources and licences are in `SOURCES.md` |
| `eval/heldout/run.ts`, `ledger.ts`, `pairing.ts`, `contract.ts`, `report.ts`, `runner.test.ts` | Isolated runner. Reuses the main harness's adapters and Run 5 scoring (`rescoreSystem`, McNemar, paired bootstrap). Raw receipts go to git-ignored `eval/runs/heldout/<label>/`. It never writes to `eval/report/**` or changes `/proof` |
| `eval/heldout/REPORT.md`, `results.json` | Generated report for run `heldout-1` |

Two Codex agents (`gpt-6.2-sol`, ultrafast tier, medium reasoning) built the set and the runner in parallel. The orchestrator reviewed both before any run.

## Procedure

1. A curator agent collected and labelled the items from images, Commons descriptions and manufacturer documentation. It made no Gemini call and saw no model output.
2. Before the run, the orchestrator compared labels with dev-set conventions and changed two things (recorded in `SOURCES.md`). The contactor and drive panels (`ho-photo-02`, `-03`, `-09`) accept Purdue `0;1` instead of `1`. The drone (`ho-photo-12`) moved from Purdue `5` to `4` and also accepts `corporate_office`.
3. One run, `heldout-1`, on Nov 21, 2026 at 16:45 EST. Both sides ran fresh at 6 workers: single-call `gemini-4-hydrogen` with the Run 4/5 baseline contract `original-output-v1`, and the full pipeline. No label or code changed after the run.

## Results (`eval/heldout/REPORT.md`)

20/20 answered by both sides, 0 errors, 0 timeouts, 0 HTTP 429s.

| Metric | Single-call Hydrogen | Pyre Witness | Paired result |
| --- | ---: | ---: | --- |
| Key-risk recall | 40.8% (20/49) | 61.2% (30/49) | **+20.4 pp, significant** [+8.3, +34.0] |
| Device-type naming (blinded judge) | 57.1% (8/14) | 92.9% (13/14) | **+35.7 pp, significant** [+14.3, +64.3] |
| Offline rules-engine pass rate | 83.3% (15/18) | 100.0% (20/20) | +16.7 pp, inconclusive |
| Forbidden-area recommendations | 0/14 | 0/14 | Tie |
| Device vs non-device | 20/20 | 20/20 | Tie |
| Plant area accuracy | 88.9% (16/18) | 83.3% (15/18) | Inconclusive, Hydrogen ahead |
| Purdue level accuracy | 85.7% (12/14) | 78.6% (11/14) | Inconclusive, Hydrogen ahead |
| Equipment kind accuracy | 72.2% (13/18) | 77.8% (14/18) | Inconclusive |
| Cloud flag accuracy | 92.3% (12/13) | 76.9% (10/13) | Inconclusive, Hydrogen ahead |
| Case pass (kind + placement) | 13/20 | 13/20 | Tie. Pyre Witness 3/3 on edge items, Hydrogen 0/3 |
| Median / p95 time | 12.1 s / 18.2 s | 26.0 s / 34.2 s | Significantly slower |

**What held up on unseen data:** the key-risk recall gain (+18.3 pp on the dev set, +20.4 pp here, both significant) and 100% rules-engine-consistent recommendations. Naming improved significantly.

**What did not:** placement accuracy is no better than the single call here. Hydrogen is ahead, inconclusively, on area, Purdue level and cloud flags. Equipment kind fell for both sides (dev set 95–98%), mostly on contactor and drive panels labelled `plc_cabinet`.

## Sensitivity to the pre-run relabel (measured after the run)

The drone relabel changed that item's outcome. Hydrogen answered `parking_lot` / Purdue 5, which matches the curator's original label. Pyre Witness answered `corporate_office` / Purdue 4, which matches the reviewed label. Under the curator's original labels:

- Case pass: Hydrogen 14/20, Pyre Witness 12/20 (instead of 13/13)
- Plant area: Hydrogen 16/18, Pyre Witness 14/18
- Purdue level: Hydrogen 11/14, Pyre Witness 8/14 (both sides answered Purdue 0 on the two contactors)

Key-risk recall, naming, rules-engine pass rate, forbidden placements and latency do not depend on these labels and are unchanged.

## Verify

```bash
npx tsx eval/heldout/run.ts --label heldout-1 --report-only
```

That rebuilds the report from saved receipts with no API call. The runner's tests are in `eval/heldout/runner.test.ts`. Re-running live needs `--env-file=.env` and a new `--label`.

## Known gaps

- n = 20. Only key-risk recall, naming and latency differences are significant. Nothing is adjusted for multiple comparisons.
- One labeller (an AI agent) plus one reviewer, with no inter-rater agreement measured. The drone and panel labels are judgment calls, as the sensitivity section shows.
- Product links are fetched live, so page changes can alter future reruns.
- The baseline's plant description now carries the renamed plant ("North Beverage Facility"). Both sides use the same current seed.
- `README.md`, `docs/JUDGES.md` and `docs/OVERVIEW.md` now include these results. The `/proof` page and the generated `eval/report/**` files still describe the development set only.
