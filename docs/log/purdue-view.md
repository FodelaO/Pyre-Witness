# Purdue network map

`PurdueMap.tsx` reads the twin and risk report from the shared store. The level, zone, node, link, conduit, and path layers draw a single pane-sized diagram in `src/purdue/`. Layout tests cover 520 px and 1,200 px panes. Narrower panes scroll horizontally with a fixed level rail.

- Production cells keep one column across levels. The site operations zone uses available width at Level 3 and narrows beside the cells at Level 2.
- Level 0 groups show field counts. Selection or hover on the floor reveals a linked field asset in its collapsed group and scrolls it into view.
- Conduit gates sit on zone boundaries and show their declared allowed flows on hover or focus. Risk overlays trace report steps, annotate technique IDs, and mark crossings of the DMZ or an open gate. Shared segments are drawn once.
- Added-device drags resolve a level and network zone, preserve the asset's physical presence, and call `reassessAsset`. Pointer capture and edge scrolling keep the drag active inside a small pane.

## Verification

- The Purdue TypeScript check passed. `npx vitest run src/purdue` passed 9 tests and `npm run test` passed 71 tests.
- Chrome at `http://localhost:4119/` exercised the Floor, Purdue, and Side by side tabs, including 1,199 px and 519 px panes, two-way selection and linked hover, field expansion, zone highlights, gate details, and narrow-pane scrolling.
- A synthetic added device exercised the real browser drag and twin mutation. The focused test verifies the reassessment call after the move.

## Known gaps

- Live Gemini reassessment remains unverified. The browser fixture ran without a provider request.
- The last whole-repo `npm run typecheck` reported errors in `eval/baseline.ts`, `eval/dataset.ts`, and `src/app/api/watch/run/route.ts`.
- Conduit endpoints need a zone on the diagram. An asset-free endpoint can use the exact name of its Purdue band, as the seed does for Internet / Cloud.

## Contract change requests

None.
