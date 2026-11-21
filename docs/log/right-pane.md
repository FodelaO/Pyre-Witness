# Right pane

The rail shows Plant risk, To-do, Threat watch, Updates and Asset inspector in that order. The first three ranked actions stay visible, with the remaining actions and prior decisions one click away. To-do renders the engine’s signed risk and annual loss projections and calls its `apply()` on approval. A purchase action uses the proposed equipment kind and puts its location and supplied features under See more. The ticker and to-do hook use optional module contexts and quiet feature slots.

Threat watch shows a 28 px alert icon, a single-line title, a linked equipment tag and the modeled loss per event. Expanded rows expose the advisory source, match evidence and loss calculation. The Inspector shows equipment at 96 px and keeps telemetry, cyber flags and rules engine evidence under See more. Capture results, modeler and simulation details remain available after the five core sections.

- Pane files: `SidePanel.tsx`, `PanelWorkspace.tsx`, `RiskDial.tsx`, `TodoSection.tsx`, `RailUpdates.tsx`, `AssetInspector.tsx`, `rightPane.css`.
- Watch files: `WatchPanel.tsx`, `WatchSignalDesk.tsx`, `WatchResults.tsx`, `WatchAlertCard.tsx`, `WatchLiveLoss.tsx`, `watchSignals.css`.
- Verify with `npx tsc --noEmit`, `npx --no-install vitest run src/panel src/watch` and the light 3D app at `http://localhost:4119`. Browser smoke checks covered ordering, real ranked actions, approval lowering risk from 46 to 24, a live alert and the linked Inspector.
- The current engine exposes optional purchase metadata but did not emit a purchase during the live smoke test. There are no contract change requests.
