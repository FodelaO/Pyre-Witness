# Results panel

The shell mounts `src/panel/SidePanel.tsx` in its 372 px column. `RiskDial.tsx` sticks to the top of the panel's scroll region, keeps the 24 most recent score changes in browser memory and compares the live score with the twin's baseline. The Chief briefing sits beneath the dial when available.

`RunProgress.tsx` reads emitted stage starts and timings, including the time for a second Inspector pass or an Architect revision. `DeviceCard.tsx`, `PlacementAnswer.tsx`, `NeverPlace.tsx`, `RiskList.tsx`, `AttackPathList.tsx` and `ComplianceChips.tsx` render the evidence and the four answers as they arrive. Reachability diagrams retain their existing model or rules-engine attribution. `MitigationQueue.tsx` sends explicit decisions to the twin, which measures the applied risk delta. `AssetInspector.tsx` reads the selected asset, its telemetry and its rules-engine findings. Hide and show results switches between the latest run and the inspector. `PanelParts.tsx` and `panel.css` provide the shared readouts and styling.

## Verification

Panel TypeScript and ESLint checks passed. `npm run test` reported 71 passing tests across 14 files. The full typecheck passed earlier. The latest check failed in `eval/dataset.ts` on Zod input types and in `src/app/api/watch/run/route.ts` on its unresolved `@/watch/run` import. The existing Next.js server returned HTTP 200 for the app and compiled panel stylesheet. A React render check covered the empty state, telemetry from a seeded asset, a simulated approval and its measured delta, and the real API gate error.

Live analysis stopped at the gate because `GEMINI_API_KEY` was absent from the server environment. Interactive browser checks were blocked by Chromium launch permissions and native Chrome automation timeouts.

Run `npm run typecheck` and `npm run test`. In the existing app at `http://localhost:4119`, select a seeded asset on the floor or Purdue map and open Crew activity. Run a capture, expand its evidence and risk rows, and use **Move there** after analysis. Review a mitigation, then exercise **Approve** or **Reject** and check the recorded outcome and live risk score.

## Shared bindings

- Pipeline client and run store. Expose `captureThumbnail: CaptureImage | null` on `RunState`, clear it on new input, and populate it from the first submitted photo when the run begins. Keep it local and retain it when reassessing the same captured asset. The panel accepts the optional binding and uses a captured product snapshot URL when available.
- Twin store and both views. Add `hoverPath(nodeIds: readonly string[] | null)` and `hoveredPathNodeIds` for simultaneous highlighting. The current path row highlights the target and lets the pointer highlight each node through `hover(id)`.
- Floor view. Highlight the matching zone when `selectedId` is an area ID. The panel already calls `select(area.id)`.

The sandbox rejected writing `.agents/requests/panel.md`. The coordination bridge failed to write its audit log, so receipt of the request is unconfirmed. Voice playback is disabled in the briefing by design.
