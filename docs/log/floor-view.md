# Plant floor

`src/floor/PlantFloor.tsx` draws the current twin as an SVG schematic. `FloorStage.tsx`, `Blueprint.tsx`, `camera.ts` and the camera and gesture hooks handle fitting, mouse and touch gestures, the wall, the 10 m grid and the scale bar. The camera writes one SVG transform per frame and keeps the selected asset card readable in screen coordinates.

`ZoneLayer.tsx`, `AssetLayer.tsx`, `PipeLayer.tsx` and `Legend.tsx` render the area boundaries, equipment, animated flows and media filters. Zone labels use seed equipment footprints to find room for status notes. Pipe runs honor authored waypoints and use a rounded orthogonal elbow when the twin supplies none. The Glycol / NH3 filter switches both refrigeration media together.

`AttackPathLayer.tsx` plots the risk report's simulated routes from `nodePosition`. It shares coincident segments between paths, follows authored links when available and gives the selected device's paths priority. `EntryPoints.tsx` marks the report's exposure origins. The simulation and crew layers sit above the equipment, with the risk overlay between them.

`DropPin.tsx`, `placement.ts` and `useFloorPlacement.ts` bind the capture pin and added-device movement to the shared stores. A pin requires a marked area. A drag across unmarked space holds the last valid location, and cancellation restores the starting location. A completed move updates the physical area and calls `reassessAsset` once.

## Verification

- `npm run typecheck`, `npx vitest run src/floor` and `npx eslint src/floor` passed. The 10 floor tests cover pipe routes, cursor and pinch coordinates, pin resolution, cross-area movement, cancellation and the reassessment handoff. The full `npm run test` suite passed all 66 tests.
- Open `http://localhost:4119/`. Select equipment to inspect its area, Purdue level and available readings. Use the media buttons to show and hide pipes. The zoom controls fit or magnify the drawing, and dragging the blank floor pans it.
- The live Chrome check verified the fitted drawing, the raw-water tank card, and water pipe visibility. The current seed contains 92 symbols and 168 straight pipe and cable segments before corner rounding. The drag tests use a local fixture and spy on reassessment. A physical-device pinch, live Gemini reassessment, and a sustained 60 fps measurement remain unverified.
