# Floor, Purdue, and gallery integration

## Changes

- The floor fits the building, entry icons, and parking strip around measured controls. Resize fits again, the zoom buttons preserve the viewport center, and wheel and pinch gestures preserve their anchor. Fit sets the zoom minimum. Pan and zoom write a CSS transform and zoom-dependent styles on the SVG, with no React state updates per gesture frame.
- Room names hold at 10.25 px. Status and equipment tags use 9 px. Instruments, secondary tags, and readings fade in with zoom. Room markers identify NH3, washdown, restricted access, and public areas. Selected rooms outline their geographic members, including equipment in nested zones.
- Equipment uses its twin rotation, scale, status, level, medium, capacity, and running state. The Wi-Fi access point and gateway use their configured radios as the fallback when the simulated twin has no process-running value. Pipes follow authored waypoints and use successively lighter strokes for process, utility, and network lines. Medium labels require zoom and hover. Motion follows the source state and the connection's active flag.
- Existing simulated risk routes are thin and dim at overview. Only routes associated with focus carry arrows and technique tags. Nearby repeats of the same technique share a label.
- Purdue carries linked selection and multiple highlights for assets, exposure origins, and physical areas. Physical areas project onto the zones that contain their equipment. Areas without equipment appear in the header with their linked entry points highlighted. The compact map uses glyphs for switch gates, keeps firewall tags visible, and shows ISA letters in field groups where space permits.
- The gallery displays all 29 registered kinds and starts with animation enabled, subject to the user's motion preference. The agitator shows a rotating three-blade impeller in projection. Horizontal vessels display their supplied level, and small devices have proportionate previews and consistent tags.

## Files

| Surface | Files created or changed |
| --- | --- |
| Floor viewport | `PlantFloor.tsx`, `FloorStage.tsx`, `Blueprint.tsx`, `camera.ts`, `useFloorCamera.ts`, `useFloorGestures.ts`, `fit.ts`, `viewportOverlays.ts`, `floor.css`, `camera.test.ts` under `src/floor/` |
| Floor drawing and highlights | `AssetLayer.tsx`, `ZoneLayer.tsx`, `ZoneLabel.tsx`, `PipeLayer.tsx`, `EntryPoints.tsx`, `AttackPathLayer.tsx`, `twinFocus.ts`, `twinFocus.test.ts` under `src/floor/` |
| Purdue | `PurdueMap.tsx`, `layout.ts`, `layout.test.ts`, `areaLinks.ts`, `NodeLayer.tsx`, `ZoneBoxes.tsx`, `LinkLayer.tsx`, `ConduitLayer.tsx`, `conduits.ts`, `PathOverlay.tsx`, `pathGeometry.ts`, `purdue.css` under `src/purdue/` |
| Equipment and gallery | `Gallery.tsx`, `kinds/agitated_tank.tsx`, `kinds/bullet_tank.tsx`, `kinds/instrument.tsx`, `kinds/wifi_ap.tsx`, `process/VesselShell.tsx`, `process/process.css`, `process/gallery.css` under `src/equipment/` |

## Chromium screenshots

| View | 1440 × 900 | 1920 × 1080 |
| --- | --- | --- |
| Plant floor | [Before](shots/before-floor-1440x900.png) · [After](shots/after-floor-1440x900.png) | [Before](shots/before-floor-1920x1080.png) · [After](shots/after-floor-1920x1080.png) |
| Purdue | [Before](shots/before-purdue-1440x900.png) · [After](shots/after-purdue-1440x900.png) | [Before](shots/before-purdue-1920x1080.png) · [After](shots/after-purdue-1920x1080.png) |
| Split | [Before](shots/before-split-1440x900.png) · [After](shots/after-split-1440x900.png) | [Before](shots/before-split-1920x1080.png) · [After](shots/after-split-1920x1080.png) |
| Equipment gallery | [Before](shots/before-gallery-1440x900.png) · [After](shots/after-gallery-1440x900.png) | [Before](shots/before-gallery-1920x1080.png) · [After](shots/after-gallery-1920x1080.png) |

The `floor-pass-*` and `purdue-pass-*` captures record intermediate visual checks. The shell team moved Capture and Simulation into a dock during this pass. That concurrent change is visible in the comparisons. The camera also has regression coverage for the original floating overlays.

- All 29 gallery kinds with animation enabled. [Before, full scroll](shots/before-gallery-all-1920x1080.png) · [After, full scroll](shots/after-gallery-all-1920x1080.png)
- Floor detail with ISA letters, readings, tank percentage, and a hovered pipe. [Zoomed floor](shots/detail-floor-1440x900.png)
- Linked highlights for two devices, an entry point, and two physical areas. [Split view](shots/linked-highlights-1440x900.png)
- Firewall gate inspection with exactly 520 px of Purdue width and no horizontal overflow. [Gate details](shots/purdue-gate-520px.png)

## Verification

- `npm run typecheck`, `npx vitest run src/floor src/purdue` (25 passed), focused ESLint, and `npm run test -- --maxWorkers=1` (279 passed, 3 skipped).
- All 92 equipment hit boxes stayed inside the viewport and clear of the controls at default fit and after resize. Chromium also checked viewport-center zoom, panning, a return to Fit, and a room label that stayed at 10.25 px through zoom.
- The running app showed a 72% tank level and 32 active pipe flows. The filler, conveyor bottles, pump, three condenser fans, Wi-Fi access point, gateway, and agitator moved between samples and stayed still with reduced motion enabled.
- Floor and Purdue clicks selected each other's devices and areas. A browser-only fixture used the existing store setter to check mixed extra highlights, including a Level 0 instrument revealed from a collapsed group. Chromium checked all 29 gallery previews and the motion toggle.
- The split view showed one simulation launcher. The `SIMULATION` tag appeared during Chiller Trip and cleared on reset.

## Remaining visual issues, ranked

1. At the narrower split size, long room names shorten and some status chips sit apart from their room titles to keep both legible.
2. The tray packer uses the existing generic-device drawing. The gallery follows the shared 29-kind registry.

The performance check exercised camera interactions in Chromium. A sustained frame-rate benchmark and a physical touchscreen pinch remain unmeasured. No shared-contract change requests.
