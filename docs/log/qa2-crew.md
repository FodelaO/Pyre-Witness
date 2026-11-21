# qa2-crew: AI crew and transcript, second QA pass (demo day, 14:28 to 14:42)

Scope: `src/crew/**` (except `types.ts`), `src/transcript/**`. Scripts and every screenshot are in
`.agents/qa/qa2-crew/` (`run.mjs` = the one real capture, `verify.mjs` = after-fix check with no model call,
`run.log` = per-frame crew state). Source edits stopped at 14:37, before the 14:42 cut.

The single allowed real capture was used once: Describe device, "Contractor laptop with a 4G USB dongle and remote
desktop software", 1440x900, dark. Frames `run-00.png` to `run-25.png` are 2 s apart (0 to 60 s).
The run finished in 24.9 s and the Chief pinned the briefing about 30 s after submit (frame 11). No console or page
errors in any session.

## Defects

| # | Defect | Status | Before | After |
| --- | --- | --- | --- | --- |
| 1 | "Recommended placement" caption left the recommended room. While the Architect and Inspector stood in the Corporate office, the caption had no free spot there and landed in the PARKING LOT, under that room's title. It read as if the parking lot was recommended. | Fixed. The caption is hidden when it cannot stay in (or within 20 px of) the room it describes, and comes back when the crew walk off. | `run-10.png`, `run-11.png`, `run-12.png` (caption at x 256, y 709) | Logic test with the measured rects (see below). Caption in the right room once the crew left: `run-18.png`, `final-1920-dark.png` |
| 2 | "Rules check passed" badge landed in FILLER 3 (120 px from the checked spot), the room the panel lists under "Never here" and where the as-dropped check had just found 4 findings. A contradiction on screen for about 6 s. | Fixed with the same rule: the badge only shows in or next to the room of the checked placement. The Inspector bubble and dock card still say "Recommendation · passed rules check" at that moment. | `run-12.png` (badge in Filler 3 at x 382, y 481), `run-14.png` (badge in the parking lot) | Same as #1 |
| 3 | A step card with no leader jumped to the far top-left corner of the stage, 500 px from its speaker (Architect "Corporate office · Purdue L4"), beside the Armed chip. It read as a stray notice. | Fixed: a timed step card is not drawn when it is more than 220 px from its speaker and has no leader. The dock card carries the same status. Pinned briefing and idle patrol are unchanged. | `run-11.png` | Logic test (see below) |
| 4 | Dock card status is cut mid-word at 1440 and 1920 during a run ("Recommendat… 31 ms", "Corporate offi… 14.2 s"). Full text is in the tooltip. | Not fixed. Two-line status changes the card height during the run, and I could not check that with a second capture. | `run-12.png` | |
| 5 | Transcript opened with `T`: the "All runs" link shows a focus ring, because it is the first focusable element. Opened by a dock click it does not. | Not fixed (cosmetic, standard keyboard focus). | `transcript-open.png` | |
| 6 | 1280x720, final state: the "Rules check passed" badge sits on the PARKING LOT title row, right after the title text. | Not fixed. It is within 20 px of the Corporate office, so the new rule keeps it. Same as before this pass. | `final-1280-dark.png` | |
| 7 | 3D view: a walking member's plate can say "At desk" while the dock says "Returning to desk"; resting portraits cover each other's name. | Not mine (`src/view3d`). Request written. | `run-3d-0.png`, `run-3d-3.png` | |
| 8 | Idle patrol, room stop "Syrup room · 11 assets": the Architect stands on the Syrup room / Filler 3 border. The label mask keeps the FILLER 3 title readable, so most of the portrait is hidden and only an arc and the name tag show. | Not fixed. Seen two minutes before the cut; the stop is chosen in `patrol.ts` / `walk.ts` and needs a tested change. | `run-21.png` (x 491, y 372) | |

Fixes 1 to 3 could not be re-shot in a real run, because the one capture was already used. They are covered by
a new unit test that uses the rectangles measured in the capture, by a clean typecheck, and by a reload of the app
with no errors (`after-idle-1440-dark.png`).

## Checked and fine

- Idle, dark and light, 1440x900, 1920x1080, 1280x720 (`idle-<width>-<theme>.png`): crew at desks, one member on
  labelled "idle patrol", dock cards readable in both themes, compact face-only dock at 1280. No bubble over a room
  title or equipment tag in these shots.
- Choreography (`run-05.png` to `run-12.png`): Scout "Reading the device description…" with leader, evidence card
  (2 TEXT chips, PORT, RADIO, with ellipsis), Inspector as-dropped stamps MGMT-01 / WASH-01 / USB-01 / RF-01, Architect
  dashed arrow to the Corporate office, Chief "Writing the briefing…" then the pinned briefing. Nothing over the device
  tag (LT-901), the capture bar, the lens or the Armed chip. Hand-off sparks are 0.6 s pulses; none shows in the
  stills I read, so they are not judged. I read frames 05, 06, 08 to 12, 14, 18 and 21; the others are covered by
  the state log only.
- Numbers agree between dock, panel and transcript: Scout 10.6 s (10,578 ms), Architect 14.2 s (14,239 ms),
  rules engine 31 ms, Chief 5.5 s (5,536 ms), run 24,858 ms.
- Transcript (`transcript-open.png`, `transcript-scroll-1..4.png`, `transcript-raw.png`): `T` opens this capture run,
  23 steps in order, each with engine, time, latency and tokens where a model was called; raw JSON expands;
  Escape closes. Light theme is readable (`transcript-open-light.png`).
- Export (`export.json`, `export.md`): both contain the run (23 events, 24 headings), no API key, no base64 image.
- Dock card click (`dock-click-inspector.png`): the floor pans to the member and the transcript opens with
  Crew = Inspector, 7 steps.
- Crew filter, search and the empty state were checked on simulation runs only (`after-transcript-*.png`):
  my selector for the filter step was wrong during the real run, so that step did not execute there.
- 3D (`run-3d-0.png` to `run-3d-3.png`, 66 to 74 s): portraits visible, positions and status come from the real
  crew store (Chief "Briefing ready" where it pinned the briefing, Scout leaves on idle patrol between frames).
  The run had already finished at 28 s, so movement during the run itself was not captured in 3D.

## Files changed

- `src/crew/floorLayout.ts`: `keepLabelInRoom`, `calloutGap`.
- `src/crew/CrewLayer.tsx`: both captions go through `keepLabelInRoom`; far step cards with no leader are skipped.
- `src/crew/floorLayout.test.ts`: one test for both helpers.

## Verification

- `npx tsc --noEmit`: clean (run twice).
- `npx vitest run src/crew src/transcript --maxWorkers=1`: 6 files, 44 tests pass.
- `node .agents/qa/qa2-crew/verify.mjs` after the edits: 4 avatars, 4 dock cards, no console errors.

## Notes for others

- In `verify.mjs` the third Simulate button ("Chiller Trip") did not accept a click within 3 s on the second run,
  while it did on the first. Not investigated (not this sector).
- With a simulation running, the 3D switch shows "Simulation shown in 2D" and no 3D crew. By design, as far as I can tell.
