# Risk hero

The right pane opens on the current rules-engine score and estimated annual loss. The same button moves the dial into the compact header and reveals To-dos, Threat watch, and Updates. The score and arc use the same animated value. Reduced motion swaps both views immediately. The four display bands group the rules engine's Guarded band under Low.

To-dos uses the rendered action list's count. Threat watch counts sourced advisories in the primary list, omitting labeled drills. The existing watch panel remains mounted for updates, and the top-bar watch shortcut opens its tab. Capture keeps a compact risk readout while the editor is open.

Files touched in `src/panel` are `RiskDial.tsx`, `RiskReviewTabs.tsx`, `SidePanel.tsx`, `TodoSection.tsx`, `riskHero.css`, and `useWatchAdvisoryCount.ts`. No contract changes were requested.

Browser checks at `http://localhost:4119` covered light and dark default 3D, keyboard disclosure and tab navigation, watch shortcut and sourced count, capture, and instant reduced motion. Approving a ranked task reduced the score from 46 to 24 and updated the pending count and animated arc. Public feeds ran during the smoke check. The model review endpoint was blocked in the browser check.

Static checks use `npx --no-install vitest run src/panel` and `npx tsc --noEmit`.
