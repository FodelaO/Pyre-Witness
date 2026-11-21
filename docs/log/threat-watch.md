# Daily threat watch

Threat Watch checks public advisories and incident notices against the current simulated twin. The results rail mounts `@/watch/WatchPanel` to schedule a run on the first load of each UTC day. The panel posts the twin to `/api/watch/run` and offers a manual rerun. Its browser cache restores same-day local and managed reports along with pending proposals. Separate decision receipts skip applied and rejected proposals. On restore, pending effects are checked and measured against the current twin before they re-enter the approval queue.

## Sources and matching

| Source | Coverage |
| --- | --- |
| [CISA KEV](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Catalog inclusion date, publisher vendor and product, and CVE |
| [CISA ICS](https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml) | RSS publication date, advisory identifier, and CVEs present in the feed |
| [UK NCSC news](https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml) | Publisher news and incident context |

The server downloads all sources concurrently and reports each source's count, elapsed time and failure, if any. An eight-second deadline covers each download. Successful results are shared in a 30-minute process cache and filtered to the last 14 × 24 hours on every run. KEV date-only values represent midnight UTC. Feed summaries are plain text and links come from publisher data.

`src/watch/inventory.ts` maps seed tags to assumed product families and versions. The pure `inventoryFor(assetId)` lookup exposes an entry for the asset inspector. The watch joins those entries to the submitted twin's Purdue levels, protocols, radios and remote-access flags. Recorded identity on added devices comes from their capture data. The matcher requires a product-family term, rules out conflicting publisher vendors, and ranks exact version mentions and relevant interfaces. Version ranges, product editions and reachable interfaces require triage. The report displays up to 24 candidate pairs.

## Model and rules stages

1. The watch shortlists up to 16 pairs scoring at least 9. Decisions API submits three questions per pair on `v1beta` in up to two concurrent batches of eight. It scores applicability, plausible modeled exposure and operational severity on a five-level rubric. If a batch fails, only its candidates escalate as uncertain. Lower-ranked matches stay visible as candidates.
2. Neon uses native structured output with the surviving pairs, current rules-engine findings, simulated placement context, and ATT&CK for ICS vocabulary. Its prompt asks for source-grounded defensive findings and proposed controls. Advisory impact is an estimate and can be null.
3. The server validates the draft with Zod, binds each finding to publisher evidence and matched asset IDs, and reports dropped advisory, asset, technique or effect references. It evaluates each valid proposal independently by applying the effects to a copy of the snapshot. Physical proposals can add safeguards such as `port-lock` and `locked-cabinet`. The measured delta is the rules-engine difference from baseline. Zero or positive deltas remain visible. A patch-review note is recorded on approval and has a zero modeled delta.
4. The client submits validated proposals to the shared twin store for a human decision. If the twin's assessed state changes during a run, the proposals wait for a fresh run. Approval applies the effects in the simulated twin and recomputes its score. Rejection records the decision. Source and stage entries use the Chief's watch activity feed.

The comparison button posts to `/api/watch/managed`. The route starts Antigravity on `v1beta` in a Google-hosted remote environment with egress limited to the feed publishers. It asks the agent to retrieve the same feeds and save `/workspace/watch-report.json` because the preview agent lacks native structured output. The server extracts JSON from the artifact or recovers it from the sandbox read-back and final interaction response. It retains individually valid findings and proposals even when the agent omits fields or feeds. The report labels partial results and explains gaps in its run notes. Citations must still match the locally verified candidate set before a proposal can enter the approval queue. The reduced twin snapshot omits IP addresses, asset descriptions and process telemetry. [Managed Agents quickstart](https://aistudio.google.com/docs/managed-agents-quickstart) · [Antigravity agent](https://aistudio.google.com/docs/antigravity-agent)

## Verification

```sh
npm run typecheck
npx vitest run src/watch --maxWorkers=1
WATCH_LIVE=1 npx vitest run src/watch --maxWorkers=1
npx tsx -e 'import { SEED_TWIN } from "./src/twin/seed"; process.stdout.write(JSON.stringify(SEED_TWIN));' |
  curl -s -N -X POST http://localhost:4119/api/watch/run -H 'Content-Type: application/json' --data-binary @-
npx tsx --env-file=.env scripts/daily-watch.ts
```

The headless command runs from the repository by default. An optional positional JSON path provides a different twin. It writes `watch/reports/<UTC-date>.json` atomically. A failed model stage produces a partial report and exit status 1. `npx tsx scripts/daily-watch.ts` also exercises the missing-key path when there is no `.env` file.

On November 21, the running local endpoint streamed 21 KEV entries, 19 ICS advisories and two NCSC entries. It returned three candidate pairs, a 46.09 baseline score, and explicit missing-key errors from both model stages. The managed endpoint returned its missing-key status. The headless runner wrote the same partial result in a temporary directory. A client harness consumed the running app's stream, admitted one daily run, rendered the source chips and matched asset tags, and recorded seven Chief activity entries. Fixture tests exercised publisher formats, matching, grounded effects, numerical deltas, and approval and rejection through the real store.

The follow-up passed whole-repo typecheck and all 24 watch tests with live feed smoke tests enabled. Regression tests cover concurrent Decisions batches, isolated batch failure, partially recovered managed artifacts, same-day restoration with no repeated request, and measured safeguards that apply only after approval. Before the follow-up, a whole-suite run failed the Inspector's existing 15 ms p95 benchmark. The measured p95 on the single-worker retry was 31.09 ms.

The follow-up started without `.env`. The key was present on recheck, so the same runner exercised both Gemini stages against 42 live records and three candidate pairs. Decisions returned all three as uncertain. The first Neon request reached its 45-second deadline. With a shorter report prompt and an 85-second deadline, the retry finished in 21.8 seconds and produced three patch-review proposals, each scoring a zero-point change in the rules engine.

The first hosted run completed, then its artifact download returned HTTP 404. After the workspace-path fix, Antigravity completed in 75.3 seconds and its artifact downloaded over HTTP 200. The managed report correctly marked itself partial after the sandbox's CISA ICS fetch failed. The sandbox recorded 21 KEV and two NCSC records. The local fetch independently verified 19 ICS records. Both watch routes returned HTTP 400 for a malformed twin.

## Live HTTP and CLI verification on November 21

Both model stages completed on `v1beta`. The updated run strips escaped RSS markup and uses a smaller structured schema for procedural notes when all shortlisted pairs are uncertain. The full effect schema is available when at least one pair is supported.

| Stage | Initial HTTP | Updated HTTP | CLI |
| --- | ---: | ---: | ---: |
| Public feeds | 1 ms | 1 ms | 380 ms |
| Inventory matching | 22 ms | 18 ms | 15 ms |
| Decisions triage | 406 ms | 534 ms | 573 ms |
| Neon reassessment | 38,818 ms | 16,042 ms | 17,404 ms |
| Rules-engine measurement | 2 ms | <1 ms | 1 ms |
| End to end | 39.25 s | 16.60 s | 18.66 s |

The HTTP feed cache was warm. The CLI fetched its own copies and wrote `watch/reports/2026-11-21.json` in a temporary QA directory. Each run used 42 recent records, including 21 KEV, 19 CISA ICS, and two NCSC. The three real advisories referenced product families in the simulated inventory. Decisions left all three uncertain given the assumed bill of materials and incomplete version evidence.

| Advisory | Candidate asset | Assumed product |
| --- | --- | --- |
| [ICSA-26-321-07](https://www.cisa.gov/news-events/ics-advisories/icsa-26-321-07) | `FW-EDGE` | FortiOS |
| [ICSA-26-316-04](https://www.cisa.gov/news-events/ics-advisories/icsa-26-316-04) | `FW-DMZ` | PAN-OS |
| [ICSA-26-316-05](https://www.cisa.gov/news-events/ics-advisories/icsa-26-316-05) | `FW-DMZ` | PAN-OS |

Neon produced three procedural proposals to verify applicability and review patches. Each measured a 0-point change on the 46.09 baseline. The Watch panel renders the advisory chips, measured proposals, and linked approval controls in the same section.

`POST /api/watch/managed` streamed Started at 2.87 s and Running at 8.28 s. Environment `4387645d1a9e3087cd8038e6d0f8ad45` returned its report in 72.05 s end to end. Its artifact recorded 21 KEV and two NCSC items with the CISA ICS source unavailable. The Watch comparison displays that provider environment ID, its elapsed time, the reported source counts, and the partial-result label alongside the local watch.

The live app exposed the top-bar Watch button. A component and store harness restored both captured live reports and verified the rendered advisory rows, `FW-EDGE` and `FW-DMZ` chips, three measured proposal cards, and the managed comparison. The shared store recorded one approval and one rejection and kept the 46.09 score for the procedural notes. Native Chrome's separate QA tab did not render a usable viewport, and the macOS sandbox blocked the isolated Playwright browser launch. Visual hover and browser button clicks remain unverified.

Final whole-repo `npm run typecheck` passed. `npx vitest run src/watch --maxWorkers=1` passed 22 tests with the three live source tests skipped by default. The live source run passed all 25 tests after excluding archived evaluation snapshots.

## Open items

- Feed coverage is limited to publisher-provided entries and summaries. NVD is outside this implementation. The browser schedules the first mount of each UTC day. Unattended scheduling uses the headless runner through cron.

No shared-contract changes are needed.
