# qa-stage: QA pass on the stage (top bar, lens, plant floor, network view)

Scope: `src/shell/**`, `src/layers/**`, `src/floor/**`, `src/purdue/**`, `src/equipment/**`.
Method: headless Chrome through Playwright against the running app, screenshots read and judged.
Scripts: `.agents/qa/qa-stage/shoot.mjs` (every lens at the given sizes) and `crop.mjs` (scripted single session).
No real Gemini capture was used (0 of the 2 allowed).

## Defects found and fixed

| # | Defect | Before | After |
| --- | --- | --- | --- |
| 1 | 1280x720 (projector): the plant was pushed against the left edge and the right 40% of the stage was empty. The fit chose the column left of the bottom legend. | `shots/qa-stage-before-material-1280.png` | `shots/qa-stage-after-material-1280.png`, `shots/qa-stage-after-both-1280.png` |
| 2 | Room chips landed on other labels when they did not fit beside the title: "RO 18 m3/h" over the last letter of WATER TREATMENT (1280), "Restricted" on the Insider label (1280, 1440), "3.7 vol CO2" across the CIP pipe (1280), "Normal" under the crew avatars (1280). | `shots/qa-stage-before-material-1280.png`, `shots/qa-stage-before-material-1440.png` | `shots/qa-stage-after-material-1280.png`, `shots/qa-stage-after-material-1440.png` |
| 3 | Three "Normal" chips (crew office, corporate office, parking lot) said nothing. | same | same |
| 4 | "Supplier delivery" crossed the right border of the parking lot. | `shots/qa-stage-before-material-1440.png` | `shots/qa-stage-after-material-1440.png` |
| 5 | Data lens lettering (cell names, protocol chips, finding badges, Internet / Vendor remote / Nearby RF) printed at about 5.5 px at 1280x720 and 6.3 px at 1440x900. | `shots/qa-stage-before-data-1280.png` | `shots/qa-stage-after-data-1280.png`, `shots/qa-stage-after-data-1440.png` |
| 6 | The 10 m scale bar sat on the dashed network perimeter in Both and Data. | `shots/qa-stage-before-both-1440.png` | `shots/qa-stage-after-both-1440.png` |

## What changed

- `src/floor/floor.css`: `.pw-plant-floor` is now a `size` container. In a wide, short pane
  (`min-aspect-ratio: 19/10`, at least 900 px wide) the legend becomes a 204 px side column under the zoom
  control, so the fit can centre the plant. Other pane shapes keep the bottom legend.
- `src/floor/ZoneLabel.tsx`, `src/floor/labelPlacement.ts` (`isClear`): a chip is drawn only for an abnormal
  state or an operating note; it goes beside the title (compressed to 80% at most), under it, or in the far
  corner when that clears the title. If none is clear it is hidden for a normal room (the note stays in the
  `<title>` and aria-label). An attention or alarm chip always shows and keeps the least-overlap fallback.
- `src/floor/ZoneLayer.tsx`: walk-in entry symbols (Insider, Visitor, Supplier delivery) are label obstacles.
- `src/floor/EntryPoints.tsx`, `src/floor/FloorStage.tsx`: an entry name within 110 units of the sheet's
  right edge is right-aligned.
- `src/floor/Blueprint.tsx`: scale bar moved 8 units towards the wall, clear of the network perimeter.
- `src/layers/printScale.ts` (new, with `printScale.test.ts`), `DataLayer.tsx`, `NetworkDrawing.tsx`,
  `NodeAnnotations.tsx`: network lettering is enlarged about its own anchor when the fitted drawing is small
  (1.24x at 1440x900, 1.43x at 1280x720, capped at 1.6x, 1x at 1920x1080). Layout boxes are unchanged.

All honesty labels are untouched: "rules engine", "idle patrol", "est.", "Software assumed (simulated
plant)" are visible in the after shots.

## Verification

- `npm run typecheck`: clean on the last run. An earlier run failed only in
  `src/app/api/health/originGuard.test.ts` (not this task) and that cleared by itself.
- `npx vitest run src/floor src/layers --maxWorkers=1`: 8 files, 30 tests passed.
- Re-shot after the changes: all three lenses at 1280x720, 1440x900, 1920x1080 and 1024x640. Read and judged:
  Material 1280 / 1440 / 1920, Both 1280 / 1440 / 1024, Data 1280 / 1440. The 1920 Both and Data shots and
  the 1024 Material and Data shots were taken but not read.
- One scripted session at 1280x720 with reduced motion: Data, Levels, select `PLC-F3` (highlighted in both
  views, `shots/qa-stage-split-select-1280.png`), switch to Both, reload: the lens persisted
  (`shots/qa-stage-reload-both-1280.png`). No console errors.

## Not fixed, in this sector

1. **Purdue levels at 1280x720**: L1 is cut off at the bottom of the pane and L0 needs scrolling
   (`shots/qa-stage-split-select-1280.png`). Not attempted.
2. **Split view at 1280x720 with an asset selected**: floor labels pile up ("TT-401 / FT-401 / LT-404",
   "HIST-03 / FW-DMZ / SW-OT") and the selection card covers PLC-F3 and its attack-path tags. Not attempted.
3. **1024x640, Both**: the side legend is 11 rows tall and the enlarged "2 · S4" badge at the plant's right
   edge slips under its left border (`shots/qa-stage-after-both-1024.png`).
4. Data lens at 1280: the enlarged "1 · S4" badge touches the PROFINET chip (readable, not overlapping text).
5. At 1280 the Blending and Control room operating notes are hidden because no clear position exists.

## Not checked

Lens slider drag and label clicks (only keys 1 2 3), the Gemini chip popover, Watch, Proof, zoom in / out /
fit buttons, pan, hover labels in Both, tank percentages at zoom, a reload in Material and Data, and a
visual review of reduced motion beyond the one session above. The dev server stopped answering three times
during the pass (10 to 60 s each), which used most of the time box.

## Outside this sector

See `.agents/requests/qa-stage.md`.
