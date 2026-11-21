# view3d: optional 3D view of the live twin

An optional `2D | 3D` switch. 3D draws the same digital twin (same stores, same selection) with a
hand-written WebGL2 renderer. Zero new dependencies (no three.js). It is isolated: nothing in the
2D product imports `src/view3d` until the two mounting lines in `src/view3d/MOUNTING.md` are added,
and any failure flips back to 2D with a one-line notice.

Review route, no shell needed: `http://localhost:4119/3d`
(`?select=FIL-3`, `?lens=both`, `?hover=HMI-F3` for deep links).

Screenshots: `docs/log/shots/view3d-*.png`.

## Files

| File | What it does |
| --- | --- |
| `src/view3d/gl/mat4.ts` | mat4 / vec3 helpers, tube segment matrix, world -> screen projection |
| `src/view3d/gl/geometry.ts` | unit primitives: box, cylinder with caps, tube, dome, sphere, quad, cone (triangles + edge lines) |
| `src/view3d/gl/shaders.ts` | one GLSL ES 3.00 program: fill, edge and pick passes, floor / flow / arc patterns |
| `src/view3d/gl/program.ts` | shader compile / link helper |
| `src/view3d/gl/instances.ts` | packs parts into per-primitive instance buffers (28 floats per instance) |
| `src/view3d/gl/pickId.ts` | pick id encode / decode and the id table |
| `src/view3d/gl/renderer.ts` | instanced renderer, offscreen id pass, resize (DPR <= 2), context loss, dispose |
| `src/view3d/palette.ts` | colours read from the live CSS tokens (`--pw-*`) |
| `src/view3d/parts.ts` | `Part` and the per-asset local `Frame` builder |
| `src/view3d/bodies.ts` | one procedural body per equipment kind |
| `src/view3d/scene.ts` | **pure** `sceneFromTwin(twin, lens, { findings, palette })` |
| `src/view3d/attackArcs.ts` | attack paths -> arcs (same emphasis rule as the 2D floor) |
| `src/view3d/camera.ts` | orbit pose, clamps, default fit, framing, easing, drop-in curve |
| `src/view3d/controls.ts` | pointer / touch / wheel / keyboard input |
| `src/view3d/labels.ts` | label declutter |
| `src/view3d/Overlay.tsx` | HTML tags, room names, entry points, crew portrait billboards |
| `src/view3d/Plant3D.tsx` | the view (default export, no props): engine lifetime, store wiring, render loop |
| `src/view3d/View3DStage.tsx` | mount-ready: `next/dynamic` (`ssr: false`) + error boundary + fallback notice |
| `src/view3d/View3DToggle.tsx`, `view3dStore.ts` | `2D | 3D` switch (hides without WebGL2), `{ enabled, toggle, setEnabled, fail }` |
| `src/view3d/view3d.css` | all styles |
| `src/app/3d/page.tsx`, `Review3D.tsx` | full-screen review route |
| `src/view3d/*.test.ts`, `gl/*.test.ts` | 45 unit tests |
| `.agents/qa/view3d/shot.mjs` | headless Chrome screenshot / interaction script |

## What is real twin data and what is illustrative

| Shown in 3D | Source |
| --- | --- |
| Position, plan size, rotation of every asset | `physical.x / y / rotation / scale`, `FOOTPRINT[kind]` (10 units = 1 m) |
| Body shape | chosen by `physical.kind`; an unknown kind is an honest plain box with its tag |
| Rooms, overlay zones (NH3 hatch, washdown dots, corridor) | `twin.areas` bounds and attrs |
| Pipes, their colour, their plan route | `physical.connections` + `routePoints` (the same function the 2D floor uses) + `MEDIA` |
| Flow bands moving / stopped | `connection.active`, source `process.running`, `status !== "offline"` (same rule as 2D) |
| Level band and sight strip on vessels | `process.levelPct`; no level in the twin = no band |
| Filler carousel, agitators, fans turning | `process.running` |
| Network links (Both and Data lens) | `connections` with `medium: "network"` |
| Entry-point beacons | `twin.entryPoints` |
| Red arcs | `risk.paths` from the rules engine, plus `useRunStore().selfCheck.paths` of the current run |
| Alarm / attention floor rings | worst rules-engine finding severity per asset (>= 4 alarm, 2-3 attention), asset status |
| New device colour | `origin: "added"` + `placement` (`unsafe` = alarm, `recommended` = ok); placement wins over finding severity for a captured device |
| Capture photo on the placed device's tag | `useRunStore().captureThumbnail` (wired, not seen in QA: no capture was run) |
| Crew position, state, message | `crewPosition()`, `useCrewStore` avatars and live status: driven by real pipeline events |
| **Illustrative** | **every height** (bodies, pipe-rack tiers 4.4 to 6.85 m, wall height 0.4 m, arc heights), the level-band position along that illustrative height, the shape of network links (arcs between the two real endpoints, not the 2D cable route), lighting and shadows |

The caption `3D view · heights illustrative` is always on screen. Nothing in this view calls a
model, writes findings or animates the crew on its own: the idle patrol keeps its `idle patrol`
label and shows no findings.

## Controls

| Input | Action |
| --- | --- |
| Drag | orbit (pitch clamped, the camera never goes under the floor) |
| Right-drag, middle-drag, shift-drag, two fingers | pan across the floor |
| Wheel, trackpad pinch, two-finger pinch | zoom (7 m to 420 m) |
| Hover | highlight, writes `hover(id)` (linked with 2D and Purdue) |
| Click | `select(id)`; click on empty floor clears the selection |
| Double-click, `F` | frame the selection (`F` with nothing selected resets the view) |
| `reset view` button | eased return to the default pose |

A selection made in 3D only highlights (the camera stays where the user put it). A selection made
anywhere else (2D floor, Purdue map, side panel) highlights **and** frames. First show does an
eased fly-in. `prefers-reduced-motion`: no fly-in, no rotation, static flow bands, arcs drawn
complete, camera moves jump.

## Rendering notes

- One shader program, instanced draws grouped by primitive: about 20 draw calls a frame for the
  seed twin (92 assets: 833 instances in Material, 1,165 in Both / Data, plus about 220 for the
  attack arcs). Rotation, flow, drop-in, selection and hover are all done in the shader from
  uniforms, so nothing is re-uploaded per frame.
- Edges are a second `gl.LINES` pass over the same instance buffers (polygon offset on the fills).
- Picking: offscreen RGBA8 framebuffer at half resolution, one box hull per asset / entry point,
  one pixel read back, at most about 20 hover picks a second.
- Antialiasing on, device pixel ratio capped at 2, fog to `--pw-bg`.
- Draws only when something changed or an animation is active (running line, crew walking, camera
  tween, drop-in, arcs drawing in). The seed line is running, so with motion allowed it draws every
  frame; with reduced motion it is fully on demand. The loop stops while the tab is hidden.
- Unmount deletes every buffer, VAO, texture, framebuffer and the program, then releases the
  context. `webglcontextlost` pauses, `webglcontextrestored` rebuilds from the kept CPU copies.
- Twin changes rebuild the scene and re-upload it (2 to 6 ms to build and pack the seed twin in
  Node; the GPU upload was not timed).

## Lens parity with the 2D floor

Same grouping as `src/layers/lensClassification.ts`, so one lens means one thing in both views.

| Lens | 3D shows |
| --- | --- |
| Material | process equipment and flowing pipes; control / IT gear and the digital entry points recede (dark, untagged, still pickable); no network links; only non-cyber findings ring; attack arcs only for the selected asset or the device a capture just placed |
| Both | everything: pipes, network links, all finding rings, all attack arcs (thin) with the focused ones bold |
| Data | control / IT gear and network links lead; process equipment and pipes recede; all attack arcs |

One deliberate difference: 2D hides pipes completely in Data and attack paths completely in
Material; 3D keeps dim pipes in Data (they give the room its shape) and draws the paths of the
selected asset / placed device in Material.

## How it was verified

- `npm run typecheck`: clean on the final run.
- `npx vitest run src/view3d --maxWorkers=1`: 45 tests pass (scene mapping, lens parity, projection
  maths, pick id encode / decode, camera clamps and fit, drop-in curve, label declutter, attack arcs).
- Looked at it in headless Chrome through Playwright
  (`node .agents/qa/view3d/shot.mjs <name> <query> <w> <h> <actions> <flags>`), on the review route
  `/3d`, with the real GPU (flag `gpu`) and with SwiftShader (software WebGL2, no flag).

What was exercised and seen working on `/3d`:

| Check | Result |
| --- | --- |
| Default view: Material and Both at 1440x900, Both at 1920x1080 (DPR 2) | whole plant framed; `view3d-01`, `-05`, `-09` |
| Data lens | seen after an orbit and zoom at 1920x1080 (`view3d-06`), not in the default pose |
| Hover (id pass) | hovering TK-101 / FIL-3 sets `hoveredId`, ring + tag, pointer cursor |
| Click | `selectedId = TK-101`, tag shows the name, camera stays; `view3d-02` |
| Selection from outside (store call, as the 2D floor does) | highlights and frames; `view3d-03` |
| Double-click, `F`, `reset view` | frame the filler, re-frame after orbit, return home; `view3d-04` |
| Orbit, right-drag pan, wheel zoom | `view3d-06` |
| Attack arcs | thin when idle, bold with arrow heads when focused, drawn in progressively |
| Device placed by a run (`addAsset` + `setPlacedAsset` with a labelled QA device) | drops from above (`view3d-07`, canvas at 260 ms), alarm ring and mast, rules engine adds its paths |
| Crew | portraits at the desks, full plate with `idle patrol` while the real patrol walks one |
| `webglcontextlost` / `restored` (forced with `WEBGL_lose_context`) | pauses, rebuilds, draws again; `view3d-08` |
| `2D` then `3D` again | canvas removed and context released, then a fresh mount |
| `prefers-reduced-motion` | no fly-in, static, draws on demand |
| Console | no errors or warnings in any run (SwiftShader prints its own ReadPixels performance note) |

Frame rate, measured as `requestAnimationFrame` callbacks per second while the line animates:

| Machine / renderer | Viewport | Result |
| --- | --- | --- |
| Apple M5, Chrome headless, ANGLE Metal | 1440x900, DPR 1 | 60 to 61 |
| same | 1920x1080, DPR 2 (3840x2160 buffer) | 61 |
| SwiftShader (CPU), animation forced on | 1440x900 | 1 |
| SwiftShader (CPU), final code | 1440x900 | 52 (still mode: draws on demand) |

Still mode is automatic on a CPU rasteriser and when continuous animation drops under about 4 fps
for six frames: rotation and flow stop, the view keeps working and draws on demand.

## Known gaps (most important first)

1. **Not mounted in the shell yet.** By design: the orchestrator adds the lines in
   `src/view3d/MOUNTING.md`. Everything above was verified on `/3d` only. The `data-view3d` rule that
   hides the 2D drawing and the stage size inside the real shell have not been seen running.
2. **Frame rate was measured on one machine** (Apple M5). No integrated-GPU Windows laptop was
   tried. The slow-GPU safety net exists but was only exercised with SwiftShader.
3. **2D-only features.** Simulation overlays, the data-lens annotations (conduit crossings, Purdue
   level bands, ATT&CK technique tags on path segments, RF waves), the drop-pin placement, the
   modeler ghost / fit preview, the selection card and the legend are not drawn in 3D. Use 2D for
   those (MOUNTING.md has the line that switches back when the drop pin is armed).
4. **Crew detail.** 3D shows portrait, ring, name and live status at the real position. Speech
   bubbles, evidence chips, handoff and trace visuals of the 2D crew layer are not replicated. The
   idle patrol timer lives in the 2D `CrewLayer`, so the 2D floor must stay mounted (hidden) under
   the 3D stage, as MOUNTING.md says.
5. **Heights and link shapes are illustrative** (labelled on screen). Network links and attack
   paths are arcs between the real endpoints, not the 2D cable routes; all `via` kinds look the same.
6. **Pipe detail.** Pipes enter tall vessels through the shell and low equipment from above at the
   asset centre; flow bands restart at each bend; several pipes meeting one asset overlap there.
7. **Translucent parts are not depth-sorted** (walls, floor markings, rings). No visible artefact
   was found in the screenshots, but steep angles through several walls could show one.
8. **Lint was not run** on the new files (the command needed an approval this session did not
   have). Typecheck and tests are clean.
9. **Input not tried on real hardware:** two-finger pan / pinch on a touch screen and trackpad
   pinch are implemented but were not tested. The 3D view is pointer-first: the overlay is
   `aria-hidden` and only `F` and the `reset view` button are keyboard reachable, so 2D remains
   the accessible view.
10. **Limits.** At most 32 extra highlight ids per frame (larger area selections highlight the
    first 32 members). Every twin change rebuilds and re-uploads the whole scene: fine for the seed
    twin, not profiled under fast simulation ticks.
11. The dev server was down for a few minutes during QA (not started or stopped by this task);
    all results above are from runs after it came back, except the SwiftShader "animation forced
    on" row, which is from the first run of the day.

## Polish pass, main-screen mount (21 Nov, 14:22 to 14:36)

Checked in the real shell at `http://localhost:4119/` with headless Chrome (SwiftShader), 1440x900 and
1920x1080, both themes. Script: `.agents/qa/view3d/polish.mjs <tag> [full]`. Shots:
`docs/log/shots/view3d-polish-before-*.png` and `view3d-polish-after-*.png`.

| Item | What changed | Where |
| --- | --- | --- |
| 1 Framing | `defaultPose(bounds, aspect, { fill, top, bottom })` now solves distance and target so the plant floor box spans 85% of the **container** width (or the free height, whichever limits first) and is centred in the free area above the caption / tools strip. Pitch 0.8 -> 0.7 (lower), closer. Used for first show and `reset view`. The stage re-fits on container resize while the camera is on the home framing (`atHome`: cleared by orbit / pan / zoom or by framing a selection, set again by `reset view`). | `camera.ts`, `Plant3D.tsx` |
| 2 Theme | A `MutationObserver` on `<html>` (`data-theme`) re-reads the palette from the CSS tokens; the scene memo, colour buffers, arcs and clear colour rebuild from it. Tag text no longer hard-codes `#fff`; the controls hint has a plate and uses `--pw-text-dim`. | `Plant3D.tsx`, `view3d.css` |
| 3 Simulation | `View3DStage` watches `useSimStore().activeScenario`: while a scenario is loaded the view is 2D and the store notice reads `Simulation shown in 2D` (`showIn2D()` in `view3dStore.ts`). Choosing 3D during a scenario flips straight back with the same notice. The notice moved to the top centre: at the bottom it covered the 2D legend. | `View3DStage.tsx`, `view3dStore.ts`, `view3d.css` |
| 4 New device | Wide landing ring in the placement colour, mast, larger tag with `NEW`, drop-in. The drop-in now also plays in still mode (software GPU); only `prefers-reduced-motion` skips it. | `scene.ts`, `view3d.css`, `Plant3D.tsx` |
| 5 Labels | Tanks, filler, labeller, palletiser and carbo-cooler get a priority boost (`MAIN_TAG_BOOST`), so they are tagged at the home framing. Hovered / highlighted tags get an opaque plate and `z-index`. | `scene.ts`, `view3d.css` |
| 6 Other | Tags can no longer cover the caption or the tools row (two reserved boxes in the declutter pass). | `Overlay.tsx` |

Measured after the change (plant floor box against the stage): 1440x900 stage 906x771 -> 85.5% of the
width; 1920x1080 stage 1332x951 -> 85%; both centred, nearest wall about 190 px above the bottom edge.

Verified through the real stores (dev-only `window.__pw3dStores`, now also set by `Plant3D` in the
main screen, `NODE_ENV === "development"` only): `addAsset` of a test device with
`placement: "unsafe"` + `setPlacedAsset` -> alarm ring and tag; `updateAsset(... "recommended")` ->
ok colour; `useSimStore.start("cip")` -> canvas gone, `2D` checked, notice shown.

Honest gaps of this pass:

- **Ring colour follows the twin, not the drop.** `placement: "unsafe"` = alarm, `"recommended"` = ok,
  `"neutral"` (not assessed yet) = neutral accent ring. A device the rules engine accepts where it
  was dropped is marked `recommended` by `pipeline/client.ts` and is therefore ok-coloured before
  any `Move there`. Forcing alarm there would be a false alarm.
- The drop-in mid-flight shot (`after-1440-light-drop-mid.png`) was taken but not inspected; the
  landed states were.
- Container re-fit on resize is implemented but was not exercised in the browser (no drawer / split
  toggle in the QA run). The fit itself is covered for four stage sizes in `camera.test.ts`.
- The new `camera.test.ts` case first failed on a 520x700 stage: there the 420 m zoom limit wins and
  the plant fills 98% of the width (fully in view). The case was changed to 700x700 and its numbers
  were checked with the same functions through `tsx` (`.agents/qa/view3d/fit-check.ts`), but vitest
  was not run again (run budget), so the last vitest result on record is 45 passed, 1 failed.
- The notice move to the top centre was made after the last screenshot run and is not re-shot.
- PLC tags depend on the lens as before: in Material the control layer is ghosted and only flagged
  devices are tagged; no PLC carried a Material-lens finding in the seed twin during QA.
- No z-fighting was seen in the shots at the home framing; nothing was changed for it.
- At the home framing the stage is width-limited, so about 190 px stay free above and below the plant.

## 3D contrast and simulation return (21 Nov)

- `palette.ts`, `scene.ts`, `gl/renderer.ts` and `gl/shaders.ts` derive the deeper light steel and outlines from the shared CSS tokens. The slab and process and support plates have separate tones. Reduced light fog, wider media pipes and thicker status rings keep the drawing legible at plant scale.
- `Overlay.tsx`, `labels.ts` and `view3d.css` give room names, equipment tags, crew names, caption and controls solid backgrounds. Room names try other anchors within their room when a tag or crew plate overlaps. Main equipment tags take priority.
- `Plant3D.tsx`, `View3DStage.tsx` and `camera.ts` cover the stage until the first rendered frame and start on the fitted camera. The home fit targets 90% of the available stage width and re-fits while the camera is at home. `src/app/3d/Review3D.tsx` documents when its review selection is applied.
- `view3dStore.ts` and `View3DToggle.tsx` store explicit dimension choices. Simulation playback and pause temporarily show the 2D floor with a notice. Reset and finish restore the prior view in memory, after placement pinning ends if it is still active.
- `camera.test.ts` covers stage fit and alternate anchors. `view3dStore.test.ts` covers automatic return and explicit preference changes during playback.

### Live screenshots

| Viewport and theme | Before | After |
| --- | --- | --- |
| 1440×900 light | [Before](shots/contrast-3d-before-light-1440x900.png) | [After](shots/contrast-3d-after-light-1440x900.png) |
| 1440×900 dark | [Before](shots/contrast-3d-before-dark-1440x900.png) | [After](shots/contrast-3d-after-dark-1440x900.png) |
| 1920×1080 light | [Before](shots/contrast-3d-before-light-1920x1080.png) | [After](shots/contrast-3d-after-light-1920x1080.png) |
| 1920×1080 dark | [Before](shots/contrast-3d-before-dark-1920x1080.png) | [After](shots/contrast-3d-after-dark-1920x1080.png) |
| 1280×720 light, finished simulation | | [3D with results open](shots/contrast-3d-after-light-1280x720-results.png) |

### Verification

- `npm run typecheck` passed. `npx vitest run src/view3d --maxWorkers=1` passed 51 tests across five files.
- In the live app, a fresh browser opened in light 3D. The 1280×720 frame trace showed the loading plate and then 3D, with zero visible 2D floor frames. The 919×591 stage kept its fit and labels stayed inside the stage after simulation results appeared.
- The CIP simulation showed the 2D notice, stayed in 2D while paused, and returned to 3D on reset and on finish. The automatic transitions left `pw-view` unset in the fresh session. A manual 2D choice survived reload and simulation reset.
- GPU hover and click picked FIL-3. PLC-F3 selection carried over from the 2D floor and Purdue HMI-F3 selection updated the split 3D stage. All four crew billboards rendered, and the live patrol panel kept its `idle patrol` label. T opened the transcript while 3D was active. The standalone `/3d?select=FIL-3` view loaded and framed the requested asset.

| Sampled contrast | Light | Dark | Target |
| --- | ---: | ---: | ---: |
| Lowest text ratio across tags, rooms, caption, controls and crew | 9.30:1 | 8.20:1 | 4.5:1 |
| Lowest measured control or chip boundary ratio | 6.59:1 | 3.59:1 | 3:1 |
| Packaging room outline against its plate | 9.41:1 | 4.66:1 | 3:1 |

Light-theme render samples also cleared 3:1 for the water and syrup pipes (4.60:1 and 4.21:1) and both placement rings (alarm 6.19:1, recommended 6.27:1). Text and chip measurements used computed colors. Outline, pipe and ring samples used rendered pixels, with a temporary QA device for the placement states.

The installed Chrome channel aborted in the restricted shell, so Playwright used the cached Chrome Headless Shell with in-process SwiftShader. The shared light tokens changed in parallel between the before and after captures. Crowded angles can still hide some room names to keep crew markers and equipment tags legible.

## Crew work in the main 3D twin

The 3D view follows the shared crew walks and projects their foot trails and handoffs with the plant camera. Active portraits grow and inactive plates compact. The label layout measures the plates, keeps room and equipment tags clear of work cues, and reserves the actual tools and briefing bounds. The removed caption no longer reserves space.

| Stage | 3D cue | Evidence |
| --- | --- | --- |
| Scout | The photo floats above the exact drop point during perception. The profile supplies the observed label, ports, and radios for the evidence chips. The captured device lands at the same point. | [Photo preview QA](shots/crew-work-3d-photo-preview-qa.png), [evidence replay](shots/crew-work-3d-replay-light-evidence.png), [live landed device](shots/crew-work-3d-live-06s.png) |
| Inspector | Each recorded rules-engine path draws in hop by hop with the shared walk. The active review path is emphasized. Rule stamps identify findings, and a tick reflects a passed verdict. | [Trace replay](shots/crew-work-3d-replay-light-trace.png), [recorded stamps](shots/crew-work-3d-live-40s.png), [pass replay](shots/crew-work-3d-replay-light-cleared.png) |
| Architect | Ranked rooms use the deterministic rules-engine order. The recommendation arrow starts at the drop and points to the placement. A held recommendation uses an amber floor highlight. The latest provider thought summary occupies one line in the active plate. | [Ranking replay](shots/crew-work-3d-replay-light-ranking.png), [live arrow](shots/crew-work-3d-live-20s.png) |
| Chief | The writing state and walk to the results edge begin with `summary.started`. The recorded `summary.done` briefing pins in the 3D overlay and uses the shared dismissal action. | [Live writing and placement](shots/crew-work-3d-live-20s.png), [live briefing](shots/crew-work-3d-briefing-light.png) |

### Verification

- `npm run typecheck` passed. `npx vitest run src/view3d --maxWorkers=1` passed 57 tests across six files.
- A fresh browser opened in light 3D. The escalation rehearsal placed `TEST-901 · TEST SCENARIO` with five deterministic findings and zero analysis requests, then **Clear test** removed it. The rehearsal used a fictional browser-local number with call consent off. [Test alert](shots/crew-work-3d-test-alert.png)
- A single live **Describe device** request completed with HTTP 200. The as-dropped check emitted 18 path events, the recommendation passed with one advisory finding, and Chief's briefing arrived about 24 seconds after the run started. The pinned card dismissed successfully. Captured and inspected 21 frames on a two-second schedule from [00s](shots/crew-work-3d-live-00s.png) through [40s](shots/crew-work-3d-live-40s.png). Software rendering added variation to capture timing.
- Verified [dark 3D](shots/crew-work-3d-dark-3d.png), [light 2D](shots/crew-work-3d-light-2d.png) and [dark 2D](shots/crew-work-3d-dark-2d.png) after reload. Installed Chrome aborted at launch. The cached Chrome Headless Shell rendered with SwiftShader.
- The final replay used recorded pipeline events. Ten sampled light and dark layouts showed zero intersecting plates, and the briefing dismissed. The sample photo exercised thumbnail rendering locally. The live description produced no thought events, so the one-line thought bubble was checked with excerpts from an earlier Carbon stream. The replay sent zero analysis requests. [Light rule stamps](shots/crew-work-3d-replay-light-stamps.png), [dark evidence](shots/crew-work-3d-replay-dark-evidence.png), [archived thought](shots/crew-work-3d-replay-dark-archived-thought.png), [dark briefing](shots/crew-work-3d-replay-dark-briefing.png)
- The final patrol showed the `idle patrol` label with zero work plates and trails. Keys `1`, `2` and `3` switched Material, Both and Data in 3D. [Idle patrol](shots/crew-work-3d-after-idle-patrol.png)

The integration is in `Plant3D.tsx`, `Overlay.tsx`, `attackArcs.ts` and `view3d.css`. The focused work modules are `CrewWorkLabels.tsx`, `CrewWorkMotion.tsx`, `CrewWorkBriefing.tsx`, `crewWork.ts`, `crewWorkGeometry.ts`, `crewWork.css` and `crewWork.test.ts` under `src/view3d`. No shared-contract requests.
