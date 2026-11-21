# Watch relevance

The live desk checks CISA KEV, CISA ICS, NCSC and openFDA. Matching uses the current twin's inventory and modeled exposure. Product identity, version evidence, sector and OT terms, KEV, CVSS and publication age contribute to ranking. Only rows with a plant asset appear in the main list. The rest sit behind one disclosure.

openFDA supplies up to 14 records from the last 180 days. Product records from one FDA event share a row. The reported reason maps foreign material to inspection and the filler, labeling to the labeler, microbial control to the filler and CIP controller, and chemical control to the CIP make-up tank and conductivity transmitter. Each estimate is conditional on the comparable event occurring in simulated Line 3. For an item with several assets, the figure prices one event at the lead asset and the drawing highlights all matches.

The public check runs on mount, every ten minutes and on **Run now**. The new marker compares against each publisher's prior successful check. openFDA has an eight-second deadline and a shared ten-minute server cache. Its source dot exposes cache, latency and failure details. The existing daily model review and manual Chief update continue through the Decisions and Neon stream.

## Mount

`WatchPanel.tsx` mounts `WatchSignalDesk` through the existing Data lens integration. The temporary preview compiled before the QA handoff and was removed after the main mount. [Mounting lines](../../src/watch/MOUNTING.md)

## Verification

- The final `npx tsc --noEmit` passed. `npx vitest run src/watch --maxWorkers=1` passed 39 tests with three existing network smoke tests skipped. The first typecheck hit `src/health/runner.test.ts`, which had been corrected by the second run.
- The running `GET /api/watch/feeds` returned 21 KEV records, 19 ICS advisories, two NCSC items and four openFDA recall events. The live payload produced seven modeled rows and 39 other items. The Siemens advisories linked to `FW-EDGE` and `FW-DMZ`. Voila juice linked to `FIL-3` and `PLC-BL` at $3M est. per comparable event. The 7up and Wawa recalls linked to `LBL-3` at $2.8M est. each. The Weis apple cider recall linked to `TK-311` and `CT-210` at $2.3M est.
- The live `POST /api/watch/run` finished with three genuine Decisions answers and marked each match uncertain. Neon returned the Chief summary in 17.9 seconds. A verification run joined those Decisions answers to the public feed rows and checked that recall rows remained rule-matched.
- The root returned HTTP 200 with the new desk in the compiled client bundle. Rendering the desk with the genuine feed and review payloads verified the four healthy source indicators, ranked rows, SVG loss figures, Chief line, new badge, external link attributes and the closed remainder. The full KEV catalog corroborated seven ICS advisories, including both `FW-DMZ` matches.

## Files

- Panel and style. `WatchPanel.tsx`, `WatchResults.tsx`, `WatchSignalDesk.tsx`, `WatchLiveLoss.tsx`, `watchSignals.css`.
- Modeling. `relevance.ts`, `recallImpact.ts`, `inventory.ts`, `watchLoss.ts`.
- Live checks. `feeds/openFda.ts`, `feeds/index.ts`, `liveTypes.ts`, `liveHistory.ts`, `useWatchLive.ts`, `src/app/api/watch/feeds/route.ts`.
- Tests and mount notes. `relevance.test.ts`, `liveChecks.test.ts`, `MOUNTING.md`.

## Coverage

Cyber evidence comes from publisher feeds and the simulated inventory, with CVSS when present and version matches limited to explicit evidence. openFDA updates its public enforcement dataset weekly. [openFDA Food Enforcement](https://open.fda.gov/apis/food/enforcement/)

Interactive and screenshot verification is pending. macOS denied Chrome Mach-port registration for the headless launch. The native Chrome control timed out and the Chrome browser host was unavailable. `/private/tmp/pyre-watch-relevance-browser.mjs` is the prepared single-browser check for both requested viewports.
