# qa-crew: AI crew and transcript QA pass

Scope: `src/crew/**` (except `types.ts`), `src/transcript/**`, `src/app/crew-review/**`.
Checked in the running app with Playwright + installed Chrome (scripts in `.agents/qa/qa-crew/`). Used both
allowed real captures ("LTE gateway with an external antenna", via Describe device), one at a time.

## Defects found

| # | Defect | Status | Shots |
| --- | --- | --- | --- |
| 1 | Dock live status ran past the card edge mid-word ("idle patrol · LT-301 60% · in") with no ellipsis: the readout grid's implicit `auto` column grew to fit the text. | Fixed: `minmax(0,1fr)` column + `min-inline-size:0` on the row items. It now ends in "…" and the full text is in the card `title`. | after: `shots/qa-crew-after-idle-1440.png` |
| 2 | Idle patrol: Scout's badge stood on top of the "BLENDING & CARBONATION" title and its CO₂ chip (the slot above the tank was picked first and nudged into the title band). | Fixed in `walk.ts`: standing slots now rank clear first, then over equipment tags, then over room titles (exact stops are unchanged). Regression test added. | after: `shots/qa-crew-after-patrol.png` |
| 3 | Scout evidence chips were cut off at the card edge with no ellipsis ("Described as an LTE gateway with an"). | Fixed (same grid `auto` track bug in `crew.css`). | before: `shots/qa-crew-before-run-evidence.png`, after: `shots/qa-crew-after-run-evidence.png` |
| 4 | Run bubbles covered room titles (FILLER 3, PACKAGING, WATER TREATMENT) and could sit under the zoom buttons / legend. | Partly fixed: `useCrewViewport` now measures `.pw-floor-zoom` and `.pw-floor-legend-card` as obstacles. Room titles are avoided only when a title-free slot exists beside the speaker. The first try sent bubbles to far edge slots with long leader lines, which read worse; the final rule falls back to the old placement instead. That final tweak is typechecked and unit-tested only: both real captures were already used. | before: `shots/qa-crew-before-run-bubbles.png`, intermediate: `shots/qa-crew-after-run-edge-callouts.png` |
| 5 | Late `summary.done` after `run.completed`. | Already handled by the director (`awaitingBriefing`) and the store. Confirmed live: Chief stayed "Writing the briefing…" through completion and then pinned the briefing about 38 s later. Added the director test the brief asked for (late briefing delivered once; duplicate and stray-run cues ignored). | `shots/qa-crew-late-briefing.png` |
| 6 | Dock card click: the transcript opens filtered (CREW = Inspector) but the floor does not pan at the default Fit pose. | Not fixed (floor-owned camera clamp). Request written: `.agents/requests/qa-crew.md` #1. | `shots/qa-crew-dock-transcript.png` |
| 7 | At 1280x720 the dock is a full-width strip and takes about 100 px from the plant. | Not fixed (shell CSS). Request #2. | `shots/qa-crew-after-idle-1280.png` |

## Verified OK (no change needed)
- Office: four desks, vacant-desk ghost ("IN"/"SC" initials) when a member is out; "idle patrol" heading on patrol bubbles; patrol never runs during a run and the bubble fades.
- Choreography: Scout reads, then evidence chips; hand-off; Inspector as-dropped check with rule stamps (MGMT-01, WASH-01, RF-01); Architect proposal arrow and "Recommended placement"; Chief walks and pins the briefing. The active member's dock card is highlighted (`data-active`).
- Transcript: steps in order with engine, time, latency, tokens; raw JSON toggles; request text for model calls; SIMULATION tags on sim runs; run and crew filters; search. JSON and Markdown exports both downloaded with 5 runs: no `AIza…` key, no base64 image data, same runs. Opened after 1 real run + 4 simulation runs without lag (it was not tested after 3 real runs, to save quota).
- Reduced motion: every looping crew/dock animation is under a `prefers-reduced-motion` rule; the store plays walks instantly when the preference is set.

## Files changed
- `src/crew/crewDock.css`: dock status ellipsis.
- `src/crew/crew.css`: evidence chip ellipsis.
- `src/crew/walk.ts`: standing-slot ranking (off titles, then off tags).
- `src/crew/useCrewViewport.ts`: zoom and legend measured as callout obstacles.
- `src/crew/CrewLayer.tsx`: zoom/legend obstacles; title-free callout only when it is beside the speaker.
- `src/crew/director.test.ts`: late-briefing test. `src/crew/walk.test.ts`: badge-off-title test.

## Verification
`npm run typecheck` clean. `npx vitest run src/crew src/transcript --maxWorkers=1`: 6 files, 39 tests pass.

## Remaining / notes
- The patrol bubble's thin leader line can still cross a room title.
- The disk was full during this pass (about 120 MB free on /System/Volumes/Data) and Chrome failed once with ENOSPC. Not caused by this task (its QA folder is 13 MB). Other agents and the dev server may hit it too.
- A `429 Too Many Requests` console error shows on load (Gemini status/health polling). Not in this sector.
