# Crew plates and transcript QA

| Defect | Cause and fix | Before | After |
| --- | --- | --- | --- |
| Dock text cut mid-word and attention text could wrap | The status and latency competed for one line. Latency now sits beside the crew name, and the status fits complete words to the available width. The tooltip includes the full message. | [Run](shots/fix-crew-plates-before-dock.png) | [Light](shots/fix-crew-plates-after-dock-light.png), [dark](shots/fix-crew-plates-after-dock-dark.png) |
| T focused All runs | The modal focused its first tabbable control by default. It now focuses the heading on open. Tab reaches All runs and Escape closes the drawer. | [Drawer](shots/fix-crew-plates-before-transcript.png) | [Light](shots/fix-crew-plates-after-transcript-light.png), [dark](shots/fix-crew-plates-after-transcript-dark.png) |
| Rules check badge on the Parking Lot title row | The placement search reserved room titles but skipped context-area title rows. It now considers those rows and the checked room together, places the verdict first, and fits the placement caption below it when needed. | [1280×720](shots/fix-crew-plates-before-badge-1280.png) | [Light](shots/fix-crew-plates-after-badge-1280-light.png), [dark](shots/fix-crew-plates-after-badge-1280-dark.png) |
| 3D returning state diverged and resting plates overlapped | The billboard interpreted the raw store value separately from the dock and used estimated dimensions. Both surfaces now share the same readout. Actual plate bounds determine stem offsets. | [Return](shots/fix-crew-plates-before-3d-return.png), [desks](shots/fix-crew-plates-before-3d-overlap.png) | [Light return](shots/fix-crew-plates-after-3d-return-light.png), [dark return](shots/fix-crew-plates-after-3d-return-dark.png), [light desks](shots/fix-crew-plates-after-3d-overlap-light.png), [dark desks](shots/fix-crew-plates-after-3d-overlap-dark.png) |
| Syrup patrol portrait masked by the Filler 3 title | The route planner could fall back to a stop that crossed a title band. Patrol stops now require clearance for the whole portrait and nameplate. The planner tries more room positions and skips a visit if all reachable positions cover a title. | [Syrup stop](shots/fix-crew-plates-before-syrup.png) | [Light](shots/fix-crew-plates-after-syrup-light.png), [dark](shots/fix-crew-plates-after-syrup-dark.png) |

## Verification

- Playwright checked the running app at `http://localhost:4119/` in light and dark, with 2D selected through `pw-view` and 3D checked at the default camera. The sandbox blocked installed Chrome at launch. The cached Chrome Headless Shell ran with SwiftShader and software compositing.
- The before shots come from the earlier QA capture. The after shots for run states replay the archived real events from `.agents/qa/qa2-crew/export.json` in an isolated browser session. The 3D return used the normal idle patrol. Zero new Gemini captures.
- The Inspector card held at 58 px and displayed `Recommendation…` with its full tooltip and 31 ms latency. At 1280×720 the badge ended about 30 px above the rendered Parking Lot title. The placement caption remained visible. Four 3D plate rectangles were pairwise clear at the desks and during the sampled return.
- `npm run typecheck` passed before the final numeric badge adjustment, which was checked at 1280×720 in both themes. `npx vitest run src/crew src/transcript --maxWorkers=1` passed 47 tests in six files. Added regression coverage for parking title exclusion and a patrol route with every stop blocked.
- At crowded zoom levels the layout can omit a caption until a title-safe position is available.

## Files changed

- `src/crew/` · `CrewDock.tsx`, `DockMessage.tsx`, `crewDock.css`, `useCrewReadout.ts`, `CrewLayer.tsx`, `floorLayout.ts`, `floorLayout.test.ts`, `patrol.ts`, `walk.ts`, `walk.test.ts`
- `src/transcript/` · `TranscriptDrawer.tsx`, `transcript.css`
- `src/view3d/` · crew billboard sections of `Overlay.tsx` and `view3d.css`
- `docs/log/` · this log and the linked screenshots

No shared-contract requests.

## Office health

| Defect | Cause and fix | Before | After |
| --- | --- | --- | --- |
| Gemini status occupied the top bar while the crew cards lacked engine health | The top bar owned the services trigger. The dock now owns one Gemini button beside the transcript and shows model status on the engine lines or compact portrait rings. The Inspector indicates local deterministic execution. | [Dock](shots/office-health-before-dock-light-2d-1440x900.png), [top-bar board](shots/office-health-before-board-light-2d-1440x900.png) | [Dock](shots/office-health-after-dock-light-2d-1440x900.png), [light board](shots/office-health-after-board-light-2d-1440x900.png), [compact dark board](shots/office-health-after-board-dark-2d-1280x720.png) |

The [Gemini health log](gemini-health.md#crew-dock-integration) links all eight board checks across light, dark, 2D, and 3D.

## Crew work in 3D

| Defect | Cause and fix | Before | After |
| --- | --- | --- | --- |
| Crew work was mostly portraits and status text in 3D | The 3D overlay consumed status and position only. It now projects the shared walk and handoff cues, displays capture evidence and checks, draws the placement arrow, and pins Chief's briefing. | [Light baseline](shots/crew-work-3d-before-light.png) | [Scout photo](shots/crew-work-3d-photo-preview-qa.png), [Inspector trace](shots/crew-work-3d-replay-light-trace.png), [briefing](shots/crew-work-3d-briefing-light.png) |
| Full inactive plates and an obsolete caption reservation crowded work labels | Compact inactive portraits, measured label bounds, priority, and alternate anchors make room for the evidence beside the dropped device. The layout reserves the actual controls and briefing. | [First live pass](shots/crew-work-3d-live-06s.png) | [Evidence and ranking](shots/crew-work-3d-replay-light-evidence.png), [checked placement](shots/crew-work-3d-replay-light-cleared.png) |

See the [3D work log](view3d.md#crew-work-in-the-main-3d-twin) for live and replay verification.
