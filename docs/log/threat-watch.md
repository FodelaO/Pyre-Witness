# Daily threat watch

Threat Watch checks public advisories and incident notices against the current simulated twin. The results rail can mount the default export from `@/watch/WatchPanel`. Mount it on initial page load to enable the once-per-UTC-day run. The panel posts the twin to `/api/watch/run` and offers a manual rerun. Its browser cache restores the day's evidence after reload. Proposals and decisions live in the active twin session.

## Sources and matching

| Source | Coverage |
| --- | --- |
| [CISA KEV](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Catalog inclusion date, publisher vendor and product, and CVE |
| [CISA ICS](https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml) | RSS publication date, advisory identifier, and CVEs present in the feed |
| [UK NCSC news](https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml) | Publisher news and incident context |

The server downloads all sources concurrently and reports each source's count, elapsed time and failure, if any. An eight-second deadline covers each download. Successful results are shared in a 30-minute process cache and filtered to the last 14 × 24 hours on every run. KEV date-only values represent midnight UTC. Feed summaries are plain text and links come from publisher data.

`src/watch/inventory.ts` maps seed tags to assumed product families and versions. It reads live Purdue levels, protocols, radios and remote-access flags from the submitted twin. Recorded identity on added devices comes from their capture data. The matcher requires a product-family term, rules out conflicting publisher vendors, and ranks exact version mentions and relevant interfaces. Version ranges, product editions and reachable interfaces require triage. Candidate pairs are capped at 24.

## Model and rules stages

1. Decisions API batches three questions per pair on `v1beta`. It scores applicability, plausible modeled exposure and operational severity on a five-level rubric. It excludes confident applicability negatives and escalates uncertain pairs to Neon with the uncertainty flag.
2. Neon uses native structured output with the surviving pairs, current rules-engine findings, simulated placement context, and ATT&CK for ICS vocabulary. Its prompt asks for source-grounded defensive findings and proposed controls. Advisory impact is an estimate and can be null.
3. The server validates the draft with Zod, binds each finding to publisher evidence and matched asset IDs, and reports dropped advisory, asset, technique or effect references. It evaluates each valid proposal independently by applying the effects to a copy of the snapshot. The measured delta is the rules-engine difference from baseline. Zero or positive deltas remain visible. A patch-review note is recorded on approval and has a zero modeled delta.
4. The client submits validated proposals to the shared twin store for a human decision. If the twin's assessed state changes during a run, the proposals wait for a fresh run. Approval applies the effects in the simulated twin and recomputes its score. Rejection records the decision. Source and stage entries use the Chief's watch activity feed.

The comparison button posts to `/api/watch/managed`. The route starts Antigravity on `v1beta` in a Google-hosted remote environment with egress limited to the feed publishers. It asks the agent to retrieve the same feeds and save a report file because the preview agent lacks native structured output. The server polls the Interaction, downloads `watch-report.json`, validates it, binds citations to the locally verified candidate set, and measures proposed effects with the same rules engine. The reduced twin snapshot omits IP addresses, asset descriptions and process telemetry. [Managed Agents quickstart](https://aistudio.google.com/docs/managed-agents-quickstart) · [Antigravity agent](https://aistudio.google.com/docs/antigravity-agent)

## Verification

```sh
npm run typecheck
npx vitest run src/watch
WATCH_LIVE=1 npx vitest run src/watch
npx tsx -e 'import { SEED_TWIN } from "./src/twin/seed"; process.stdout.write(JSON.stringify(SEED_TWIN));' |
  curl -s -N -X POST http://localhost:4119/api/watch/run -H 'Content-Type: application/json' --data-binary @-
npx tsx --env-file=.env scripts/daily-watch.ts
```

The headless command runs from the repository by default. An optional positional JSON path provides a different twin. It writes `watch/reports/<UTC-date>.json` atomically. A failed model stage produces a partial report and exit status 1. `npx tsx scripts/daily-watch.ts` also exercises the missing-key path when there is no `.env` file.

On November 21, the running local endpoint streamed 21 KEV entries, 19 ICS advisories and two NCSC entries. It returned three candidate pairs, a 46.09 baseline score, and explicit missing-key errors from both model stages. The managed endpoint returned its missing-key status. The headless runner wrote the same partial result in a temporary directory. A client harness consumed the running app's stream, admitted one daily run, rendered the source chips and matched asset tags, and recorded seven Chief activity entries. Fixture tests exercised publisher formats, matching, grounded effects, numerical deltas, and approval and rejection through the real store.

SDK request inspection confirmed the expected API versions, Decisions questions, Neon JSON response format and restricted Antigravity environment before transport. Whole-repo typecheck and the 15 watch tests with live smokes passed. A whole-suite run failed the Inspector's existing 15 ms p95 benchmark. The measured p95 on the single-worker retry was 31.09 ms.

## Open items

- Live Decisions, Neon and Antigravity completions require a server `GEMINI_API_KEY` with access to those endpoints.
- The default panel export is available for the side panel or shell owner. The live plant rail did not show a mount during inspection.
- Feed coverage is limited to publisher-provided entries and summaries. NVD is outside this implementation. The browser schedules the first mount of each UTC day. Unattended scheduling uses the headless runner through cron.

No shared-contract changes are needed.
