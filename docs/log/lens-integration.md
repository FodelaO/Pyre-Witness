# Pipeline lens integration

The main screen centers the Material, Both and Data lens. The three legacy drawing tabs are gone. Data has one Plan/Levels switch, which opens the existing Purdue map beside the data floor with shared selection. Press `1`, `2` or `3` outside an editor to switch lenses.

## Before and after

The starting main screen had Floor, Split and Purdue views. The reference column shows the matching design stop on the standalone review route before integration.

| Viewport | Lens | Main screen before | Reference before | Main screen after |
| --- | --- | --- | --- | --- |
| 1440 × 900 | Material | [Floor](shots/lens-integration-before-floor-1440x900.png) | [Material](shots/lens-integration-reference-material-1440x900.png) | [Material](shots/lens-integration-after-material-1440x900.png) |
| 1440 × 900 | Both | [Split](shots/lens-integration-before-split-1440x900.png) | [Both](shots/lens-integration-reference-both-1440x900.png) | [Both](shots/lens-integration-after-both-1440x900.png) |
| 1440 × 900 | Data | [Purdue](shots/lens-integration-before-purdue-1440x900.png) | [Data](shots/lens-integration-reference-data-1440x900.png) | [Data plan](shots/lens-integration-after-data-1440x900.png) · [Levels](shots/lens-integration-after-levels-1440x900.png) |
| 1920 × 1080 | Material | [Floor](shots/lens-integration-before-floor-1920x1080.png) | [Material](shots/lens-integration-reference-material-1920x1080.png) | [Material](shots/lens-integration-after-material-1920x1080.png) |
| 1920 × 1080 | Both | [Split](shots/lens-integration-before-split-1920x1080.png) | [Both](shots/lens-integration-reference-both-1920x1080.png) | [Both](shots/lens-integration-after-both-1920x1080.png) |
| 1920 × 1080 | Data | [Purdue](shots/lens-integration-before-purdue-1920x1080.png) | [Data](shots/lens-integration-reference-data-1920x1080.png) | [Data plan](shots/lens-integration-after-data-1920x1080.png) · [Levels](shots/lens-integration-after-levels-1920x1080.png) |

## Behavior and checks

- The floor blends the process and data paths over 170–175 ms when snapping and follows the pointer continuously during a drag. The floor camera transform and dock bounds stayed identical between the three Plan stops at both sizes. Software labels expand when crossing 1.5× fit. The drop pin persisted across a lens change.
- FIL-3 hover highlighted 15 assets on the combined floor, including field instruments, PLC-F3 and the upstream chain. Hovering PLC-F3 in Levels highlighted 16 assets across the floor and map. Clicking it on the map selected it on the floor. [Both hover](shots/lens-integration-after-chain-1920x1080.png) · [Levels hover](shots/lens-integration-after-levels-chain-1440x900.png)
- The results rail filters physical and digital evidence using risk kinds and compliance citations. Mixed citations remain available in either lens. Data shows rule findings with ATT&CK IDs, assumed software and the same node-level advisory matcher as the floor. The broader Threat Watch news opens by default in Data. [Data inspector](shots/lens-integration-after-data-inspector-1920x1080.png)
- The four process and two cyber scenarios appear at their corresponding stops. A CIP replay retained transport and speed controls when changing to Data. Approving its mitigation persisted across a switch to Both. Rogue Wireless used the data overlay. [Replay in Data](shots/lens-integration-replay-persists-1920x1080.png)
- Data puts Link and Describe first under “Integrate a new technology”. Material puts Camera and Upload first. Typing `1` in Describe kept the lens on Data. The capture editor keeps its active draft when changing lenses.
- The earlier styling outage came from the explicit Tailwind source scan walking the Git-ignored `eval/runs/` symlink loop. The root stylesheet uses automatic source detection. The main screen, lens preview and modeller load their styles through ordinary CSS imports.
- `npm run typecheck` passed. `npx vitest run src/floor src/purdue src/panel src/sim src/capture src/crew src/layers --maxWorkers=1` passed 95 tests across 21 files. The full suite passed 370 tests with 3 skipped.

## Live captures

- **Data · LTE gateway.** The requested description completed in 25 seconds. The gateway landed on the simulated floor and displayed plant risk went from 46 to 48. The panel proposed the OT DMZ at Purdue L3.5, surfaced the cellular bypass finding with its ATT&CK ID, and reported zero modeled paths in the as-dropped and recommended rules checks. Threat Watch showed three advisories marked uncertain, with affected asset tags. Some advisory vendor names differed from the assumed firewall inventory. [Data composer](shots/lens-integration-capture-data-input-1920x1080.png)
- **Material · RTD probe.** Uploading `eval/dataset/images/photo-015.jpg` completed in 24 seconds. Gemini identified a Pt100 RTD probe and recommended a location near TT-401 in Utilities. The material panel showed the Filler 3 washdown restriction and physical risk. The generated Fit Preview kept its “AI-generated visualisation” label and remained cached when switching to Data and back. [Photo composer](shots/lens-integration-capture-material-input-1920x1080.png) · [Material result](shots/lens-integration-capture-material-result-1920x1080.png) · [Generated fit](shots/lens-integration-capture-material-fit-1920x1080.png)

## Remaining visual issues

1. At 1440 × 900, Levels uses a scrolling rail to reach L0 and the lower Threat Watch results.
2. Both has the highest mark density around the control room and Filler 3. Hover makes the active chain stand out, and zoom exposes the software detail.

The integration uses the existing lens, twin, pipeline run, simulation and watch APIs. Changes are in the shell and styles, floor and lens drawing, results rail, simulation launcher and capture surfaces.

## Follow-up polish

- Removed the injected styles from `/`, `/lens` and the modeller. Each of these surfaces uses the root stylesheet and its CSS imports. A direct compile of that stylesheet included the shell, lens, modeler and Tailwind base styles and found zero inputs under `eval/runs/`.
- Material and Both have one Model the twin disclosure. Source receipts appear inside it. The seed remains labeled **Simulated plant: seed model** and the three connectors remain **Not connected**. The floor draws pointer-transparent ghosts after the normal asset layer only while the review is open.
- A live CSV import observed two inventory rows. The two proposed additions appeared as ghosts, disappeared when the disclosure closed or the lens switched to Data, and returned in Both. Applying the accepted AT-304 row placed one asset in the twin and removed its ghost. [Proposals](shots/lens-polish-diagnostic-modeler-ghosts-1920x1080.png) · [Applied asset](shots/lens-polish-diagnostic-modeler-applied-1920x1080.png)
- Both at fit zoom shows traffic, signals and finding badges with the process drawing and room names. Hover shows the related zone, software and up to two protocol chips. At 1.5× fit, zoom restores the fuller annotation layer. A single card combines the lens key and media filters. The four resting crew portraits fit inside the office row at overview scale.
- Mounting Threat Watch with a same-day cached provider failure made exactly one real request to `/api/watch/run`. The new report replaced the cached run, all five stages completed, and the stale key message cleared. The new report contained three assessed advisories.

| Live capture | Time | Placement recommendation | Rules paths, as dropped → recommendation |
| --- | --- | --- | --- |
| Material · Pt100 probe photo | 26 s | Utilities near TT-401 | 0 → 0 |
| Both · Consumer Wi-Fi security camera | 33 s | Corporate office, Purdue L4 | 9 → 0 |
| Data · Industrial LTE gateway | 29 s | OT DMZ, Purdue L3.5 | 0 → 0 |

All three captures completed through the live UI and landed a device on the floor. The camera run reached the existing briefing timeout and kept its checked placement available. These runs took place while the desktop stylesheet response was wrong, so their placement and panel results were checked in the DOM.

The source-compiled stylesheet was checked in a separate diagnostic browser context at 1440 × 900 and 1920 × 1080. Main, lens, proof and gallery passed the diagnostic reload using that stylesheet. The phone capture page passed a direct hard reload with its linked stylesheet. The running server still intermittently served unrelated CSS at the global stylesheet URL, which blocks direct hard-reload verification of the desktop routes. [Both overview at 1440](shots/lens-polish-diagnostic-both-overview-1440x900.png) · [Both hover at 1920](shots/lens-polish-diagnostic-both-hover-1920x1080.png) · [Phone hard reload](shots/lens-polish-reload-capture-390x844.png)

1. At this check the shared server still returned crew-feed CSS under the `globals.css` chunk marker. The configuration owner later scoped the loader to `globals.css`. The independent QA follow-up below uses the live server’s ordinary stylesheet responses.
2. At 1440 × 900, Data Levels still requires scrolling to reach L0 and the lower Threat Watch entries.

`npm run typecheck` passed. The requested focused Vitest command including `src/modeler` passed 131 tests across 30 files.

## Independent QA follow-up

The baseline used the independent QA captures and fresh Chromium passes at 1920 × 1080 and 1440 × 900. Before the loader change, direct reloads also failed at 1280 × 800 and 1024 × 768. The after checks used `http://localhost:4119/` without response substitution.

| Item | Change and verification |
| --- | --- |
| 1 | Every lens keeps **Where it goes**, **Never here**, **Risks** and **Attack paths**. The lens prioritizes its own risk and compliance rows. The live camera displayed washdown, wireless exposure, ATT&CK evidence and both rules checks after switching back to Material and over to Data. |
| 2 | An incoming data finding opens Both once per capture and announces the change. Holding the slider at Material through the first real RF finding kept it there until release. The red RF path then appeared at both desktop sizes. The live ceramic mug stayed in Material through its revision and final check. |
| 3 | Watch shows a dot and label in every lens. Its top-bar control opened the same disclosure in Material on both desktops and in the narrow drawers. |
| 4 | Data always exposes one Levels toggle. Each split mounted 36 network nodes. Clicking PLC-F3 on the floor selected it in Levels, and clicking FW-DMZ in Levels selected it on the floor at both desktop sizes. |
| B | The four CrewDock cards have a dedicated fit column or strip. `T`, `Esc` and the Inspector card’s transcript filter worked. Gemini services opened **Gemini at work**. App navigation contains neither standalone review route. |
| 5 | Both overview keeps the room names and hides network titles and protocols until there is a hover or detail zoom. Hovering PLC-F3 showed one zone title and zooming showed the fuller annotation layer at both sizes. |
| 6 | Network titles, protocol chips, badges and equipment tags reserve space against one another. Box checks found no collisions at the two Data overview sizes, including CELL F3, FW-DMZ and HMI-F3. |
| 7 | The overview uses solid instrument ticks and fixed-screen tank percentages. ISA letters return at readable absolute zoom. |
| 8 | Padded equipment labels flip above a nearby washdown boundary. HMI-F3 sits above its equipment with the border below. |
| 9 | The top bar, dial and mitigation chips share whole-point risk formatting. The dial and header both showed `+3` for the as-dropped camera. The transcript retains its verbatim evidence. |
| 10 | Proposed effects are rescored against the current twin. The real office move retired its matching proposal as **Already resolved by the move** and left the independent enrollment proposal available. |
| 11 | A final blocking rule removes the move and preview and shows **No compliant spot: hold**, with the best rules-engine alternative when available. The regression rendered the hold for an actual rule-blocked vessel fixture in all three lenses. The supplier URL returned unreadable product details on the live retry. Describe captured the vessel and detected the as-dropped compliance blocker, then the rules engine cleared the new recommendation. |
| 12 | Temporary capture IDs display the device type on the floor, Levels, linked paths and mitigation targets. The camera and mug showed their types. The inspector retains the internal ID. |
| 13 | Direct reloads at 1280 × 800 and 1024 × 768 were styled. The results rail becomes a drawer at both, the Levels and Watch hit areas remain separate, and the active CIP replay clears the voice control. |

| Width | Before | After |
| --- | --- | --- |
| 1920 | [Material](shots/main-qa-before-diagnostic-material-1920.png) · [Both](shots/main-qa-before-diagnostic-both-1920.png) · [Data](shots/main-qa-before-diagnostic-data-1920.png) | [Material](shots/main-qa-after-material-1920.png) · [Both](shots/main-qa-after-both-1920.png) · [Data](shots/main-qa-after-data-1920.png) · [Levels](shots/main-qa-after-levels-1920.png) |
| 1440 | [Material](shots/main-qa-before-diagnostic-material-1440.png) · [Both](shots/main-qa-before-diagnostic-both-1440.png) · [Data](shots/main-qa-before-diagnostic-data-1440.png) | [Material](shots/main-qa-after-material-1440.png) · [Both hover](shots/main-qa-after-both-hover-1440.png) · [Data](shots/main-qa-after-data-1440.png) · [Levels](shots/main-qa-after-levels-1440.png) |
| 1280 | [Broken reload](shots/main-qa-before-material-1280.png) | [Material](shots/main-qa-after-material-1280.png) · [Results drawer](shots/main-qa-after-drawer-1280.png) |
| 1024 | [Broken reload](shots/main-qa-before-material-1024.png) | [Material](shots/main-qa-after-material-1024.png) · [Results drawer](shots/main-qa-after-drawer-1024.png) · [Levels](shots/main-qa-after-levels-1024.png) |

[Gemini services](shots/main-qa-after-services-1440.png) · [Run transcript](shots/main-qa-after-transcript-1440.png)

All five routes passed cache-disabled reloads with normal CSS. The browser console was clean in the reload, camera, passive capture and layout runs. [Main](shots/main-qa-after-reload-main.png) · [Lens](shots/main-qa-after-reload-lens.png) · [Proof](shots/main-qa-after-reload-proof.png) · [Gallery](shots/main-qa-after-reload-gallery.png) · [Phone capture](shots/main-qa-after-reload-capture.png)

### Live capture results

- **Camera with configured credentials.** Starting in Material, both slider deferral and the automatic switch worked. The camera added nine modeled paths as dropped and had zero at its checked office recommendation. Displayed risk moved **46 → 49 → 46**. The run finished in 28 seconds and the duplicate relocation proposal became a receipt. [Automatic lens switch](shots/main-qa-after-camera-configured-automatic-lens-1920x1080.png) · [Material answers at 1440](shots/main-qa-after-camera-configured-capture-material-1440x900.png) · [Moved at 1440](shots/main-qa-after-camera-configured-moved-1440x900.png) · [Moved at 1920](shots/main-qa-after-camera-configured-moved-1920x1080.png)
- **Camera with default credentials.** The same move cleared the new paths and took displayed risk **49 → 47** on a baseline of **46**. The final rules check still recorded the default-credential finding. This is why the placement card now shows remaining findings after a move. [Camera evidence](shots/main-qa-after-capture-1920x1080.png)
- **Passive ceramic mug.** Material stayed selected. The Inspector blocked the initial suggestion and passed the revision to Corporate office. Both rules checks had zero paths. [Material capture](shots/main-qa-after-passive-capture-1440x900.png)

### Remaining issues, ranked

1. The Chief’s generated guidance can recommend a precautionary hold even when the final rules check clears the modeled site. The panel now labels the briefing as AI guidance and displays the rules verdict at the placement action.
2. The supplier’s product page returned unreadable details on the live retry, so item 11 was verified with the real rules engine and a deterministic component test.
3. Data Levels requires scrolling to reach L0 and the lower result sections, especially at 1024 px.

`npm run typecheck` passed. `npx vitest run src/floor src/purdue src/panel src/sim src/capture src/layers src/modeler --maxWorkers=1` passed 117 tests across 29 files.

This pass changed the shell mounts and chrome, capture-result components and projections, floor label geometry, lens annotations, Purdue node labels and the Watch panel mount. Crew, transcript, rules and pipeline implementations stayed with their owners.

## Projector and narrow-view follow-up

| Item | Change and verification | Screenshots |
| --- | --- | --- |
| 1 | The results rail occupies 307 px at 1280 × 720 and remains a column at exactly 1100 px. At 1024 px the closed drawer opened on a completed live text capture of a ceramic mug and on the CIP outcome with four mitigation proposals. | [Projector results](shots/shell-layout-2-01-results-1280.png) · [Capture drawer](shots/shell-layout-2-01-auto-capture-drawer-1024.png) · [Simulation drawer](shots/shell-layout-2-01-auto-simulation-drawer-1024.png) |
| 2 | Shell CSS below 1366 px shows portrait chips with native name and status tooltips. The Material drawing measured 919 px wide on the 1280 px projector. | [Compact crew](shots/shell-layout-2-02-crew-portraits-1280.png) |
| 3 | The floor and Levels share a single sequential drawing stop. Arrow keys changed the active asset, Enter selected it, and Tab continued through Capture, Simulation, Chief voice and the results rail. | [Keyboard selection](shots/shell-layout-2-03-roving-projector.png) |
| 4 | Dense Purdue bands fit the 431 × 550 px projector pane through L0, with no scroll in either direction during the PLC-F3 selection. The selected-asset card stayed inside the floor pane, and revealed field nodes retained their complete tags. L0 also fit vertically at 1024 × 720. | [Split with selection](shots/shell-layout-2-04-levels-selection-1280.png) |
| 5 | Clicking the Inspector portrait dispatched `pw:focus-point` and panned to the Inspector at the same zoom. The camera remeasures the current viewport before easing. | [Crew focus](shots/shell-layout-2-05-crew-pan-projector.png) |
| 6 | The centered lens reserves adjacent space for 2D/3D and Data Levels. The escalation chip sits in the stage and participates in the floor fit. Chromium found no control overlaps or chip collisions with room labels in all 12 width and lens combinations. | See matrix below. |
| 7 | Light Material now gives the secondary control symbols and overview instrument ticks more contrast. Light Levels uses stronger red for background attack routes. Both were checked at 1440 × 900. | [Material before](shots/shell-layout-2-07-light-before-floor.png) · [Material after](shots/shell-layout-2-07-light-material-1440.png) · [Levels before](shots/shell-layout-2-07-light-before-levels.png) · [Levels after](shots/shell-layout-2-07-light-levels-1440.png) |

| Size | Material | Both | Data |
| --- | --- | --- | --- |
| 1920 × 1080 | [Material](shots/shell-layout-2-06-topbar-1920-material.png) | [Both](shots/shell-layout-2-06-topbar-1920-both.png) | [Data](shots/shell-layout-2-06-topbar-1920-data.png) |
| 1440 × 900 | [Material](shots/shell-layout-2-06-topbar-1440-material.png) | [Both](shots/shell-layout-2-06-topbar-1440-both.png) | [Data](shots/shell-layout-2-06-topbar-1440-data.png) |
| 1280 × 720 | [Material](shots/shell-layout-2-06-topbar-1280-material.png) | [Both](shots/shell-layout-2-06-topbar-1280-both.png) | [Data](shots/shell-layout-2-06-topbar-1280-data.png) |
| 1024 × 720 | [Material](shots/shell-layout-2-06-topbar-1024-material.png) | [Both](shots/shell-layout-2-06-topbar-1024-both.png) | [Data](shots/shell-layout-2-06-topbar-1024-data.png) |

The plant subtitle truncates at projector width and retains its full text on hover. The compact replay caption can also truncate, with the simulation comparison and mitigation details available in the results rail. Expanding field groups can require scrolling when their devices exceed the pane.

An already-mounted 3D canvas keeps its dark palette when the chrome changes to Light, which leaves the orbit instructions faint. The 3D renderer owns that palette. Headless Chromium also logged WebGL readback performance warnings during that check. [Light switch with 3D already open](shots/shell-layout-2-07-light-3d-existing-canvas-1440.png)

`npx tsc --noEmit` passed on the second allowed run. `npx vitest run src/shell src/layers src/purdue src/floor --maxWorkers=1` passed 42 tests across 10 files. The 2D layout sweep and live capture recorded zero browser console errors or warnings.
