# Floor and Purdue label fixes

| Defect | Cause | Fix | Screenshots |
| --- | --- | --- | --- |
| PLC-F3 technique labels covered readings, tags, and the Viewing corridor chip | Placement checked only other technique labels | Reserve rendered mark bounds, try several positions along each route, and omit labels with no clear position | [Before, floor](shots/fix-floor-labels-before-light-plc-floor-1280.png) · [After, floor](shots/fix-floor-labels-after-light-plc-floor-1280.png) · [Before, split](shots/fix-floor-labels-before-light-plc-split-1280.png) · [After, split](shots/fix-floor-labels-after-light-plc-split-1280.png) |
| Neighbour tags could touch persistent equipment tags | The neighbourhood pass reserved only its own tags at the fitted scale | Reserve selected and persistent tags first, then fit neighbours with a gap at the current scale | [Before](shots/fix-floor-labels-before-light-plc-split-1280.png) · [After](shots/fix-floor-labels-after-light-plc-split-1280.png) |
| The open gate touched SW-PK and technique IDs could repeat in a Purdue lane | The gate sat at the destination device's height and labels had no lane-level deduplication | Slide the gate along the zone boundary to clear cards and retain each technique ID once per visible level band | [Before](shots/fix-floor-labels-before-light-plc-split-1440.png) · [After](shots/fix-floor-labels-after-light-plc-split-1440.png) |
| FT-101 and CT-101 readings and the HIST-DMZ and JMP-DMZ tags could collide at two zoom steps | Detailed labels bypassed the tag collision pass | Fit tags and readings together at the current zoom, try small reading offsets, and omit a label when it has no room | [Before](shots/fix-floor-labels-before-light-zoom-1440.png) · [After, same view](shots/fix-floor-labels-after-light-zoom-1440.png) · [After, panned to the affected equipment](shots/fix-floor-labels-after-light-zoom-pan-1440.png) |
| Vendor remote and Internet nearly touched, and the 2 badge clipped OT DMZ | Entry names used fixed anchors and zone placement reserved unscaled badge boxes | Space entry names by their printed size and reserve the full badge footprint when fitting zone titles | [Before](shots/fix-floor-labels-before-light-data-1280.png) · [After](shots/fix-floor-labels-after-light-data-1280.png) |
| Split-view network lettering fell below 6 px | The scale multiplier was capped at 1.6 | Compute label size from actual viewport scale, then omit marks that cannot fit | [1280 before](shots/fix-floor-labels-before-light-plc-split-1280.png) · [1280 after](shots/fix-floor-labels-after-light-plc-split-1280.png) · [1440 before](shots/fix-floor-labels-before-light-plc-split-1440.png) · [1440 after](shots/fix-floor-labels-after-light-plc-split-1440.png) |
| Clicking a sensor depended on hitting its glyph | The existing hit shape sat underneath the symbol without an explicit whole-footprint target | Place a transparent rectangular target over the instrument art and keep selection on the equipment group | [Sensor before](shots/fix-floor-labels-before-light-zoom-1440.png) · [After clicking FT-101](shots/fix-floor-labels-after-light-sensor-1440.png) |

## Verification

- Playwright exercised the running app at 1280×720 and 1440×900 in light and dark. It used the installed Chrome Headless Shell after the Chrome channel aborted in the restricted shell.
- At both split widths, the smallest measured floor tag or primary network label was 9 CSS px. At 1280×720 the entry labels had 19 CSS px between their text bounds. OT DMZ and the 2 badge both rendered with clear bounds in the Data floor view.
- PLC-F3 checks found zero intersections between technique labels and the sampled tags, chips, titles or readings. The red gate cleared SW-PK and no technique ID appeared twice in the same rendered Purdue band. With ERP-01 hovered in the short split pane, FW-EDGE stayed visible and the competing ERP-01 tag omitted.
- FT-101 selected from the centre of the hit rectangle. All four sampled corner points also resolved to FT-101. At two zoom steps, tags and readings without room remained available through equipment selection and the inspector.
- A fresh browser opened in light 3D. With a WebGL2 canvas active in both themes, selecting PLC-F3 in Purdue framed it in 3D and switching back to 2D retained selection and technique labels. [Dark 2D before](shots/fix-floor-labels-before-dark-plc-split-1440.png) · [Dark 2D after](shots/fix-floor-labels-after-dark-plc-split-1440.png) · [Light 3D](shots/fix-floor-labels-after-light-3d-split-1440.png) · [Dark 3D](shots/fix-floor-labels-after-dark-3d-split-1440.png).
- `npm run typecheck` passed. Scoped Vitest passed all 45 tests across floor, Purdue and layers with one worker.

## Files changed

- Floor — `AssetLayer.tsx`, `AttackPathLayer.tsx`, `FloorStage.tsx`, `labelPlacement.ts`, `useFloorCamera.ts`
- Layers — `DataLayer.tsx`, `NetworkDrawing.tsx`, `NodeAnnotations.tsx`, `annotationGeometry.ts`, `printScale.ts`, `printScale.test.ts`
- Purdue — `PathOverlay.tsx`, `conduits.ts`, `layout.test.ts`

## Review corrections (Opus reviewer)

The seven QA defects were confirmed fixed in the running app: no label intersections at 1280×720 or 1440×900, the gate clears SW-PK, and each technique appears once per Purdue lane. TT-402 selected from its centre and all four corners. Four regressions introduced by the fix were corrected:

| Regression | Cause | Correction |
| --- | --- | --- |
| Every frame of a wheel or pinch zoom re-rendered the floor's label layers and re-measured the DOM for technique labels. A CPU profile of 10 wheel events showed about 680 ms of React element creation and 150 ms of layout reads. | `useFloorCamera` set `pixelsPerUnit` state on every paint. The hook is meant to move the camera without React frames. | `useFloorCamera.ts` now commits the scale immediately for a lone step and once 160 ms after a continuous gesture ends. Placement at rest is unchanged. |
| The plant's only severity 5 finding (PLC-F3) lost its badge in split view at both widths, while severity 4 badges stayed. | Badges with no clear position were dropped, and every asset's tag box was reserved, including hidden ones. | `NodeAnnotations.tsx`: a severity 5 badge falls back to its default corner. Zone titles and technique labels still avoid it. Lower-severity badges still give way. |
| "Nearby RF" lost its label in split view. | The marker sits near the canvas bottom, and every candidate position was below it. | `DataLayer.tsx`: added a candidate above the marker. |
| In split view a technique label sat on the Internet (1280) and Vendor remote (1440) entry markers. | `reserveFloorMarks` reserved entry text but not the marker circles. | `AttackPathLayer.tsx`: reserves `.pw-lens-digital-entry circle` and `.pw-floor-entry circle`. In split 1280, T0883 is now omitted on the floor. It remains in the Purdue pane. |

Screenshots are in `.agents/qa/opus-correct/fix-floor-labels/`. The `s1-*` captures are before the corrections and `s1c-*` after: split 1280 and 1440 with PLC-F3 selected, and Data 1280. The `s2b-*` captures cover the two-step zoom, and `s8-*` covers dark split and default light 3D.

Known gaps, not changed:
- At 1280×720 in the Data lens, "CELL UTILITIES" has no title. The larger, correctly sized lettering leaves no clear slot. An offline replica of the placement showed that the "nearby" fallback, if extended to cells, would stack the title over "CELL BLEND".
- In split view, lower-severity badges (SW-F3, SW-PK, FW-DMZ) and the CELL PACK and CELL UTILITIES titles are omitted for legibility. This is the brief's "hide low-priority ones" rule.
- Pre-existing: in the Both lens at zoom ≥ 1.5, a software chip can cover a protocol chip (EtherNet/IP under "Bottle inspection controller"). The two are placed in separate layer passes that do not share placements.
- The debounce could not be timed here. Headless software GL needs 2–8 s per wheel event, so each event is a separate step.
