# Pyre Witness demo bug fixes

| Bug | Cause and fix | Verification |
| --- | --- | --- |
| 1. Main-page runtime errors | The recorded `ctx.hasDisabledLink` stack ran through the rules graph during Fast Refresh while its context and graph were changing. The live rules context now supplies the method. The older `Unexpected token '['` entry had no source frame, and neither exception reproduced on a fresh page. A newer styling failure did reproduce: the lazy panel stylesheet URL served compiled global CSS. The shell now loads the core components and their styles together, and owns the crew subscription and replay clock. Tailwind scans the source tree. | Chromium stayed clear of warnings and exceptions across cold load, replay, capture, and the move. Checked the actual CSS selectors after load. |
| 2. Telemetry precision | Idle patrol interpolated the live float directly. One formatter now handles patrol bubbles and feed, floor cards and tags, Inspector readings and bands, and simulated monitor alerts. | Watched `LT-301 60% · in band` on the floor and in the feed. Selected BL-301 and checked identical readings and units in its card and Inspector. Tests cover the recorded float and finer flow and conductivity precision. |
| 3. Simulation controls | Floor fallback portals raced the lazy dock and could pass their pointer events through the schematic. The shell owns the launcher and its clock. SVG pointer capture checks DOM containment. The `SIMULATION` label stays in the dock. | One launcher through remounts in both sizes. Real mouse clicks started CIP Crossover, set 4×, approved, and reran it. The PLC-BL label remained visible. |
| 4. CIP containment benefit | The risk delta and replay effect answer different questions. The simulator supplies both containment times and the credited control to the human approval card. | The card showed **6 s earlier**, **00:12 → 00:06**, **CIP branch isolation**, and **0 risk pts projected**. Approval and rerun reached 00:06. |
| 5. Split fit | A narrow floor column limited an aspect-preserving drawing. At desktop sizes the network sits above the results in one side column, and the floor refits around its controls on view change and resize. | The 1920-wide split floor pane grew from 844 to 1,270 px. The full building stayed inside both pane dimensions after zoom, view switches, and resize. At 1440, the narrower network viewport scrolls vertically. |
| 6. Duplicate floor labels | Equipment rendered its own tags and the floor hid them with CSS while adding a second tag. The floor now owns the single upright tag and cleans up gesture capture, observation, and scheduled frames. | The historic double paint is visible in the recorder’s frame. Repeated browser view switches and remounts produced one zone-label layer and one tag per asset. |
| 7. Live crew | Both Inspector passes shared the same label and the app could queue old thoughts. Actual-placement walks now precede the visual proposal. The recommendation walk follows it. The newest provider thought replaces the current bubble. Inspection routes run at a shorter pace, and Chief shows when a completed briefing is waiting for the walk to finish. Results present the two rules checks separately. | Real Describe captures covered landing, both checks, visible reasoning, Chief, and the move. Unit tests exercise compressed event delivery, link and summary starts, and reassessment. |
| 8. Desktop polish | Purdue rail copy used an ellipsis or fit too tightly. Descriptions now wrap in the full map and all levels fit their labels in Split. Controls expose tooltips and focus, and the dock and readouts keep their bounds as content changes. | Checked both 1920×1080 and 1440×900, including rail dimensions, keyboard focus, icon tooltips, and the view switch. |

## Live capture

Entered the requested consumer Wi-Fi camera description in the app. Scout identified the device and flagged the visible default credentials. The first deterministic check reported nine paths beside Filler 3. Architect recommended Corporate office at Purdue L4 and the recommendation check reported zero new paths. The selected device and score updated after **Move there**, whose label then confirmed the device was at the recommendation. The observed score and timing varied with the provider's chosen network placement. The final stream finished in 31.8 s with Chief’s floor briefing already visible. The displayed risk went 46 → 49 → 46 after the move. Other real takes finished in 27.5 s and 49.3 s. The latter selected a different network placement and finished at 47 after the move. Earlier streams sent thought summaries. The final stream emitted no summaries during reasoning, and Architect showed its active stage.

The dev log keeps the earlier runtime errors and a transient missing `briefEngineer` import from preflight. A later Fast Refresh during concurrent rules edits reset the twin mid-take while the API stream continued. The exact source of the historical syntax error remains unconfirmed.

## Checks

- `npm run typecheck` and scoped ESLint passed.
- The requested focused Vitest command passed all 80 tests in the working checkout. Earlier attempts also encountered stale tests embedded in an evaluation source snapshot. The snapshot copy was absent from final test discovery.
- The complete suite passed 311 tests with 3 skipped.
- Shared contracts need no changes.

## Changed files

- `src/app/globals.css` and shell `AppShell.tsx`, `TopBar.tsx`, `shell.css`, `instruments.css`.
- Floor `PlantFloor.tsx`, `FloorStage.tsx`, `AssetLayer.tsx`, `SelectionCard.tsx`, `useFloorCamera.ts`, `useFloorGestures.ts`, `floor.css`, `telemetryFormat.ts`, `telemetryFormat.test.ts`.
- Purdue `PurdueMap.tsx`, `LevelBands.tsx`, `ConduitLayer.tsx`, `layout.ts`, `purdue.css`. Capture `CaptureCard.tsx`, `CaptureProgress.tsx`.
- Crew `ActivityFeed.tsx`, `CrewLayer.tsx`, `Avatar.tsx`, `Bubble.tsx`, `director.ts`, `director.test.ts`, `crewStore.ts`, `crewStore.test.ts`, `walkTiming.ts`, `patrol.ts`, `crew.css`.
- Panel `SidePanel.tsx`, `RunProgress.tsx`, `AssetInspector.tsx`, `AttackPathList.tsx`, `PlacementAnswer.tsx`, `MitigationQueue.tsx`, `panel.css`.
- Simulation `SimControls.tsx`, `SimLayer.tsx`, `IncidentEffects.tsx`, `runtime.ts`, `runtime.test.ts`, `engine.ts`, `engine.test.ts`, `types.ts`, `monitors.ts`, `sim.css`. Removed the floor launcher and comparison fallback files `SimFloorAdditions.tsx` and `sim-comparison.css`.

## Screenshots

| Pass | Evidence |
| --- | --- |
| Before | [Floor and patrol](shots/bugfix-1-before-floor-1920x1080.png) · [Split](shots/bugfix-1-before-split-1920x1080.png) · [CIP card](shots/bugfix-1-before-sim-1920x1080.png) |
| 1920×1080 | [Floor](shots/bugfix-1-after-floor-1920x1080.png) · [Split](shots/bugfix-1-after-split-1920x1080.png) · [Telemetry](shots/bugfix-1-after-telemetry-1920x1080.png) · [CIP projection](shots/bugfix-1-after-sim-1920x1080.png) · [CIP rerun](shots/bugfix-1-after-sim-rerun-1920x1080.png) |
| 1440×900 | [Floor](shots/bugfix-1-after-floor-1440x900.png) · [Purdue](shots/bugfix-1-after-purdue-1440x900.png) · [Split](shots/bugfix-1-after-split-1440x900.png) |
| Live Describe | [As-dropped walk](shots/bugfix-1-after-capture-as-dropped-1920x1080.png) · [Chief briefing](shots/bugfix-1-after-capture-chief-1920x1080.png) · [Results](shots/bugfix-1-after-capture-results-1920x1080.png) · [Moved](shots/bugfix-1-after-capture-moved-1920x1080.png) |
