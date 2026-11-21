# Main-screen integration

The plant drawing and its three views stay above a fixed dock. Capture opens in the results rail so the drawing and its pin stay visible. Submitting replaces the capture tools with the real crew stages. Drafts survive dismissal, cancellation and a failed request. Below 1280 px the rail opens as a drawer. Pin mode temporarily reveals the drawing.

Five scenario shortcuts share the dock. Simulate opens the additional CO₂ exercise. Replay transport and the simulation label appear during a run. The final line stays in the dock, and the side rail holds the expandable outcome and counterfactual comparison.

The rail pins the risk dial above the Chief, captured device, placement answers and human mitigation decisions. The idle rail shows the asset inspector, daily Threat Watch and collapsible crew activity. Fit Preview, briefing audio and Chief mic mount inside individual error boundaries. The shared highlight binding links every displayed path node to both diagrams. Area links select the corresponding zone.

The header uses the supplied mark and PNG app icons. Proof uses the same surfaces and typography for paired bars, 95% intervals, sample sizes, model IDs and failure evidence. The live page shows its empty state until the evaluator writes a report.

## Screenshots

| Screen | 1440 × 900 | 1920 × 1080 |
| --- | --- | --- |
| Main before | [1440](shots/integration-before-1440x900.png) | [1920](shots/integration-before-1920x1080.png) |
| Dock integration | [1440](shots/integration-dock-1440x900.png) | [1920](shots/integration-dock-1920x1080.png) |
| Results integration | [1440](shots/integration-results-1440x900.png) | [1920](shots/integration-results-1920x1080.png) |
| Main after | [1440](shots/integration-after-1440x900.png) | [1920](shots/integration-after-1920x1080.png) |
| Capture open | [1440](shots/integration-compose-1440x900.png) | [1920](shots/integration-compose-1920x1080.png) |
| Analysis starting | [1440](shots/integration-progress-1440x900.png) | [1920](shots/integration-progress-1920x1080.png) |
| Simulation outcome | [1440](shots/integration-simulation-1440x900.png) | [1920](shots/integration-simulation-1920x1080.png) |
| Proof before | [1440](shots/integration-before-proof-1440x900.png) | [1920](shots/integration-before-proof-1920x1080.png) |
| Proof after | [1440](shots/integration-after-proof-1440x900.png) | [1920](shots/integration-after-proof-1920x1080.png) |

[Drawer at 390 × 850](shots/integration-drawer-390x850.png)

## Verification

- Chromium opened the existing app on port 4119. Checks covered capture shortcuts and draft retention, upload, phone pairing entry, denied camera, floor pinning, watch collapse and offline display, simulation playback, view tabs and the results drawer. The drawing's bounds stayed fixed during composition and analysis. The viewport sweep covered 320–2560 px, including both sides of the drawer breakpoint.
- A real text capture passed Decisions and reached Scout, where Gemini rejected the request. The missing-key transport check used an isolated error response and returned the one-line message. The proof bar and failure gallery check used an isolated layout fixture. The app's Proof page remained empty.
- `npm run typecheck` passed. `npx vitest run src/capture src/panel --maxWorkers=1` passed 11 tests. `npm run test -- --maxWorkers=1` passed 279 tests with three skipped. Scoped ESLint passed.

## Remaining visual checks

1. A successful live capture is needed to inspect a real Chief briefing, photo thumbnail, attack-path hover, Fit Preview and voice playback together. A measured Proof report also remains unavailable.
2. Longer simulation outcomes can truncate in the compact dock. The complete text is available in the comparison.

No shared contract changes were requested.
