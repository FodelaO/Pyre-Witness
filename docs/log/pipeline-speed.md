# Pipeline speed

## Live timing

All times are seconds. The original-camera and first compact-camera rows use the same text fixture, seed twin, drop point, and Carbon low setting. The reported medium and high measurements were taken before this work. Whole-run medians use completed captures; failures are counted separately. First rules means the arrival of the first `selfcheck.done` event, which drives the drop-point outline. Usage numbers count all attempts for which Gemini returned usage.

| Version and input | n completed / attempted | Link | Gate | Scout | First placement | First rules | Carbon | Inspector total | Revision | Chief | End to end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Original, text, low | 1 / 1 | — | 0.348 | 6.681 | 7.032 | 59.461 | 52.412 | 0.034 | 49.473 | 9.925 | 118.877 |
| First compact prompt, text, low | 1 / 1 | — | 0.368 | 4.844 | 4.858 | 4.865 | 18.355 | 0.023 | — | 12.213 | 35.449 |
| First compact prompt, photo, low | 1 / 1 | — | 0.627 | 14.891 | 14.893 | 14.895 | 17.039 | 0.016 | — | 6.070 | 38.018 |
| First compact prompt, link, low | 1 / 1 | 1.318 | 1.628 | 8.040 | 9.361 | 9.362 | 18.902 | 0.014 | — | 7.521 | 35.799 |
| Refined schema, first text, low | 1 / 1 | — | 1.046 | 5.691 | 5.704 | 5.711 | 15.941 | 0.027 | — | 6.635 | 28.309 |
| Refined schema, first photo, low | 1 / 1 | — | 2.009 | 7.408 | 7.409 | 7.410 | 16.617 | 0.011 | — | 7.245 | 31.282 |
| Refined schema, first link, low | 1 / 1 | 0.938 | 3.383 | 9.869 | 10.810 | 10.812 | 13.561 | 0.014 | — | 8.059 | 32.444 |
| Refined schema, second text, low | 1 / 1 | — | 0.516 | 4.885 | 4.886 | 4.887 | 15.484 | 0.015 | — | 8.089 | 28.474 |
| Refined schema, second photo, low | 1 / 1 | — | 0.931 | 8.602 | 8.603 | 8.604 | 18.754 | 0.016 | — | 6.703 | 34.076 |
| Refined schema, second link, low | 0 / 1 | 0.248 | 1.844 | 5.864 | 6.116 | 6.117 | 120 s deadline | 0.001 | — | — | failed at 126.120 |
| Final, text, low | 1 / 1 | — | 0.333 | 4.733 | 4.754 | 4.757 | 14.457 | 0.014 | — | 6.335 | 25.560 |
| Final, photo, low | 1 / 1 | — | 1.206 | 6.778 | 6.779 | 6.781 | 16.071 | 0.012 | — | 6.466 | 29.328 |
| Final, link, low | 1 / 1 | 2.447 | 1.845 | 5.799 | 8.249 | 8.249 | 21.311 | 0.016 | — | 5.226 | 34.802 |

The final three live captures completed with a 29.328 s median and 34.802 s maximum. The first rules verdict had a 6.781 s median and 8.249 s maximum. The link exceeded both time targets on its final sample. One earlier link capture hit the 120 s Carbon deadline after the as-dropped check had already published. For the matched camera text, total latency fell 4.65×, Carbon fell 3.63×, and the first rules verdict came 12.50× sooner. The original reported Carbon samples were 55.6 s at low, 117 s at medium, and a stage timeout beyond 120 s at high.

| Final stage | n | p50 (s) | Max (s) |
| --- | ---: | ---: | ---: |
| Link fetch | 1 | 2.447 | 2.447 |
| Gate | 3 | 1.206 | 1.845 |
| Scout | 3 | 5.799 | 6.778 |
| As-dropped check | 3 | 0.002 | 0.003 |
| Carbon | 3 | 16.071 | 21.311 |
| Recommendation check | 3 | 0.011 | 0.015 |
| Chief | 3 | 6.335 | 6.466 |

Provider-reported input/output/thought token counts for final runs.

| Input | Decisions | Hydrogen | Carbon | Neon |
| --- | ---: | ---: | ---: | ---: |
| Text | 377 / 0 / — | 1510 / 215 / 457 | 6000 / 845 / 0 | 307 / 63 / 579 |
| Photo | 880 / 0 / — | 2013 / 337 / 723 | 6033 / 1093 / 0 | 298 / 57 / 535 |
| Link | 1289 / 0 / — | 1890 / 267 / 578 | 5895 / 1253 / 0 | 298 / 54 / 510 |

An additional text run on the first compact prompt stopped at a provider safety rejection. An intermediate, narrower schema returned invalid responses on text, photo and link because the generated physical constraints or mitigation effect lists exceeded two entries. The first rules arrived at 5.731 s, 8.653 s and 11.380 s respectively. The final schema permits six physical constraints and six effects per mitigation and retains the requested outer limits.

A separate text run used the real browser client and state stores against localhost SSE. The added asset reached the floor state at 4.796 s and gained its red outline at 4.798 s, with 10 modeled rules-engine paths present. That run was canceled once reasoning started. Chrome exited during launch and the in-app browser host was unavailable, so rendered timing was unavailable.

One live targeted Carbon low correction used a deliberately invalid zone in a synthetic recommendation. It completed in 6.283 s with 3,844 input and 104 output tokens. The rules engine passed the returned Utilities placement at Purdue 0 with no conduit and zero disagreements.

## What changed

- Decisions and Hydrogen start concurrently. The gate must pass before any profile or placement is published. A denied or failed gate aborts the speculative Scout call.
- The server evaluates the exact drop or current reassessment position and streams the verdict before Carbon. The client uses that verdict for the placed asset and clears it when a recommendation arrives. The final Inspector result describes Carbon's recommendation. Revisions get a fresh check.
- Carbon receives compact room and network facts, device evidence, and as-dropped Inspector findings with relevant ATT&CK IDs. Process-only assets are counted by room and kind. For a gauge on the 92-asset seed, the context is 8,354 bytes with 64 individual asset rows. The full seed twin serializes to 68,526 bytes.
- Native structured output plus local Zod validation bounds lists and prose. Carbon selects up to two existing Inspector exposure references, each with at most four hops. Displayed paths retain rules-engine provenance. The prompt asks Carbon for placement, exposure and protective controls. Inspector calculates the drill-down routes.
- Carbon streams provider thought summaries while the browser waits for the validated assessment. The recommendation appears after schema validation and grounding.
- Grounding repairs unsupported anchors, techniques, links and proposals. Carbon revises only on a blocked or invalid recommendation or a material rules-score difference. The correction gets its own smaller schema and request. Unaffected risks, compliance and mitigations carry forward.
- Scout uses medium image resolution and concise evidence. Product links with a model identifier and two documented kinds of specifications use the extracted text for Scout. Decisions still sees the image and the browser gets the thumbnail. A direct live AXIS link Scout probe took 5.933 s and identified the M3085-V, Ethernet, PoE Class 2 and IP42, with cloud connectivity unverified. The image-backed sample took 9.869 s.
- Neon copyedits only placement, top risk and control, and the final rules verdict. The app publishes checked results immediately and then attaches the real Neon output.
- Both API clients use v1beta. HTTP 429 and 5xx share one retry with schema correction within the stage deadline. Deadlines are 18 s link, 20 s gate, 45 s Scout, 120 s Carbon, 60 s revision and 30 s Chief. Sample sizes support observed maxima. They cannot establish population p95.
- The checked-in Carbon setting remains medium. Live timing at low used the existing `PW_REASONING_THINKING=low` override. No shared contracts changed.
- The crew and voice are owned by parallel work. The final reassessment verdict now describes the recommendation, while existing cues can still label it as the current spot. The bridge attempt could not record delivery because the coordination log directory is outside the writable workspace.

## Chief probe

| Live probe | n | p50 | Max | Input / thought / output tokens |
| --- | ---: | ---: | ---: | --- |
| Original structured briefing | 2 | 10.20 | 11.78 | unrecorded |
| Compact production structured briefing | 3 | 5.37 | 20.86 | 283 / 374–422 / 47–52 |
| Compact structured streaming | 2 | 5.48 | 5.60 | 264 / 365–368 / 49–50 |
| Compact plain-text streaming | 3 | 7.82 | 8.50 | 79 / 500–639 / 31–32 |
| Structured copyedit | 2 | 4.20 | 4.65 | 271 / 308–420 / 45–48 |

A 192-token total budget produced no usable briefing after 3.36 s. The installed 768-token cap leaves room for Neon low's reasoning while keeping generated content to three short lines. The lowest measured complete production briefing took 4.40 s. Showing the checked placement while Neon writes allows the demo to continue through the outliers.

## Placement quality

Six varied dataset captures used one live Hydrogen profile per pair. Carbon low and medium received the same profile, exact drop and rules evidence. These are first recommendations, before any correction. The table records physical room and Purdue level.

| Device | Low | Medium | Rules verdict | Carbon low / medium (s) |
| --- | --- | --- | --- | ---: |
| Contractor laptop | Control Room L3.5 | Corporate Office L4 | Both pass | 13.306 / 91.989 |
| Wi-Fi camera | Corporate Office L4 | Corporate Office L4 | Both pass | 14.878 / 70.526 |
| Hygienic point-level switch | Filler 3 L0 | Filler 3 L0 | Both pass | 26.042 / 98.107 |
| DIN-rail Modbus gateway | Packaging L1 | Packaging L1 | Both pass | 12.224 / 63.625 |
| Vertical jacketed tank | Blending L0 | Blending L0 | Both blocked. No clear footprint. | 15.708 / 43.939 |
| USB flash drive | Control Room L3.5 | Control Room L3.5 | Both pass | 17.519 / 62.519 |

Room and level agreed on 5/6. Full modeled placements agreed on 2/5 among placeable pairs, including conduit, zone and coordinates. All six agreed on rules verdict and both models matched the dataset's acceptable room and level labels on 6/6. Both laptop recommendations were within the labels. The tank demonstrates that a label match does not guarantee a feasible footprint.

Carbon low p50/max was 15.293/26.042 s versus medium at 67.076/98.107 s. Low was 4.39× faster at the median. Low input p50/max was 5,822/6,124 tokens and low output p50/max was 953/1,107 tokens. The paired comparison ran with up to three fixture workers, so its elapsed times describe that comparison.

## Reproduce

```sh
PW_REASONING_THINKING=low npx tsx --env-file=.env scripts/bench-pipeline.ts --n 2 --json
npx tsx --env-file=.env scripts/bench-pipeline.ts --compare
npm run typecheck
npx vitest run src/pipeline src/gemini src/link --maxWorkers=1
```

Whole-repo typecheck and lint on the touched TypeScript passed. The focused check passed 123 tests across 11 source suites. The whole suite passed 293 with 3 skipped after parallel changes settled.

Changed `scripts/{bench-pipeline,smoke-pipeline}.ts`, `src/gemini/{assess,briefing,capture,placementContext,schemas,transport,usage}.ts`, `src/pipeline/client.ts` and `src/pipeline/server/{groundAssessment,run,selfCheck}.ts`. Updated the capture, transport, browser and runner tests, including grounding checks. No contract change requests.

## Follow-up · physical objects and link budgets

The gate retains calibrated `is_device` and admits identifiable objects, including passive items and objects identified by a description or spec sheet. `is_object`, readability, and the unusable classification control rejection. New Scout output requires `object_class`. Saved profiles can omit it.

Passive captures use a generic, unlinked floor symbol at Purdue 0 in the room's zone. The model receives a compact physical brief with room restrictions, material, and Inspector evidence. Grounding strips cyber claims, attack paths and ATT&CK techniques and records a disagreement. Reassessment and recommended moves preserve physical isolation. Chief produces a placement and control, followed by the passive scope line.

Initial live photo check used three negatives and two devices from `eval/dataset/labels.csv`, with two workers. Times in seconds.

| ID and photo | Scout class | First rules | Carbon | Chief | End to end |
| --- | --- | ---: | ---: | ---: | ---: |
| photo-028 · ceramic mug | Passive object | 5.295 | 6.989 | 6.181 | 18.470 |
| photo-052 · wooden chair | Passive object | 5.260 | 5.695 | 5.369 | 16.335 |
| photo-053 · cardboard box | Passive object | 5.057 | 6.181 | 6.725 | 17.974 |
| photo-002 · Wi-Fi router | Networked device | 6.264 | 14.373 | 7.305 | 27.955 |
| photo-041 · float switch | Electrical equipment | 9.734 | 15.430 | 23.135 | 48.307 |

FOOD-02 and FOOD-03 held all three passive objects at Filler 3. All three recommendations passed. Decisions reported P(device) of 0.126–0.135 and P(object) of 0.890–0.907 for these items. The passive assets had observed materials and zero network connections, cyber profiles or attack paths. The float switch had a checked recommendation at 25.172 s. Chief accounted for the initial budget miss.

### Link profiling and stage recovery

Two fetch-only probes per vendor separated HTML, extraction and image time. AXIS HTML took 83–179 ms and its 1,418,142-byte image took 281–402 ms. Endress HTML took 162–1,559 ms, extraction 22–28 ms and its 5,557-byte image 58–341 ms. Previous slow link runs spent most of their time in Scout and Carbon. Fetch variability also contributed up to roughly two seconds.

Capture links now prioritize identification, material, ratings and interfaces in at most 1,600 spec characters. Spec-rich thumbnails are limited to 384 KiB and 1.5 s, and sparse-page images to 1.5 MiB and 4 s. AXIS kept all 1,126 spec characters and omitted the oversized image. Endress dropped from 3,513 characters to 1,600 while retaining 316L, EHEDG and IO-Link. Its thumbnail remained. Link analysis sends a shorter plant context to Carbon.

Carbon has a 60 s stage budget shared across attempts. At 38 s, a timed-out first attempt gives way to one smaller request. A transient provider error or invalid response can trigger the same smaller retry sooner. Permanent provider errors stop cleanly. Route tests cover a successful retry and an exhausted deadline.

All Inspector start, path and done SSE events carry a phase. Values are `as-dropped`, `recommendation` and `post-revision`. A failed revision retains the recommendation phase. The browser uses phase where available and falls back to event order. The shared `PipelineEvent` type was kept as-is. A shared optional phase is only needed for typed consumers outside the stream/client boundary.

Neon now gets two short structured output fields with a 640-token budget. The rules verdict or passive scope comes from the app. The checked assessment is emitted before calling Neon.

```sh
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite object-photos --workers 2 --json
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite mixed --workers 2 --json
```

### First ten-input run

This run used two workers after link and Chief tuning. Eight of ten completed. The text point-level switch stopped on a Carbon connection error and the lighter stopped on a Scout connection error. The installed SDK wraps these failures without an HTTP status. The retry classifier now handles those SDK connection errors and retains the one-attempt retry budget. A test using the installed SDK and a failed fetch verifies recovery.

All five photo reruns completed within 30 s. The mug took 14.901 s, chair 19.053 s, box 16.993 s, router 28.100 s and float switch 24.050 s. Their first verdicts arrived in 4.616–7.424 s.

| Link | Fetch | Scout | Carbon | Chief | End to end (s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| AXIS camera | 3.744 | 5.693 | 17.683 | 5.061 | 32.209 |
| Endress level switch | 0.880 | 7.381 | 12.992 | 6.136 | 27.410 |

The AXIS capture used 5,576 Carbon input tokens versus 5,895 in the earlier 34.802 s link run. Scout took a similar time to the photo captures. The longer AXIS fetch and Carbon calls kept the total above 30 s. The text camera ended at 47.063 s, driven by 28.400 s in Chief.

| Stage | n | p50 (s) | p95 (s) |
| --- | ---: | ---: | ---: |
| Link fetch | 2 | 2.312 | 3.744 |
| Gate | 10 | 0.769 | 1.245 |
| Scout | 9 | 5.693 | 7.422 |
| As-dropped check | 9 | 0.001 | 0.009 |
| Carbon | 8 | 12.463 | 17.683 |
| Recommendation check | 8 | 0.013 | 0.042 |
| Chief | 8 | 5.908 | 28.400 |
| First placement | 9 | 6.088 | 9.438 |
| First rules | 9 | 6.089 | 9.440 |
| End to end | 8 | 25.730 | 47.063 |

Stage percentiles use available completed stages and nearest-rank p95. A ten-run p95 is the observed maximum. Failed captures have no end-to-end completion time.

### Ten-input rerun with Gemini connection retries

Three workers, Carbon low. Nine of ten completed. The Endress page fetch failed early. The earlier batch completed the same fixture in 27.410 s. The two previously failed Gemini text captures completed.

| Stage | n | p50 (s) | p95 (s) |
| --- | ---: | ---: | ---: |
| Link fetch | 1 | 0.532 | 0.532 |
| Gate | 9 | 0.479 | 2.056 |
| Scout | 9 | 6.603 | 14.886 |
| As-dropped check | 9 | 0.002 | 0.005 |
| Carbon | 9 | 12.578 | 14.834 |
| Recommendation check | 9 | 0.011 | 0.042 |
| Chief | 9 | 5.958 | 12.203 |
| First placement | 9 | 6.604 | 15.419 |
| First rules verdict | 9 | 6.605 | 15.421 |
| End to end | 9 | 24.469 | 37.962 |

The rerun had no reasoning timeout or placement revision. The three passive photos again had no cyber profile, connections, published cyber risks, techniques or attack paths. The pocket lighter was held by HAZ-02 in the ammonia area and the recommended placement passed.

| Fixture | Link fetch (s) | First rules (s) | Carbon (s) | Chief (s) | Total (s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| photo-028 | — | 4.888 | 7.356 | 12.203 | 24.454 |
| photo-052 | — | 5.335 | 5.352 | 5.440 | 16.135 |
| photo-053 | — | 6.826 | 4.959 | 5.472 | 17.265 |
| photo-002 | — | 7.327 | 12.846 | 6.515 | 26.709 |
| photo-041 | — | 5.614 | 14.096 | 5.124 | 24.878 |
| demo-camera | — | 3.483 | 12.578 | 8.393 | 24.469 |
| text-03 | — | 7.781 | 14.834 | 5.958 | 28.585 |
| text-pocket-lighter | — | 6.605 | 6.931 | 5.152 | 18.694 |
| link-indoor-camera | 0.532 | 15.421 | 13.103 | 9.420 | 37.962 |
| link-point-level | — | — | — | — | Fetch failed at 0.966 |

The AXIS link regressed to 37.962 s despite a 0.532 s fetch. Scout took 14.886 s, then Carbon took 13.103 s and Chief took 9.420 s. The prior batch showed the opposite mix of fetch and inference delays. The caps lower payload and bound image collection; provider latency still varies.

A subsequent link robustness fix gives a status-less DNS or fetch connection failure one retry in the original link deadline. URL and private-host checks still run for each attempt.

Whole-repo typecheck, lint on the touched files, and the requested focused Vitest command passed. The focused run covered 135 tests across 12 files.

### Link-only verification after the final retry change

Two live links, two workers. Both pages loaded and both recommendations passed Inspector.

| Link | Fetch (s) | Scout (s) | First rules (s) | Carbon (s) | Chief (s) | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| AXIS camera | 2.528 | 10.079 | 12.617 | 56.223 | 6.272 | Completed at 75.124 s |
| Endress level switch | 6.515 | 6.291 | 12.807 | 18.847 | 30 s deadline | Stopped at 61.668 s |

Carbon's smaller AXIS request used 5,100 reported input tokens and returned a valid recommendation within the shared 60 s budget. Endress's checked recommendation was already in the event stream before the Chief timeout. These two link-only checks remain separate from the ten-input statistics.

## Follow-up · product link budgets and optional briefing

A link's title, specs and optional image go to Scout. Decisions runs on Scout's compact identification before the asset is published. Carbon uses the same compact profile, twin and as-dropped evidence as photo and text. Its six optional placement specs come from Scout: size or capacity, material, ingress rating, hazardous-area rating, radios and power. String values are capped at 96 characters. The browser still receives a bounded thumbnail when the source provides one.

Link capture gives eligible connection, timeout, server and content-negotiation failures one retry with an alternate Accept and Accept-Language preference. Each attempt shares six seconds between the page and its optional image. Structured product fields and tables precede marketing copy in the 3,000-character spec budget. Capture HTML is capped at 2 MiB. Explicit access denials and pages without readable product details stop at the link stage with the photo or text alternative.

Chief gets eight seconds after the final placement check. A completed Neon response is displayed when available. Otherwise the stream emits a truthful late or unavailable status and then completes the run. The SDK call is canceled at the deadline, including when its promise remains unsettled. In a controlled stall the wrapper returned after 8.001 s. The runner imports the shared Inspector phase type.

Fetch-only sweep, two workers, all eight links returned readable product details.

| Link | Fetch (s) | Spec characters | Retained image bytes |
| --- | ---: | ---: | ---: |
| Bright tank | 0.874 | 994 | 0 |
| Mixing tank | 0.752 | 712 | 28,115 |
| Point level | 0.432 | 1,983 | 5,557 |
| Hygienic pressure | 0.702 | 2,675 | 6,117 |
| Outdoor camera | 0.801 | 2,999 | 188,056 |
| Indoor camera | 0.163 | 1,126 | 0 |
| LTE gateway | 2.591 | 3,000 | 83,522 |
| Serial gateway | 2.427 | 646 | 90,143 |

```sh
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite links --limit 6 --workers 2 --json
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite links --workers 2 --json
```

### Baseline · six dataset links

Two workers. All six completed. End-to-end p50/p95 was 33.785/70.116 s. The p95 is nearest-rank, which equals the observed maximum at this sample size.

| Fixture | Fetch | Gate | Scout | Carbon | Revision | Chief | Total (s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| link-bright-tank | 0.507 | 0.264 | 5.123 | 13.265 | 6.982 | 5.131 | 31.018 |
| link-mixing-tank | 0.441 | 0.588 | 7.051 | 12.689 | 8.781 | 5.596 | 34.570 |
| link-point-level | 0.917 | 0.417 | 5.725 | 19.893 | — | 6.453 | 33.000 |
| link-hygienic-pressure | 1.696 | 0.793 | 7.140 | 48.794 | — | 12.475 | 70.116 |
| link-outdoor-camera | 0.572 | 1.331 | 6.878 | 10.352 | — | 10.790 | 28.610 |
| link-indoor-camera | 0.293 | 0.404 | 7.056 | 18.885 | — | 12.411 | 38.664 |

Provider input / output / thought tokens, summed across reported attempts.

| Fixture | Gate | Scout | Carbon | Revision | Chief |
| --- | ---: | ---: | ---: | ---: | ---: |
| link-bright-tank | 986 / 0 / — | 2003 / 420 / 677 | 5384 / 860 / 0 | 4193 / 317 / 0 | 283 / 61 / 414 |
| link-mixing-tank | 1427 / 0 / — | 2450 / 396 / 729 | 5382 / 869 / 0 | 4207 / 303 / 0 | 283 / 60 / 422 |
| link-point-level | 1667 / 0 / — | 2155 / 289 / 621 | 5713 / 1088 / 0 | — | 279 / 59 / 410 |
| link-hygienic-pressure | 1744 / 0 / — | 2225 / 330 / 824 | 5096 / 761 / 0 | — | 568 / 53 / 1044 |
| link-outdoor-camera | 1913 / 0 / — | 2922 / 364 / 994 | 5733 / 538 / 0 | — | 566 / 58 / 987 |
| link-indoor-camera | 1077 / 0 / — | 2099 / 257 / 537 | 5576 / 1275 / 0 | — | 546 / 54 / 1024 |

The baseline sent page evidence to Decisions and Scout. Carbon already received a distilled profile and compact twin. The baseline fetch maximum was 1.696 s. Carbon plus its smaller retry accounted for 48.794 s on the pressure link. A real placement revision added 6.982 s and 8.781 s on the two tanks. Bright tank remained held after the revision because the mapped recommendation had no usable placement.


### First eight-link run with isolated page evidence

Eight of eight completed, with six passing recommendations and two held tank recommendations. End-to-end p50/p95 was 32.927/44.788 s. VIGI reached the longest total and spent 29.346 s in Carbon. The final-check-to-completion maximum was 7.502 s. All eight received a Neon briefing.

| Fixture | Fetch | Gate | Scout | Carbon | Revision | Chief | Total (s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| link-bright-tank | 0.775 | 0.280 | 5.493 | 14.436 | 5.456 | 5.291 | 31.739 |
| link-mixing-tank | 0.761 | 0.467 | 7.457 | 15.308 | 9.361 | 5.331 | 38.688 |
| link-point-level | 0.875 | 0.422 | 7.570 | 14.475 | — | 6.567 | 29.924 |
| link-hygienic-pressure | 2.010 | 0.549 | 9.420 | 10.999 | — | 5.220 | 28.209 |
| link-outdoor-camera | 1.698 | 0.444 | 5.876 | 29.346 | — | 7.408 | 44.788 |
| link-indoor-camera | 0.720 | 0.323 | 6.206 | 21.023 | — | 5.382 | 33.667 |
| link-lte-gateway | 2.797 | 0.257 | 6.225 | 17.564 | — | 5.328 | 32.186 |
| link-serial-gateway | 4.666 | 0.397 | 6.178 | 18.766 | — | 7.502 | 37.544 |

Photo and text controls from this version completed in 30.670 s and 32.268 s. The text control emitted the late briefing status and completed 8.003 s after the final check. The first updated link run overlapped the baseline and control workloads.

The next refinement reduces the same shared photo, text and link context to the 36 most relevant peer asset rows, with all rooms and known network zones retained. A smaller retry keeps 18 rows. The Architect prompt now asks for one main item per section and short phrases. Inspector still checks the full twin.


### Refined eight-link run

Two workers. Four of eight completed. Completed-run p50/p95 was 34.450/39.342 s. The latest run missed the target for eight completed captures. Three fixtures stopped at link fetch, and the AXIS run stopped at Carbon after its as-dropped check.

| Fixture | Fetch | Gate | Scout | Carbon | Revision | Chief | Total | Terminal (s) | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| link-bright-tank | 0.615 | 0.292 | 7.952 | 15.655 | 6.336 | 6.817 | 37.671 | 37.672 | Held |
| link-mixing-tank | 0.415 | 0.253 | 7.645 | 10.180 | 14.786 | 6.056 | 39.342 | 39.342 | Held |
| link-point-level | — | — | — | — | — | — | — | 12.005 | Link error |
| link-hygienic-pressure | — | — | — | — | — | — | — | 1.016 | Link error |
| link-outdoor-camera | 2.428 | 0.226 | 7.051 | 12.649 | — | 5.808 | 28.185 | 28.185 | Passed |
| link-indoor-camera | 1.435 | 0.495 | 6.896 | — | — | — | — | 48.852 | Carbon connection error |
| link-lte-gateway | 3.130 | 0.291 | 7.219 | 12.565 | — | 8.003 | 31.228 | 31.228 | Passed, Chief late |
| link-serial-gateway | — | — | — | — | — | — | — | 3.188 | Link error |

Provider input / output / thought tokens, summed across reported attempts.

| Fixture | Gate | Scout | Carbon | Revision | Chief |
| --- | ---: | ---: | ---: | ---: | ---: |
| link-bright-tank | 704 / 0 / — | 2003 / 489 / 778 | 5462 / 760 / 0 | 4051 / 203 / 0 | 275 / 59 / 479 |
| link-mixing-tank | 703 / 0 / — | 2177 / 356 / 1014 | 5439 / 487 / 0 | 4076 / 227 / 0 | 274 / 54 / 479 |
| link-point-level | — | — | — | — | — |
| link-hygienic-pressure | — | — | — | — | — |
| link-outdoor-camera | 700 / 0 / — | 3306 / 333 / 899 | 5782 / 531 / 0 | — | 265 / 56 / 424 |
| link-indoor-camera | 708 / 0 / — | 2096 / 408 / 518 | — | — | — |
| link-lte-gateway | 709 / 0 / — | 3042 / 366 / 786 | 5823 / 920 / 0 | — | — |
| link-serial-gateway | — | — | — | — | — |

Among the completed links, Carbon p50/p95 fell from 16.436/29.346 s in the first updated batch to 12.607/15.655 s after refinement. VIGI completed in 28.185 s, down from 44.788 s, and its Carbon response fell from 1,185 to 531 output tokens. Both tanks required a revision and remained on hold because of the modeled footprint.

The point-level Endress attempt stopped after 12.005 s, consistent with two six-second budgets. A separate fetch-only probe of the hygienic-pressure URL also exhausted both budgets. Both URLs and Moxa completed in the previous eight-link batch. The refined router photo and demo text controls each stopped at Decisions on an SDK connection failure, so comparable timing for those final controls is unavailable.

The LTE capture emitted the late briefing status and completed 8.003 s after the final check, the longest post-check wait in the refined run.

Whole-repo typecheck, 152 focused tests, lint on the touched modules, and whitespace checks on the owned paths passed. The shared event contract stays in the upstream types file.

## Reliability

Evaluation run 2 recorded 35 completions, two explicit rejections, and 34 operational failures across 71 captures. The operational failures were 17 gate errors, four gate timeouts, six Scout errors, six link fetch failures, and one Carbon timeout. The raw receipts recorded zero rate-limited calls. They retain sanitized terminal errors and provider attempt counts, so the historical generic errors cannot establish the HTTP status or transport cause.

| Run 2 input | Completed | Explicit rejection | Operational failure |
| --- | ---: | ---: | ---: |
| Photo | 26 | 2 | 26 |
| Text | 7 | 0 | 2 |
| Link | 2 | 0 | 6 |

The 33 completed image and text captures in run 2 had end-to-end p50/p95 of 27.183/37.506 s. Run 2's evaluation harness used eight workers and also made judge calls. The stage probes exercise the model endpoints independently.

The diagnostic processes imported the original source before any runtime edits. Each model ran separately at concurrency 1 and then 8. The Gate and Scout diagnostic processes overlapped while Gate was active, with separate model calls. The serial and concurrent arms of each model ran in order with all 54 dataset images and no downstream stages.

| Original stage | Concurrency | Completed | Terminal errors by status or cause | p50 (s) | p95 (s) | Max (s) |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| Gate | 1 | 54/54 | None | 0.869 | 1.826 | 2.363 |
| Gate | 8 | 54/54 | None | 1.065 | 2.760 | 4.144 |
| Scout | 1 | 54/54 | None | 7.442 | 13.007 | 14.862 |
| Scout | 8 | 54/54 | None | 8.790 | 19.900 | 20.695 |

The isolated probes did not reproduce the run-2 terminal failures. The original probes capture terminal stage errors and provider usage from returned responses. They do not observe HTTP retries that recovered inside the original client. Both gate arms returned explicit rejection for the defocused photo and the landscape. The original concurrency-8 gate maximum would exceed the updated four-second advisory budget.

- Gate has at most one retry in a four-second wall-clock budget. A provider failure or timeout emits `gate.done` with no calibrated answers, `proceed: true`, and a gate-unavailable explanation. A valid explicit denial is still an intentional stop. Scout can return an explicit unusable classification without producing a placed asset or calling Carbon.
- Model requests have up to two transient retries within their stage deadline. Backoff adds jitter above a valid Retry-After floor. The 400 response body is logged server-side with credential redaction and receives no retry. Request-local diagnostics retain the original status, connection causes, and retry information without changing the shared event contract.
- The HTTP route and direct runner inspect actual image bytes. Still JPEG, PNG, and WebP are supported at up to 2 MiB decoded and 1600 pixels on the longest side per image. All 54 source images passed, including the largest at 1,270,812 bytes. The browser capture card already downscales to 1600 px. This boundary checks framing and dimensions without a server decoder or re-encoder.
- Server state and retry counters are local to each run. Comparison diagnostics use AsyncLocalStorage. A concurrent route test forces a 400 at one gate while the other capture's gate returns a normal decision. Both complete with independent event IDs. The existing single-active browser interaction remains the browser's cancellation policy.

The pipeline and benchmark sources were frozen at **2026-11-21 17:54:31.998 UTC** before the end-to-end batch. The SHA-256 of the 50-file source inventory, including file names and bytes, is `0e19ba1bbd3bdb08003b34c821b6bc1c71217f0771a6d89d4339d3a65fd9360e`. The inventory covers the pipeline, Gemini and link directories, analyze and reassess routes, and the benchmark and smoke scripts. Diagnostic artifacts stayed under the system temporary directory.

The frozen reliability batch began at 18:01:01 UTC, after the isolated probes completed. It used six workers for all 54 photos and nine text cases. Provider diagnostics are request-scoped and include retry attempts from this batch.

```sh
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite reliability --workers 6 --json
npm run typecheck
npx vitest run src/pipeline src/gemini src/link --maxWorkers=1
```

The panel reads the gate-unavailable reason from the gate event. The existing crew activity cue labels any continued gate result "Gate passed". That cue is outside the pipeline ownership.

### Frozen six-worker batch

Completed from 18:01:02.391 to 18:06:49.337 UTC. The source fingerprint matched after the run. The benchmark exited successfully. Stage timing uses nearest-rank p95 and includes completed stages unless specified.

| Input | Completed | Expected rejection | Operational failure | p50 (s) | p95 (s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Photos | 52/54 (96.30%) | 2 | 0 | 29.012 | 56.949 |
| Text | 9/9 (100.00%) | 0 | 0 | 25.291 | 50.410 |
| Total | 61/63 (96.83%) | 2 | 0 | 28.905 | 52.135 |

All 61 identifiable captures reached a checked recommendation. Gate deliberately rejected photo-027, the defocused image, and photo-030, the landscape. These are included in the strict 63-capture denominator but excluded from the usable-capture denominator. This run covers image and text pipeline execution. It omits link cases and the evaluation judge workload.

| Stage | Completed | Expected rejection | Advisory fallback | Failed | p50 (s) | p95 (s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Image and request validation | 63 | 0 | 0 | 0 | — | — |
| Decisions gate | 58 | 2 | 3 | 0 | 1.125 | 3.141 |
| Scout | 61 | 0 | 0 | 0 | 8.969 | 18.678 |
| As-dropped check | 61 | 0 | 0 | 0 | 0.001 | 0.003 |
| Carbon | 61 | 0 | 0 | 0 | 12.542 | 29.070 |
| Recommendation check | 61 | 0 | 0 | 0 | 0.006 | 0.033 |
| Revision | 5 | 0 | 0 | 0 | 10.449 | 22.136 |
| Post-revision check | 5 | 0 | 0 | 0 | 0.002 | 0.019 |
| Chief | 51 | 0 | 10 | 0 | 6.059 | 7.538 |

Gate elapsed time across all 63 results, including declines and timeouts, was 1.183 s p50 and 3.916 s p95. The 4 s advisory timeouts on photo-036, photo-045 and photo-054 all led to completed captures. The observed APIConnectionError with ETIMEDOUT recovered on text-09. Gate and Scout overlap and the observation is attached to the capture, so the stage of that retry is undetermined. One structured reply mismatch also occurred during the batch without an additional failed capture. The frozen batch observed no HTTP 400, 429 or 5xx terminal failures.

Chief produced 51 briefings and 10 truthful late statuses. Final check to run completion was 6.268 s p50, 8.002 s p95, and 8.005 s max. First placement was 8.970 s p50 and 18.684 s p95 under this load. Photo-034 took 72.786 s overall, of which 53.809 s was Carbon. The 95% completion target was met. The previous first-update target of 8 seconds was exceeded at the median in this six-worker batch.

Typecheck and all 173 focused tests passed. Evaluation files stayed read-only.

## Transcript

The Node analyze and reassess routes now publish one transcript entry per Gemini attempt, including retry requests, deadline interruptions and retrieved stored output. Inspector entries identify the room, level and check phase. Architect entries retain the compact prompt and the raw return, including ordered thought summaries when Gemini provides them. Separate notes identify advisory admission and skipped revisions. Each text field is capped at 40,000 characters with an explicit truncation note. Capture attachments are counted. The collector redacts image payloads and credentials before publishing.

Chief receives the final placement, top risk, rules-engine pass flag, blocking findings and hold status. The briefing's verdict comes from those facts. Neon supplies at most one caution topic. The primary call and its retry each have a 15 s budget. A smaller Neon request gets 6 s if they fail. HTTP analysis completes at the checked placement while the stream stays open for the Chief response and transcript. The browser capture promise also settles at that point. Direct callers retain their terminal `run.completed` receipt for the evaluator.

Placement destinations exclude the virtual crew office and the washdown and ammonia overlays. Their physical restrictions still apply at the exact drop coordinates. An unresolved block marks the assessment `HOLD:` and surfaces the rules engine's least-risk usable room when available. The Inspector checks that option, and it stays on hold even if the alternative has no blockers. Passive assessments use room-only rationale with level 0 internally. Tags use equipment prefixes and the next available sequence starting at 901 on the submitted twin snapshot.

### Live transcript entries

The benchmark ran sequentially with the live Gemini API. Cells show elapsed milliseconds and reported input/output/thought token counts. A dash means the provider did not report that field, or the rules engine used no model.

| Stage | Engine | Text camera | Router photo `photo-002` | Mug photo `photo-028` |
| --- | --- | ---: | ---: | ---: |
| Gate | `gemini-decision-1` | 618 ms · 696/0/— | 874 ms · 1,199/0/— | 676 ms · 1,225/0/— |
| Scout | `gemini-4-hydrogen` | 4,882 ms · 1,781/220/407 | 12,998 ms · 2,284/377/538 | 11,172 ms · 2,310/164/350 |
| Inspector, as-dropped | rules engine | 5 ms · — | 1 ms · — | 1 ms · — |
| Architect | `gemini-4-carbon` | 12,755 ms · 5,588/886/0 | 10,068 ms · 5,599/906/0 | 5,248 ms · 1,459/242/0 |
| Inspector, recommendation | rules engine | 13 ms · — | 9 ms · — | 4 ms · — |
| Architect revision note | `gemini-4-carbon` | skipped | skipped | skipped |
| Chief | `gemini-4-neon` | 3,050 ms · 299/27/209 | 4,019 ms · 303/26/217 | 4,043 ms · 302/27/283 |

All three recommended Corporate office and passed the final check. The mug had `FOOD-02` and `FOOD-03` at the drop. The final assessment kept it at internal level 0 and the Chief scoped the briefing to physical and food-safety compliance.

| Input | Checked placement | Chief delivered at | Final check to completion receipt |
| --- | ---: | ---: | ---: |
| Text camera | 17.685 s | 20.743 s | 0 ms |
| Router photo | 23.083 s | 27.105 s | 1 ms |
| Mug photo | 16.432 s | 20.479 s | 0 ms |

Chief delivered **10/10** real Neon briefings at **4.117 s p50 / 13.424 s p95**. That combines three full captures (3.052, 4.020, 4.043 s) with seven sequential Neon-only calls using the final placement and verdict from those captures (4.190, 4.856, 3.902, 4.640, 13.424, 2.959, 12.032 s). The three full captures had 4.020 s p50 and 4.043 s p95. Both isolated calls over 8 s still delivered using the primary request. The timeout, retry, fallback and final-hold paths were exercised through offline route tests.

```sh
npx tsx --env-file=.env scripts/bench-pipeline.ts --suite transcript --workers 1 --chief-samples 10 --json
npm run typecheck
npx vitest run src/pipeline src/gemini src/link --maxWorkers=1
```

A fourth sequential capture exercised the final code through `POST /api/analyze` on localhost using the mug photo. The route emitted `run.completed` at 10.208 s, followed by the real Chief transcript and briefing 3.906 s later. It passed in Corporate office with a room-only rationale. This single route check is separate from the ten Chief measurements above.

| Stage | Engine | Elapsed | Input/output/thought tokens |
| --- | --- | ---: | ---: |
| Gate | `gemini-decision-1` | 1,136 ms | 1,225/0/— |
| Scout | `gemini-4-hydrogen` | 4,101 ms | 2,310/268/297 |
| Inspector, as-dropped | rules engine | 1 ms | — |
| Architect | `gemini-4-carbon` | 6,095 ms | 1,460/268/0 |
| Inspector, recommendation | rules engine | 3 ms | — |
| Architect revision note | `gemini-4-carbon` | skipped | — |
| Chief | `gemini-4-neon` | 3,905 ms | 302/28/283 |

Typecheck and all 183 focused tests passed. The API and browser client require no shared contract change. The browser test verifies that the analysis promise resolves before Chief and that the store still receives the late briefing and transcript. The panel reads the briefing from that store. Its existing Purdue badge for passive placements and the crew animation's handling of post-completion events belong to their UI owners.

## Run 3 equipment and risk diagnosis

The paired audit compared the Run 3 system receipts in `eval/runs/2026-11-21T18-15-30-504Z-5IOMF9` with the fresh baseline receipts in `eval/runs/2026-11-21T18-30-07-972Z-wVengg`. The scorer exactly matches expected equipment kind against `prediction.profile.physical_kind`. The system prediction takes that field from `perception.done.profile`. Run 3 lacks raw Scout transcripts. The table therefore distinguishes the first archived validated Scout value from the unavailable wire answer. The validation and prediction paths preserve the kind, and every first archived value matched the final prediction. The historical Scout prompt used a bare enum with a generic fallback.

| Capture | Expected | Scout raw | First archived Scout and final | Cause |
| --- | --- | --- | --- | --- |
| `photo-006` | `plc_cabinet` | Unavailable | `generic_device` | Identified a modular PLC. The enum name suggested an enclosure. |
| `photo-010` | `phone` | Unavailable | `generic_device` | Tablet has no dedicated symbol. The fresh baseline also chose generic. |
| `photo-021` | `hmi` | Unavailable | `plc_cabinet` | Pushbutton operator station resembles a controller enclosure. The fresh baseline made the same choice. |
| `photo-033` | `plc_cabinet` | Unavailable | `generic_device` | DIN-rail CPU and remote I/O lacked an enclosure. |
| `photo-034` | `plc_cabinet` | Unavailable | `generic_device` | Identified a bare DIN-rail controller without assigning the PLC symbol. |
| `photo-035` | `generic_device` | Unavailable | `hmi` | A barcode price-checker screen was mistaken for an industrial operator interface. |
| `photo-044` | `phone` | Unavailable | `generic_device` | Tablet has no dedicated symbol. The fresh baseline also chose generic. |
| `photo-049` | `gateway` | Unavailable | `network_switch` | Dense RJ45 chassis could be a terminal server or Ethernet switch. |

`riskTags` matches only final risk `title` and `description`. `never_place`, mitigation text, compliance and standalone Inspector events do not count. The audit reproduced 54 hits and 66 misses over 120 expected risks. Three port omissions had matching `PHYS-01` findings in the final Inspector result.

| Risk key | Missed / expected | Evidence already available in Scout on the misses |
| --- | ---: | --- |
| Physical port | 31/31 | 19 structured ports, 2 observed terminal blocks, 3 indirect clues, 7 without direct evidence |
| Hazardous area | 11/11 | 2 structured ratings, 9 without direct evidence |
| Camera view | 7/8 | 7 camera identities or visible lenses |
| Wireless | 4/15 | 0 populated radio fields on the missed items |
| Remote access | 4/4 | 2 explicitly described remote-use roles, 2 without direct evidence |
| Transient or unmanaged | 3/12 | 3 portable identities with management status unknown |
| Cloud | 3/5 | 0 positive cloud flags on the missed items |
| Removable media | 2/7 | 0 storage or port observations supporting removable media |
| Washdown | 1/26 | 1 IP69K rating and hygienic evidence |
| Default credentials | 0/1 | No misses |

### Misses by saved Scout evidence

- **physical_port** — inferred connection only (photo-002, photo-019, text-08) · structured ports (link-indoor-camera, link-lte-gateway, link-outdoor-camera, photo-001, photo-011, photo-012, photo-020, photo-023, photo-031, photo-033, photo-034, photo-038, photo-039, photo-042, photo-045, photo-049, text-04, text-06, text-07) · no direct evidence (photo-003, photo-007, photo-008, photo-009, photo-010, photo-032, photo-044) · observed terminal blocks (photo-006, photo-022).
- **camera_view** — camera identity or visible camera (link-indoor-camera, link-outdoor-camera, photo-003, photo-004, photo-009, photo-044, text-02).
- **hazardous_area** — structured hazardous rating (link-hygienic-pressure, photo-013) · no direct evidence (photo-014, photo-015, photo-016, photo-036, photo-037, photo-040, photo-046, photo-048, photo-051).
- **wireless** — no direct evidence (photo-008, photo-009, photo-045, photo-050).
- **removable_media** — no direct evidence (photo-007, photo-008).
- **remote_access** — explicit remote-use evidence (text-01, text-08) · no direct evidence (link-lte-gateway, photo-049).
- **cloud** — no direct evidence (photo-009, photo-044, photo-050).
- **washdown** — structured ingress rating (text-03).
- **transient** — portable identity with management status unknown (photo-044, text-06, text-07).

### Pipeline changes

Scout now receives an exhaustive compact guide to equipment symbols that distinguishes equipment by primary function. The guide covers controllers with or without an enclosure, operator interfaces versus unrelated screens, switches versus protocol gateways, and tablets using the mobile touchscreen symbol. The Scout prompt also separates documented wireless capability from its enabled state and requests physical connector names when identifiable. The pipeline preserves a valid kind through validation, independent of category or display name.

After the last Inspector check, the runner combines grounded Architect risks, checked rules findings and uncovered risks from actual Scout profile evidence. The deterministic additions include wireless, removable storage, visible defaults, cloud, camera or microphone, unmanaged portable devices and recognizable physical data interfaces. Architect overlaps are deduplicated using known technique IDs or rule IDs. A stronger checked finding retains its severity and provenance. The list prioritizes blockers and documented device features, with a 16-item display cap. Passive objects receive physical and compliance items only. The list uses the same hold, placement, and tag. It reaches the browser through `summary.started.assessment` and is recorded in the transcript with provenance.

The [receipt selection and baseline preservation instructions](pipeline-speed-handoff.md) are in the writable log directory. The session's approval settings rejected the requested `.agents/requests/pipeline-speed.md` write.

### Five-photo Scout comparison

The same five photos ran sequentially at low thinking before and after the new guide. The elapsed times below are provider-call latency from the transcript.

| Photo | Before kind | After kind | Before | After | Input tokens before → after |
| --- | --- | --- | ---: | ---: | ---: |
| `photo-002` | `wifi_ap` | `wifi_ap` | 9.687 s | 14.746 s | 2,284 → 2,670 |
| `photo-003` | `ip_camera` | `ip_camera` | 6.778 s | 10.479 s | 2,287 → 2,673 |
| `photo-010` | `generic_device` | `phone` | 5.893 s | 7.436 s | 2,305 → 2,691 |
| `photo-021` | `plc_cabinet` | `hmi` | 9.548 s | 9.557 s | 2,288 → 2,674 |
| `photo-041` | `instrument` | `instrument` | 8.981 s | 7.965 s | 2,310 → 2,696 |

Provider-call p50 moved from **8.981 s to 9.557 s** and median input grew by 386 tokens. The tablet and pushbutton station changed to the expected equipment symbols. The other three retained their kinds. These five observations do not establish a new paired score.

### Sequential end-to-end live checks

Each capture started from the same untouched seed twin. Checked placement time ends at `run.completed`. Full time includes the real Neon briefing.

| Capture | Scout kind | Final checked room | Checked placement | Full time | Deterministic merge | Final risk evidence |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Wi-Fi camera text | `ip_camera` | Corporate office · passed | 35.409 s | 40.456 s | 14 ms | Architect wireless/cloud and washdown risks, plus profile microSD, camera/microphone and Ethernet-port risks |
| USB flash drive `photo-038` | `usb_drive` | Corporate office · passed | 19.244 s | 22.549 s | 3 ms | Architect caught removable media and washdown. The probe exposed a duplicate port risk for the drive's USB-A plug. The final code suppresses that case, covered by an offline regression. |
| Mug `photo-028` | `generic_device` · passive | Corporate office · passed | 11.272 s | 16.344 s | 0 ms | Brittle ceramic and liquid contamination. Zero cyber items. |

The camera took 21.405 s in Scout. It exceeded the 30 s checked-placement budget. The deterministic merge made no provider calls and took at most 14 ms in the three probes. Run 4's paired accuracy and recall have yet to be measured.

### Deterministic replay on Run 3 receipts

Applying the final risk merge to the 66 shared placed answers recovered **20 of the 66 historical misses** with the existing scorer. This comprised 14 physical-port tags and six camera tags. The replay retained every previously returned tag. On the original 120-tag paired denominator, this projects 74/120 (61.7%) from the saved observations. The replay holds Scout, Carbon and Inspector receipts fixed. It is separate from a fresh Run 4 comparison.

### Verification

All 195 tests passed with `npx vitest run src/pipeline src/gemini src/link --maxWorkers=1`. A TypeScript check covering the edited pipeline files, tests, both API routes and their imports passed. The full `npm run typecheck` failed during unrelated 3D work. The latest attempt reported that `src/view3d/useOrbitControls.ts` disappeared during compilation, and an earlier attempt reported errors from the empty `/3d` page and its generated validator.

## Run 4 freeze

Frozen at **2026-11-21T18:49:45.477Z**. The evaluator's `sourceFingerprint()` SHA-256 is `16359d87973d668b3a8a389eb02f8f4bfce6ce028eb5461fb09cb7df4f22ba30`. The 29-file production pipeline surface SHA-256 is `59cd79a93f3ecc3cbe4a47e8e3a772bf95fe92c8b4154713c45f8f6ec606a985`, computed over the sorted JSON array of path and UTF-8 contents. This separately covers the browser client and both HTTP routes.

The [freeze marker](pipeline-frozen-run4) and [evaluator handoff](pipeline-speed-handoff.md) are in the writable log directory. The session mounts `.agents` read-only.

## Demo PLC follow-up

The before result is the [saved demo answer](../../demo/out/shots/take-2AkyeS/capture-answer.txt). The after result is one live `POST /api/analyze` of `photo-032.jpg` at the same Filler 3 pin, approximately `(830, 675)`. The after run ID was `db30599d-533a-4939-bd22-4e2b0d32686d`.

| Output | Saved demo | Live after |
| --- | --- | --- |
| As dropped, Filler 3 at Purdue 1 | Passed · **0** rules-engine paths | Passed · **1** rules-engine path for local physical exposure to the PLC |
| Final recommended placement | Water treatment, Purdue 1 · cleared · **0** paths | Packaging, Purdue 1 · cleared · **0** paths |
| Never here | Filler 3, Purdue 1 · washdown rating and hygienic enclosure unverified | Empty. The transcript records the superseded Filler 3 exclusion. |
| As-dropped findings | Exposed ports, washdown, unmanaged asset | `PHYS-01` severity 3, `WASH-01` severity 3, `MGMT-01` severity 2 |

Scout reported MPI and PROFIBUS DP for the SIMATIC S7-300 CPU 314C-2 DP. The existing rules already recognized exposed PROFIBUS, but the generic capture criticality left the controller outside the graph's high-consequence targets. The captured PLC now carries provisional operational criticality 4. The rules engine can show the PLC's local port exposure without assuming a safety role or bridging it to an Ethernet switch. Captured PLCs with documented Ethernet or PROFINET get a labeled simulated link to the nearest available switch in the same room, zone and level. Siemens lists PROFINET on the separate PN/DP variant. [Siemens SIMATIC catalog](https://cache.industry.siemens.com/dl/files/167/109744167/att_1145924/v1/simatic-st70-complete-english-2023.pdf)

The final assessment removes absolute exclusions for an exact passed drop or cleared recommendation. Other room and level restrictions remain, and a held alternative stays on hold. In the live run the washdown caution stayed visible as an Inspector finding after reconciliation. Checked placement arrived at 22.274 s, and the Neon briefing took another 4.563 s.

`npx tsc --noEmit` passed. `npx vitest run src/pipeline src/gemini --maxWorkers=1` passed all 148 tests.
