# Pyre Witness evaluation runs

## Run 5 connectivity and risk ordering

Run 5 is gated to 15:25 EST or later on November 21, 2026. It collects the system side at four workers and joins the saved fair Hydrogen receipts, including existing naming judgments. The launch manifest records a pipeline source SHA-256 separately from the fingerprint that also covers the collector, dataset, twin and model settings.

Collection started at 15:25:14 EST with pipeline source SHA-256 `a12a09a4a5276acdd7205cc25c819c54a887cc3f988fc4585da44f23f168048f`. The collector recorded the hash in the Run 5 manifest.

```sh
test "$(date +%H%M)" -ge 1525 && PW_REASONING_THINKING=low npm run eval -- --label run-5 --only system --concurrency 4 --collect-only
npx tsx eval/snapshot.ts --label run-5 --baseline run-3-baseline
```

Scoring continues to use Scout’s published profile and the final assessment shown in the results panel. The delta table keeps all matching capture receipts and a common cohort answered by both system versions and Hydrogen. Scout p50 and p95 use the stage latency in each `perception.done` event, including validation and connectivity enrichment. Matched timings use captures with both stage measurements. Run 4 used six workers. The execution conditions differ from Run 5. [Scout gap diagnosis](perception-gap.md)

The collector now cancels and drains its active workers before restoring the HTTP meter on an infrastructure error. That preserves the measurement boundary on interrupted runs. Run 4’s incomplete HTTP counters stay unavailable for cost deltas. The comparison uses request traces as a separate measure.

Run 5 finished at 15:32:44 EST with 69 assessments, two rejections and zero execution errors. The common three-way answered cohort contains 66 captures. Radio recall rose from 4/12 to 12/12, cloud flag accuracy from 6/26 to 23/26, and naming agreement from 33/54 to 42/54. Category accuracy fell from 44/54 to 43/54. Capacity or size match fell from 2/5 to 1/5 across all attempts. Completed-assessment p95 rose by 598 ms across all attempts and request traces rose by 0.14 per capture. Scout p50 and p95 across all published profiles were 5,927 ms and 8,128 ms, versus 6,775 ms and 10,834 ms in Run 4. [Run 5 report](../../eval/report/run-5/REPORT.md) · [Six-line summary](../../eval/report/run-5/SUMMARY.md)

The pipeline and collection fingerprints matched launch. All 71 baseline verdicts and saved naming judgments matched Run 4. The independent report check reproduced all six exact McNemar probabilities and verified 43 delta rows. Typecheck and all 20 eval tests passed, and the validator confirmed the 71 inputs. Chromium rendered `/proof` at both desktop sizes and opened the full delta table with all 43 rows.

## Deterministic pipeline evidence and Run 4 preparation

The proof strip measures the as-dropped and final recommendations from the same saved captures. Run 3 recorded 37 distinct displayed rules-engine paths across 71 captures (0.52 per capture, in four captures with paths). It recorded 147 completed rule checks across 69 checked captures (2.07 checks per attempted capture, 2 ms median per check, 6 ms median summed per checked capture). Fourteen distinct rule IDs triggered. The receipts do not count every rule invocation. The strip states that these results come from one development set used for iteration and that a held-out set remains unevaluated.

The Run 4 freeze marker was observed at 18:54:43 UTC. The results panel takes the final assessment from `summary.started.assessment`. The system scorer uses that assessment, including the merged final risk list, and falls back to the last reasoning or revision assessment for archived receipts. The Scout equipment-kind field, shared risk matcher, baseline request, saved baseline outputs and saved baseline judgments retain their original scoring. [Pipeline field handoff](../../.agents/requests/pipeline-speed.md)

Re-scoring the saved Run 3 receipts yielded the original rates. On shared answers, equipment kind remained 52/60 and key-risk recall remained 54/120. On all attempts they remained 55/63 and 57/124. Citation validity remained 23/23, with zero invalid citations. The comparison verifies that the baseline receipt objects pass through the re-scorer unchanged.

```sh
PW_REASONING_THINKING=low npm run eval -- --label run-4 --only system --concurrency 6 --collect-only
npx tsx eval/snapshot.ts --label run-4 --baseline run-3-baseline
```

The first collector reached a full disk while saving a receipt. The process was interrupted with 36 system outcomes saved. A `--resume` invocation at 18:59:48 UTC reused those outcomes at the same launch fingerprint `4b065705238b851c4bfcc5bd782b2343947b3f0c0c547bd5309d7c5867427e17`. The failed write interrupted the HTTP meter before some otherwise usable outcomes finished. We retain their captured outputs and latency. The report distinguishes the incomplete HTTP counter from the independent model request traces.

Run 4 recorded all 71 captures, with 66 shared answers, two system errors and four gate fallbacks. Equipment-kind accuracy on shared answers rose from 52/60 to 57/58 and key-risk recall from 54/120 to 69/118. All-attempt area accuracy fell from 57/62 to 51/62 and tied the baseline. Pyre Witness had zero labeled forbidden placements versus three for the baseline on 54 applicable shared answers. Run 4 recorded 46 displayed deterministic paths and 142 rule checks at 14 ms median per check. The scorer audit reproduces the Run 3 rates exactly, and all 71 saved baseline answers and judgments match the previous fair report. [Run 4 report](../../eval/report/run-4/REPORT.md) · [Six-line summary](../../eval/report/run-4/SUMMARY.md)

The final check reproduced all six exact paired probabilities, matched reported risk tags to all 67 displayed final assessments, and verified the original launch fingerprint. The HTTP counter is shorter than the independent request trace on five captures. Typecheck, all 18 eval tests and validation of 71 inputs passed. Chromium verified `/proof` at 1440×900 and 1920×1080 with eight decoded images, no horizontal overflow and no page errors.

## Fresh baseline for Run 3

The historical baseline’s 48 errors comprise 46 completed, parseable model answers rejected by local length caps, one product-page retrieval failure before a Gemini call, and one unclassified Gemini request error. There were zero recorded timeouts or HTTP 429s and no confirmed safety blocks. The transmitted schema omitted those length caps. Revalidating with the caps removed accepts all 46 affected responses without dropping or rewriting fields. [Receipt diagnosis](../../eval/report/FAILURES.md)

The fresh baseline uses the archived first-run instructions, capture formatting, prose plant description and provider response schema. Request payloads matched the archived baseline byte for byte in an offline same-input check. The baseline keeps a single Hydrogen interaction at low thinking. It shares Scout’s 45 s deadline including retries, up to three transport attempts on transients, and Retry-After with 250/500 ms backoff and jitter. The evaluator also shares its HTTP 429 cooldown. Product pages are fetched afresh with the original 18 s retrieval budget.

```sh
npm run eval -- --only baseline --label run-3-baseline --concurrency 4 --collect-only
npx tsx eval/snapshot.ts --label run-3 --baseline run-3-baseline
```

The publisher pairs receipts by capture fingerprint and identical dataset labels, reports all attempts and answers shared by both systems, and runs a two-sided exact McNemar test on area-labeled shared answers. A deliberate usability stop is an answer. Unsafe placements use explicitly forbidden areas from the labels. The offline rule-consistency replay uses the same evaluator for both recommendations. The rules-driven revision count comes from recorded Run 3 events and applies to Pyre Witness alone.

The system receipts retain Run 3 launch fingerprint `01d37b5672ec97b6bfff64b68540eec29ebf63c37deb68adc48779e283543229`. The readable tags, hold state, virtual-area exclusion and Chief verdict changes landed later. This comparison collected only the fresh baseline. The original Run 3 and overloaded-run baseline receipts and the Run 1 archive are preserved. [Original Run 3 provenance](../../eval/report/run-3/BASELINE_PROVENANCE.md)

The fresh baseline finished in 4.1 minutes with 71 recorded attempts and 68 answers. Two product pages failed retrieval before a model call, and one product-link inference reached the 45 s deadline. There were zero fresh schema errors. On the 59 shared area labels Hydrogen scored 51/59 and Pyre Witness 55/59. The exact paired test gives p=0.344. Hydrogen led on equipment kind, radio recall, cloud flags and risk-tag recall. Pyre Witness gave zero recommendations in explicitly forbidden areas on the 55 applicable shared cases, versus three for Hydrogen. The archived pipeline triggered seven revisions in 66 checked shared answers and nine in 69 total checks. [Six-line summary](../../eval/report/SUMMARY.md) · [Full paired report](../../eval/report/REPORT.md)

Typecheck, all 17 evaluation tests and dataset validation passed. The published case outputs match all 71 archived system answers on classification, kind, area, level, risk tags and device-type judgment. An independent binomial calculation reproduced McNemar p=0.34375. Chromium displayed the fresh paired headline, the historical timeline footnote and all six first-screen cards at 1440×900 and 1920×1080.

## Judge overview and photo ablation

`/proof` opens with paired area-accuracy bars, denominators and Wilson intervals, calls and latency, six input groups, three photographed failure examples, the hardest correct and missed captures, the iteration timeline, and the photo-versus-text comparison. The latest report supplies the measurements. The bars show all attempts and completed responses side by side. Deliberate usability stops count as completed responses. The Filler 3 safety result is asymmetric because the baseline saw plant prose and declined non-devices.

The six disjoint input buckets contain 27 clean photos, 16 messy photos, three edge-device photos, eight non-device photos, eight product links and nine text captures. The 54 existing Commons photos were taken independently. The app links the [dataset sources and licences](../../eval/dataset/SOURCES.md). The difficulty chart requires matching the labeled equipment kind and placement or correct non-device handling. Edge cases rank first. Ties prefer photos, then stable capture IDs.

`--modality-ablation` uses each of the 46 labeled device photos from the main run. It runs the same system once more on just the short device label as one line. Radio, port and credential-flag recovery uses known labels. Material, rating and evidence scores count reported fields. The rules comparison uses the as-dropped pass or hold verdict and reports how many pairs have two verdicts. Absolute rates have Wilson intervals and modality differences and evidence counts have paired bootstrap intervals. Both variants are saved in the attempt ledger and text-only costs are reported separately.

Run 3 requires the orchestrator’s `.agents/pipeline-frozen` file. The command uses six workers and the verified historical baseline. The snapshot publishes the saved receipts after collection.

```sh
PW_REASONING_THINKING=low npm run eval -- --label run-3 --concurrency 6 --reuse-baseline run-1 --modality-ablation --collect-only
npx tsx eval/snapshot.ts --label run-3
```

## Run 3 measured result

The freeze marker appeared at 18:15 UTC on November 21, 2026. Run 3 started at 18:15:30 UTC and recorded all 71 baseline/system pairs and 46 eligible photo/text pairs in 9 min 12 s. The system returned 69 assessments, including all 63 labeled device placements and six passive objects. It stopped two unusable non-device captures. It logged zero execution errors, timeouts or gate fallbacks on the 71 main captures. Run 2 had 34/71 execution errors, including 21 gate-stage errors, at eight workers. Run 3 used six workers, so this comparison measures the changed pipeline and workload together.

Area accuracy rose from Run 2’s 29/62 to Run 3’s 57/62 (91.9%, Wilson 95% CI 82.5%–96.5%). The reused Hydrogen baseline scored 12/62 (19.4%, 11.4%–30.9%) overall and 12/15 (80.0%, 54.8%–93.0%) on completed area-labeled responses. Of 48 historical baseline errors, 46 were invalid or incomplete structured responses. Run 3 system p50/p95 was 26.0/50.1 s across all attempts and 26.2/51.3 s across assessments returned. The baseline used 0.99 actual HTTP attempts per capture and took 13.0/20.4 s at p50/p95. Run 3 used 4.17 attempts per capture. The six assessed non-devices each surfaced a physical or food-safety concern. None of the eight negative captures had published cyber claims.

The leading system diagnoses were risk omissions (48 cases), perception misses (47), and wrong zones (7). A router assessment missed the labeled physical-port risk. The AXIS 2100 webcam reached a labeled area and Purdue level but missed its expected RJ45 and RS-232 ports. The fermentation tank went to utilities, outside its labeled areas. The difficulty chart credited 3/3 device edge cases (43.9%–100.0%), 12/16 messy photos, and 6/8 links under its placement pass criteria.

Photos yielded a material report on 29/46 captures versus 1/46 from the labeled one-line description (+60.9 percentage points, paired 95% CI +45.7 to +73.9). Mean evidence items were 2.52 versus 1.00. Exact port lists matched 9/24 versus 7/24, and exact radio lists matched 22/27 versus 24/27. The 46 credential labels all mark no visible defaults. The as-dropped rules verdict agreed on 42/46 pairs (91.3%, 79.7%–96.6%). Two text runs timed out in reasoning after returning perception and the early rules verdict. The text arm used 190 separate HTTP attempts.

All 71 reused baseline artifacts and input fingerprints match their donor receipts. The three Run 1 report archives retained their original SHA-256 digests. The collector imported the pipeline at launch. Pipeline files in the shared workspace changed after import, starting at 18:16:26 UTC, and the current fingerprint differs from the launch fingerprint. The published outcomes describe the loaded launch version.

`npm run typecheck`, `npx vitest run eval --maxWorkers=1` (14 tests), and `npx tsx eval/validate.ts` (71 captures) passed. Chromium verified the six Run 3 cards and eight decoded images in the first viewport at 1440×900 and 1920×1080, with zero horizontal overflow and browser errors. The credits route returned the source notes. An unknown image ID returned HTTP 404. [Run 3 report](../../eval/report/run-3/REPORT.md) · [Run 3 JSON](../../eval/report/run-3/latest.json) · [Run 3 failure analysis](../../eval/report/run-3/FAILURES.md)

## Run 2 measured result

Run 2 completed all 71 pairs on November 21, 2026 in 3 min 39 s. The system returned 35 assessments, including 32 device placements and three passive-object placements. It stopped two unusable captures and had 34 execution errors. Those included 17 gate request failures, four gate timeouts, six perception request failures, six product-link retrieval failures, and one reasoning timeout. The console recorded transient fetch failures and zero HTTP 429 responses across the run.

Across all 71 captures, system p50/p95 to a result or error was 23.5/37.0 s. Completed assessments took 27.3/36.8 s at p50/p95 (n=35). Run 2 made 260 system HTTP attempts. The reused baseline made 70 historical requests, with p50/p95 of 13.0/20.4 s. The fresh baseline cost for Run 2 was zero.

On the 67 shared captures, system timeouts fell from 59 to four and physical-area accuracy rose from 0/58 to 27/58. Run 1's 59 timeouts reached the 120-second Carbon deadline. All 67 Run 1 system attempts ended in errors. On the 59 shared equipment-kind labels, the system returned 58 profiles in Run 1 and 29 in Run 2. Kind accuracy among returned profiles was 89.7% in both runs, with 52/58 and 26/29 correct respectively.

Of the eight non-devices, Run 2 placed the flower pot, mug, and framed document and surfaced a food-contact concern on each. It stopped the defocused and landscape captures as unusable. Three other non-device captures ended in gate errors. No published structured cyber claims were detected in the negative cohort. The main remaining diagnoses were missing expected risk tags (26 cases), perception label disagreements (24), and gate request failures (17, with four gate timeouts tracked separately).

All 71 copied baseline receipts matched their saved source artifacts, including their input fingerprints. The three archived Run 1 report files retained identical SHA-256 checksums. The Run 2 source fingerprint matched launch. Typecheck, all 12 targeted tests, and HTTP checks of the full Run 2 proof page and a failure JPEG passed. [Run 2 report](../../eval/report/run-2/REPORT.md) · [Run 2 JSON](../../eval/report/run-2/latest.json) · [Run 2 failure analysis](../../eval/report/run-2/FAILURES.md)

## Run 2 protocol

Run 2 uses the updated object-assessment pipeline at Carbon low and eight workers. It keeps the original, single-interaction Hydrogen baseline. All 71 original baseline receipts matched the capture fingerprints, including four baseline receipts that were outside Run 1's paired cutoff. The plant seed also matched the frozen source. Original validation and fetch errors remain in the reused baseline. Run 2 sends zero new baseline requests. Its baseline latency and HTTP counts describe the original requests.

The archived Run 1 files retain the original gate-admission scoring. The Run 1 and Run 2 comparison uses shared recorded pairs with matching capture fingerprints. Run 2 classifies devices by the returned perception class, then recognized gate class or binary gate answer where available. A passive capture can continue and still score correctly as a non-device. The paired delta for the older admission metric is omitted because the question changed.

The negative-capture fixture uses the existing Filler 3 food-contact drop. Physical coverage is scored from as-dropped findings or a structured safety concern tied to the drop. Unusable cases count as uncovered in this metric, with their gate outcomes shown separately. The original baseline declined negative assessments and had a plant description without an explicit drop position. The cyber score counts published structured claims and records flagged suppressions separately. The original dataset labels define the negative cohort.

Run 2 reports all-attempt latency and latency among completed assessments so early transport failures are visible in the performance comparison.

```sh
PW_REASONING_THINKING=low npm run eval -- --label run-2 --concurrency 8 --reuse-baseline run-1 --collect-only
npx tsx eval/snapshot.ts --label run-2
```

## Run 1 before

Run 1 launched at 17:17:35 UTC on November 21, 2026 and selected all 71 captures. Six workers run the single-call Hydrogen baseline and the Pyre Witness pipeline in parallel for each capture. The run uses Carbon at medium thinking and a 25-minute collection window. The evaluator snapshots completed paired attempts, including errors. It reports each side's completed-attempt count separately while pairs are still pending.

### Cutoff result

The 25-minute cutoff left **67 of 71 paired captures**. All 71 baseline attempts were saved. The system attempts for `photo-051`, `text-04`, `text-05`, and `text-09` were still running at cutoff. The final report uses the 67 matched pairs. Its last saved attempt is dated 17:41:58 UTC.

The original system delivered zero placements. Of its 67 attempts, 59 reached the Carbon deadline, six failed structured validation twice, and two failed on provider requests. It admitted all eight negatives. The baseline rejected all eight and returned 13 placements, with 10 matching the labeled physical area.

The paired baseline made 66 Gemini HTTP attempts and the system made 246. Baseline p50 and p95 were 13.1 s and 20.4 s. System p50 and p95 were 129.2 s and 161.7 s. The separate type judge made 50 attempts.

The initial collector's final report import failed because it had loaded the earlier cache module before the publisher was added. The standalone publisher rebuilt the final report from the saved attempts and archived it. The runner now loads its reporting module at launch.

### Evidence

- The current measurements are in [REPORT.md](../../eval/report/REPORT.md) and [latest.json](../../eval/report/latest.json). Run 1 has its own [Markdown archive](../../eval/report/run-1/REPORT.md) and [JSON archive](../../eval/report/run-1/latest.json).
- [FAILURES.md](../../eval/report/FAILURES.md) groups the observed system problems, shows each side's answer on representative cases, and counts cases only the baseline got right.
- The live proof page shares those measurements. Its tables show Wilson 95% intervals and per-metric denominators. Its comparison uses overlapping capture IDs with matching saved input fingerprints when both runs have them.
- Cost counts Gemini HTTP attempts, with retries and retrievals included. Latency measures capture-to-result or capture-to-failure wall clock. The offline Decisions type judge is measured separately. Paired cost totals cover completed pairs.

### Changes from live evidence

- The live requests use the shared `v1beta` Gemini transport. The runner counts actual HTTP attempts per capture, applies a shared backoff after HTTP 429, and saves each returned attempt before processing the next capture.
- Across all 71 baseline attempts, 46 answers parsed as JSON but failed structured-response validation. The most frequent overruns were the never-place list (30), physical constraints (22), and placement rationale length (17). Run 1 retains those errors. The next-run baseline explicitly caps output lists and prose and reports validation field paths. A separate live canary returned a valid result in one HTTP attempt on each of `photo-001` (12.47 s), `photo-003` (12.28 s), and `link-bright-tank` (14.01 s). These calls are outside the measured Run 1 cohort.
- The Run 1 system reached its original full-context Carbon stage. The pipeline owner's compact context, earlier rules result, and targeted revision are documented in [pipeline-speed.md](pipeline-speed.md). Run 2 kept the original baseline receipts for the matched comparison.

### Resume and rerun

A verified source checkout at `/private/tmp/pyre-witness-run-1-SHIGN1` matches the original source, dataset and settings fingerprint. Its source-only archive is saved at `eval/runs/2026-11-21T17-17-35-852Z-SHIGN1/resume-source.tar.gz`. The checkout uses local links to the workspace runtime dependencies, dataset, run ledger, report directory and environment file.

```sh
cd /private/tmp/pyre-witness-run-1-SHIGN1
PW_REASONING_THINKING=medium npm run eval -- --label run-1 --concurrency 6 --resume
```

Resume carries forward recorded successes, gate rejections and failures. It completes the missing attempts using the original code. To rebuild the reports from the ledger, run `npx tsx eval/snapshot.ts --label run-1` in the workspace.

### Verification

- `npm run typecheck` passed.
- `npx vitest run eval --maxWorkers=1` passed all 10 tests, including the resume and matched-cohort regression.
- `npx tsx eval/validate.ts` validated all 71 items.
- The dev server returned the populated `/proof` page and JPEGs for measured failure cases. An unknown image returned HTTP 404. Chromium launch was blocked by the sandbox, and the browser access host was unavailable.
