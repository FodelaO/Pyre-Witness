# qa-panel: right-hand panel audit

Scope: `src/panel/**`, `src/watch/**`, `src/modeler/**`. Looked at the running app with headless Chrome at 1440x900,
1920x1080 and 1280x720 (at 1280 the panel is the "Plant details" drawer). Screenshots: `docs/log/shots/qa-panel/`.
Driver: `.agents/qa/qa-panel/shoot.mjs` + `steps.mjs`.

## Defects found and fixed

| # | Defect | Fix | Before | After |
| --- | --- | --- | --- | --- |
| 1 | Inspector kind line read "Plc Cabinet", "Hmi" (CSS capitalize on the raw kind id). | `kindLabel()` in `PanelParts.tsx` keeps acronyms: "PLC cabinet", "HMI", "Wi-Fi AP". | `before-inspector-plc.png` | `after-inspector-plc.png` |
| 2 | "Conduit None" row on every asset without a conduit. | Row only shown when a conduit exists. | `before-inspector-plc.png` | `after-inspector-plc.png`, `after-inspector-firewall.png` |
| 3 | Tanks, valves and sensors showed two empty readouts: "Software identity unavailable." and "No completed Threat Watch report." | `AssetDataEvidence` renders nothing when the asset has no software identity and no advisory. Empty advisory text cut to "None matched." / "Threat watch has not run." | `before-inspector-tank.png` | `after-inspector-tank.png` |
| 4 | Threat watch listed three rows all titled "Siemens RUGGEDCOM APE1808" with nothing to tell them apart (the CVE and the triage verdict were only in a tooltip). | Each row leads with the CVE id (`+N` when more) and a triage chip (`uncertain` in attention colour). | `before-watch-advisories.png` | `after-watch-advisories.png` |
| 5 | "Watch recommendations" heading wrapped to two lines and its "Awaiting approval · 3" chip wrapped too. | Heading is "Recommendations" (it already sits inside Threat watch); heading chips never wrap. | `before-watch-recommendations.png` | `after-watch-recommendations.png` |
| 6 | Proposal cards were inconsistent: "−3 risk pts projected" pushed Approve / Reject to a second line, "0 risk pts projected" did not. | Label is "pts projected" / "pts measured" (full wording in the tooltip); the action row never wraps. | `before-mitigations.png` | `after-mitigations.png` |
| 7 | "Last check" and "Antigravity comparison" used the browser's default triangle markers, unlike every other disclosure. | Same chevron, right-aligned, rotates when open. | `before-watch-recommendations.png` | `after-watch-approve-reject.png` |
| 8 | "Where it goes" card stacked three disclosures (position hint, "Physical constraints", "Network rationale") between the place and the button. | Card reads place, level chip, one "Why here N" disclosure, `Move there`. All sentences are inside the one disclosure. | `before-answer-card.png` | `after-answer-card.png` |
| 9 | Crew activity had two nested scrollers (disclosure body 234 px around a 208 px list). | The entry list is the only scroller, capped at `min(18dvh, 180px)`; the feed's extra padding and rule are removed inside the panel. | `before-crew-feed.png` | `after-crew-feed-1280.png` (1280 only, see gaps) |
| 10 | Attack path chains scrolled sideways inside the card (291 px visible of up to 443 px), hiding the target node. | Chains wrap; no horizontal scroll anywhere in the panel. | measured in `capture` run (hscroll 291/443) | `after-attack-paths.png` (no hscroll in metrics) |
| 11 | "Modelled from" strip: seven chips repeating "No import" / "Not connected". | Four import chips with a count (dim at 0, tooltip says "No import this session"), one line "Not connected · Historian · CMMS · Network scan". | `before-modeler.png` | `after-modeler.png`, `after-modeler-review.png` |

Honesty labels checked after the changes: "Rules engine findings", "Rules engine cleared", "idle patrol", "est.",
"Assumed software", "Assumed inventory · simulated plant", "Simulated plant: seed model", "AI-generated visualisation",
"AI guidance" are all still on screen. Nothing mocked or timed was added.

## Checked and left as is

- Plant risk header at all three sizes: ring, band word, baseline delta, session trend, loss line all fit. Risk moved
  46 -> 49 on capture and back to 46 on approving the relocation ("−3 pts measured").
- Threat watch: feed chips with counts, "No exposed asset" for news, approve then reject on restored proposals (decision
  rows read "0 pts measured" and "Rejected"), Antigravity row opens to one button. I did not run the Google-hosted watch.
- Model the twin: drop zone, tiny CSV (2 rows) -> two proposals with cited lines, accept toggles "Add accepted · 1".
  I did not apply it and did not exercise the error state.
- Hold state wording was read in code only ("No compliant spot: hold"); neither capture produced a hold.
- Loss figure `Show more`: no clipped numbers, no horizontal scroll at 345 px. It is long (request 5).

## Not fixed

- Everything in `.agents/requests/qa-panel.md` (loss qualifier after the move, event vs annual units, breakdown length,
  fit preview tile, stale generated types).
- Session trend with a single reading is one dot on a dashed line. Left alone: it is honest and small.
- Sensors (`LT-101`) could not be selected by the script in the Both lens; the inspector for instruments was not seen.

## Model calls I made

- Deliberate: 1 Threat watch `Run now`, 2 text captures (the second to verify the changed answer card), 1 CSV ingest.
- Not deliberate: my first 13 page loads used a fresh browser profile, and each one started the automatic daily Threat watch
  run. Most pages closed within 10 to 60 s, but at least one stayed open for two minutes, so some of those runs will have
  reached the Neon step. The brief allowed one. From 13:47 the script marks the day as attempted and replays a saved report.

## Verification

- `npx vitest run src/panel src/watch src/modeler --maxWorkers=1`: 17 files, 65 passed, 3 skipped, run after the last edit.
- `npm run typecheck`: clean twice during the session. The final runs fail only in `.next/dev/types/validator.ts`, a
  generated file pointing at `src/app/call/[code]/page.js`, which is not mine (request 2).
- The dev server stopped answering at about 14:06 (request 1) and was still down when I stopped. The crew feed fix was seen
  once at 1280x720 just before, with a one-entry feed, so the long-feed case and the 1440 / 1920 re-shoots are outstanding.
  Every other change was re-shot after it landed.

## Files changed

- `src/panel/PanelParts.tsx` (`kindLabel`), `AssetInspector.tsx`, `AssetDataEvidence.tsx`, `PlacementAnswer.tsx`,
  `MitigationQueue.tsx`, `panel.css`
- `src/watch/WatchResults.tsx`, `WatchPanel.tsx`
- `src/modeler/SourcesStrip.tsx`, `modeler.css`
