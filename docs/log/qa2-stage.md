# qa2-stage: second QA pass on the stage (top bar, plant floor, network overlays, Purdue levels, light theme)

Scope: `src/shell/**`, `src/layers/**`, `src/floor/**`, `src/purdue/**`, `src/equipment/**`, `src/theme/**`.
Method: headless Chrome (Playwright, software rendering) against the running dev server; screenshots read and judged.
Evidence and scripts: `.agents/qa/qa2-stage/` (`shoot.mjs` sweep, `probe.mjs` scripted session, `settle.mjs`,
`splitclick.mjs`). Real Gemini captures used: 0.
Clock: all source edits were made between 14:31 and 14:34. `.agents/demo-build-cut` existed at 14:42:30; nothing in
`src/` was touched after that. Everything after is verification and this report.

## Defects fixed

| # | Defect | Before | After |
| --- | --- | --- | --- |
| 1 | **Purdue levels, short pane (1280x720, and 1440x900 once a selection expands L0):** in the dense layout the zone names sat under the gates on each zone's top edge. "OT DMZ" was half covered by the FW-DMZ chip, "Enterprise" touched FW-EDGE, and the cell names (Water, Syrup, Blend, F3, Pack, Util.) were covered by the H gates and struck through by the bus line. | `before-1280-dark-purdue.png` (2x close-up), `before-1280-dark-levels.png`, `before-1280-light-levels.png` | `after-1280-dark-purdue.png`, `after-1280-light-levels.png`, `splitclick-1440-light-mouse.png` |
| 2 | **Top bar at 1280x720:** the plant disclosure was cut to "Simulated plant: Bebidas del Norte, Line 3 (…", so "(fictional)" was lost. | `before-1280-dark-lens1.png` | `after-1280-dark-lens1.png`, `after-1280-light-levels.png` |
| 3 | **Selecting a device with many neighbours (PLC-F3 in Both, and in Data + Levels):** neighbour tags printed on top of each other: "SCADAHIST-03", "TT-40:FT-40:LT-404", "PT-401" on "PLC-F3". | `before-1280-dark-select-both.png`, `after-1280-dark-split-select.png` (taken before this fix) | `after2-1280-dark-select-both.png`, `after2-1280-dark-split-select.png`, `after-1440-light-select-both.png` |

All paths are under `.agents/qa/qa2-stage/`.

## What changed

- `src/purdue/layout.ts`: dense header depth 18 -> 23 px.
- `src/purdue/ZoneBoxes.tsx`: in the dense layout the zone name starts 11 px below the zone edge (was 6), which
  clears the 18 to 20 px gate centred on that edge. The dense diagram grew from 423 to 451 px in a 550 px pane at
  1280x720, so it still fits without scrolling. The normal layout (1440x900 and 1920x1080 with nothing selected) is
  unchanged: `after-1440-dark-levels.png`, `after-1920-light-levels.png`.
- `src/shell/shell.css`: from 1180 to 1365 px wide the disclosure stacks "Simulated plant:" over
  "Bebidas del Norte, Line 3 (fictional)" (two lines, 31 px in the 62 px bar). One line at 1440 and 1920 as before.
- `src/floor/AssetLayer.tsx`: new `clearNeighbourTags`. On selection, the tags of the selected device and its direct
  neighbours are placed greedily at the fitted scale (selected first, then large equipment, cabinets, other, field
  devices). A neighbour tag that would land on a kept tag is no longer forced on.

Honesty labels untouched and seen in the after shots: "Simulated plant: ... (fictional)", "rules engine",
"idle patrol", "est.", "Software assumed (simulated plant)", "Inventory assumed (simulated plant)".

## Verification

- `npx tsc --noEmit`: one run at 14:38, after the last edit, clean.
- `npx vitest run src/purdue src/floor --maxWorkers=1`: 7 files, 27 tests passed (includes the dense height test).
  `clearNeighbourTags` has no unit test of its own.
- Console: no errors in any of my final runs. One run at 14:33 to 14:35 got a 500 from a syntax error in
  `src/crew/CrewLayer.tsx` (lines 92 and 97, another agent mid-edit). It cleared by 14:35:21.
- Sweeps after the edits: 1280x720, 1440x900, 1920x1080, dark and light, lenses 1 2 3 and Levels (24 shots).
  Read and judged: 1280 dark lens 1, 1280 light lens 3 and Levels, 1440 dark lens 2 and Levels, 1920 dark lens 2
  and lens 3 (settled), 1920 light lens 1 and Levels. The other 15 after shots were taken but not read. The
  before sweep (1280 and 1440 only) was read for 13 of 16 shots.
- Scripted session (1280 dark three times, 1440 light once): Levels, select PLC-F3, select BL-301 in Material,
  PLC-F3 in Both, keyboard, zoom in twice, zoom out, Fit plant.

## Checked and found fine

- Top bar at all three sizes, both themes, each lens and Levels: one row, 62 px, header `scrollWidth` equals
  `clientWidth`, no overlap between brand, disclosure, 2D | 3D, lens, Levels / Plan, Watch, Gemini chip, Proof,
  theme button and Risk chip. Escalation chip "Armed $100k / 60" sits clear below it.
- Material: room titles, chips, tags, tank levels, pipes, legend and the 10 m scale.
- Both and Data: links readable over equipment, finding badges not on tags, protocol chips readable.
- Selection ring and card in dark and light. Light theme: no dark slabs in the top bar, floor, crew dock, legend,
  selection card, Purdue view or rail; alarm red, amber, OK green and data purple stay distinct.
- Keyboard: the drawing is one Tab stop (the next Tab lands on "Camera"), arrows moved PLC-F3 to CV-P1, Enter
  selected it (card and inspector).
- A real click on PLC-F3 in the split view selects it at 1440x900 in dark and light (`splitclick.mjs`, pointerdown
  target logged as PLC-F3).

## Not fixed, in this sector

1. **Attack-path technique labels** (`src/floor/AttackPathLayer.tsx`) avoid only each other, in world units. With
   PLC-F3 selected: "T0822" and "T0883" sit on R-401's "46%", "T0847" sits on the "Viewing corridor" chip, and in
   the split view "T0886" covers the PLC-F3 tag and T0822 / T0883 overlap. `after2-1280-dark-select-both.png`,
   `after-1440-light-select-both.png`, `splitclick-1440-light-mouse.png`. Found at 14:36, no time for a safe fix.
2. **Neighbour tags against always-on tags:** the new pass does not know tags that are shown anyway, so "ERP-01"
   still touches "FW-EDGE" in the split view (`splitclick-1440-light-mouse.png`). It also uses the fitted scale, so
   a dropped neighbour tag does not return when zooming in the Both lens.
3. **Purdue, dense:** the red unenforced gate touches the first letter of SW-PK (`after-1280-dark-purdue.png`).
   With a selection, "T0886" is printed twice per lane over SW-F3 and PLC-PK.
4. **Zoomed in two steps:** instrument readings collide with neighbours ("18.18 m3/h" on "8 uS/cm" at FT-101 /
   CT-101, "HIST-DMZ" on "JMP-DMZ"). `after2-1280-dark-zoom-in.png`.
5. **Data lens at 1280:** "Vendor remote" and "Internet" almost touch and the perimeter line runs through them
   (`after-1280-light-lens3.png`); the "2" badge at FW-DMZ covers the end of the "OT DMZ" label.
6. **Both lens:** the "2 - S4" badge at GW-PK straddles the plant's right wall line. Legible.
7. **Split view:** floor lettering (cell names, protocol chips) is about 5 px at 1280 and 1440. Known from round 1.
8. "Insider" is printed over ghosted control-room equipment in Material.

## Seen outside this sector

- `src/crew`: the "idle patrol" label box lies across the network perimeter line and can cover the Internet entry
  icon (`before-1440-dark-lens2.png`, `after2-1280-dark-select-both.png`). The Scout avatar parked on the
  PACKAGING title at 1920 light (`after-1920-light-lens1.png`).
- `src/watch`: advisory rows wrapped as "CISA / ICS", "9 d / ago", "ICSA-26-316- / 04" at 1440 once
  "Decisions triage" appeared (`before-1440-light-lens3.png`, still in `after-1440-light-split-select.png` at
  14:36). At 14:39 the label was on its own line at 1440 dark (`after-1440-dark-levels.png`).
- Rail: "Session trend" was clipped at 1280 at 14:28 and wraps to two lines since about 14:35.

## Not checked

Pan by drag, the 3D view, the lens slider by mouse, the lens notice, the risk delta in the Risk chip and any
escalation chip state other than "Armed" (no capture was run), the simulation overlays, reduced motion, and a
selection in light at 1280 and 1920.

## Harness notes

- At 1920x1080 the Data lens was painted between 0.9 s and 3 s after pressing `3` (the DOM state was already
  Data at 0.9 s): `settle-1920-dark-data-0900ms.png`, `settle-1920-dark-data-3000ms.png`. This is software
  rendering in headless Chrome; not confirmed on real hardware.
- The dev server was slow twice (page loads near 50 s). In two of those runs, both at 1440 light in the split
  view, a scripted click on PLC-F3 did not select it; two later runs (dark and light) selected it every time. I
  could not reproduce the miss and did not find its cause.
