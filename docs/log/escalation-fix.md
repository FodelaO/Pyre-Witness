# escalation-fix (21 Nov, 14:28 to 14:42, source frozen at 14:41)

Scope: `src/escalation/**` only. Nothing in `src/app/call/**` or `src/app/api/escalation/**` changed.
Budget used: 1 real capture, 1 spoken briefing, `tsc --noEmit` twice (both clean), vitest on `src/escalation` (5 files, 12 tests pass).
Screenshots and scripts: `.agents/qa/escalation-fix/`.

## Defect 1: no call although the panel showed $290k (fixed)

**Cause, measured.** The monitor priced only the twin's rule findings. For the camera beside FIL-3 those are
`CAM-01 $20k, RF-01 $20k, CRED-01 $20k, MGMT-01 $20k, USB-01 $20k, WASH-01 $31k, ZONE-01 $20k`: the highest is the
`$31k` seen in rehearsal, under the $100k threshold. The panel's `Here` figure is the largest loss among the
as-dropped check's findings **and its rules-engine attack paths**; the $290k is the path
`Internet -> CAM-901 -> SW-F3 -> FIL-3`. The monitor never looked at paths.

**Change.**
- `src/escalation/placedDeviceLoss.ts` (new): prices the captured device as `src/panel/PlacementLoss.tsx` does.
  Not at the drop: `Here` (as-dropped check on the as-dropped twin). At the checked recommendation: `est. loss now`.
  Returns nothing while the panel prints no placement figure (run in progress, hold, no passed recommendation check).
- `src/escalation/evidence.ts`: new cause `capture:<asset>` from that function. Finding-level causes for the captured
  device are withheld while its run is in progress and replaced by the capture figure afterwards, so one device never
  carries two figures. Finding and simulation causes now use `displayedEventLoss`, the rounded figure the inspector
  and the simulation panel print (was the unrounded `lossIfManifests`).
- `src/escalation/monitor.ts`: re-checks when the run settles, the moment the panel prints its figure.
- `src/escalation/recommendation.ts`, `types.ts`: the capture cause offers the move when `There` < `Here`.
- `src/escalation/EscalationCall.tsx`: value line reads `$290k est. · per event`.

**Verified, one real capture, 1440x900 dark** (pin right of FIL-3, Describe device, the brief's text):

| Step | Observed | Screenshot |
| --- | --- | --- |
| Before | chip `Armed $100k / 60`, no card | `cap-01-idle.png` |
| Panel answer, 22.7 s | `Here $290k · There $2.7k est. per event` | `cap-04-card-with-panel.png` |
| Card, 337 ms after the panel figure | `Threshold crossed · $290k est. · per event · CAM-901 at Filler 3 · Internet -> CAM-901 -> SW-F3 -> FIL-3 · assumed (simulated plant)` | same |
| `Call on-call` | QR and link `http://172.16.249.18:4119/call/<code>`, `Waiting for paired phone` | `cap-05-pairing.png` |
| Phone 390x844 | `Incoming call · CAM-901 · Filler 3 · $290k est.`; desktop `Ringing`, `Phone paired` | `cap-06-phone-ringing.png` |
| `Answer` | Chief audio, script ends `Estimated loss $290k. Move device to Corporate office.`; desktop `Answered` | `cap-07-phone-answered.png`, `cap-08-desktop-answered.png` |
| `Approve action` | phone `Action approved 02:32:31 PM`; desktop `Approved 02:32:31 PM · Paired phone B472 · Move device to Corporate office` | `cap-09-phone-approved.png`, `cap-10-desktop-approved.png` |
| Move applied | panel `Moved · est. loss now $2.7k per event`, button `At recommended location`, risk 51 to 47 | `cap-10-desktop-approved.png` |
| Dismiss | chip `Armed $100k / 60`, no card | `cap-12-desktop-cleared.png` |

No console or page errors on desktop or phone.

## Defect 2: escalation after `Move there` (works in the logic check; button not clicked on a real capture)

The one capture allowed went to the phone-approval path above, which applies the same twin update. The panel's
`Move there` button was **not** clicked on a captured device in the browser. What was checked instead:
- `.agents/qa/escalation-fix/move.test.ts` (QA-only, no model, hand-written camera profile on the seed twin, real
  rules engine, real monitor and stores): 0 records while the run is in progress; after it settles 1 record at
  `$290k`, `if moved $2.7k`, action `Move device to Corporate office`; after the `Move there` store update the cause
  reads `$2.7k` at Corporate office and the record gets `resolvedAt` (time stamped). Passes. Run with
  `npx vitest run --config .agents/qa/escalation-fix/vitest.qa.config.mts --maxWorkers=1 --silent=false --reporter=verbose`.
- Browser, no model (`resolve.mjs`, seed finding with the threshold lowered in an isolated context): an un-called card
  clears and the chip returns to `Armed` (`after-cleared-uncalled-1440x900-dark.png`); a called card stays as
  `Resolved 02:37:59 PM` until dismissed (`after-resolved-called-1440x900-dark.png`).

## Defect 3: card and pairing popover covered the crew dock (fixed)

Found while verifying. The shell pins the instrument to the stage's top-left, so the card grew down onto the crew dock.
- Before: 1280x720, card over `Open transcript` and the Scout card (`before-layout-1280x720-dark.png`, `-light.png`);
  1440x900, card edge touching the dock (`before-layout-1440x900-light.png`), pairing popover over the dock header,
  Scout and the top of Architect (`cap-05-pairing.png`), and over Scout, Architect and the top of Inspector once the
  approval receipt made the card taller (`cap-10-desktop-approved.png`). 1920x1080 was clear with the card alone.
- Change: `src/escalation/escalation.css`, from 1100px wide the card and its popovers open to the right of the chip.
- After, 1280x720, 1440x900, 1920x1080, dark and light, card alone and with the pairing popover: chip `14,74-183,104`,
  card `204,74-493,272`, popover `204,235-493,374`. A 9x9 hit-test grid under each finds only the floor drawing: no
  crew dock, lens, zoom, capture bar or results panel. Files `after-layout-<size>-<theme>.png` and `...-pairing.png`.
  Also clear with the settings popover (`after-settings-popover-1440x900-dark.png`), in the Data lens and with the
  Levels split view at 1280 and 1440 (`after-lens3-levels-*.png`).

## Not fixed, not verified

1. **Three copies of the selection loop.** The panel's and econ's versions are private and those folders are read-only
   to me, so `placedDeviceLoss.ts` restates the loop over the same exported functions and inputs. Same number today, not
   one function. Request to export it: `.agents/requests/escalation-fix.md`.
2. **Hold outcome.** If the rules engine holds the recommendation the panel prints no placement figure, and the device
   falls back to finding-level figures ($31k at most for this camera). No call would fire in that case.
3. **Screenshots of the real capture show the old card position.** They were taken before the layout fix; the capture
   could not be repeated. The after-layout screenshots use a seed finding (`PLC-F3 $94k`) with the threshold lowered.
   The approved card has not been seen in the new position.
4. **Simulation card not re-run in the browser** after its figure switched to the displayed rounding. Typecheck and
   unit tests only.
5. Approved receipt wraps to a second line that starts with `·` (`cap-10-desktop-approved.png`). Cosmetic.
6. Phone page prints the path as `->`; the desktop font draws arrows. Cosmetic.
7. Below 1100px wide the old stacked layout remains; not checked.
8. The regression check for the capture figure is QA-only (`move.test.ts`), outside `src` and not typechecked. Both
   `tsc` runs were spent, so it was not added to `src/escalation/`.
9. `.agents/qa/escalation-fix/node_modules` (8 KB vitest cache from the QA config) is left behind: removal was denied.

## Files in these folders that are not from this task (`telephony`, 14:39 to 14:41)

A second task (`.agents/briefs/telephony.md`, written 14:38) owns the same folders and was told to create new files
only until this task exits. Not written, reviewed, typechecked or browser-tested here:
`src/escalation/` `PhoneContactDialog.tsx`, `TelephoneCard.tsx`, `automaticCalls.ts`, `automaticCalls.test.ts`,
`phoneContact.ts`, `phoneNumber.ts`, `phoneNumber.test.ts`, `placeCall.ts`, `telephoneTypes.ts`, `telephony.css`,
`testScenario.ts`, `testScenario.test.ts`, `testScenarioEvidence.ts`, `useEscalationPhone.ts`, `useTelephoneCalls.ts`,
and `src/app/api/escalation/call/**`. None is imported by the mounted component yet, so the app verified above is
unaffected.

State of the folder at 14:44 with those files present:
- `npx vitest run src/escalation src/app/api/escalation --maxWorkers=1`: 9 files pass, 1 fails.
  `testScenario.test.ts` expects a record with `trigger.test`; nothing calls `testScenarioCause` yet.
- Typecheck: both runs here (14:30, 14:37) predate those files. Expected to fail now, by reading, not run:
  `testScenarioEvidence.ts:25` sets `test: true` on an `EscalationCause`, a field `types.ts` does not declare.

For whoever integrates:
- `readCauses` returns `[simulation, capture, ...findings, risk]`. Keep `capture:<asset>` and the rule that a device
  with its own priced cause has its finding-level causes filtered out. `TEST-901` is added without a run, so today its
  findings would raise finding-level cards next to the `test-scenario:` one; filter it the same way.
- `EscalationCause` gained `lossIfMoved?`; `planApproval` reads it. `test?: boolean` still has to be added.
- From 1100px wide every direct child of `.pw-es` except the chip lands in the second grid column, beside the chip.
- Promote `.agents/qa/escalation-fix/move.test.ts` into `src/escalation/` once a typecheck run is available.

## Seen from another lane

`ReferenceError: useMemo is not defined at AssetLayer (src/floor/AssetLayer.tsx)` on two page loads at 14:33:15 and
14:33:21: the stage showed `Plant floor unavailable. Retry` instead of the drawing
(`before-layout-1440x900-light.png`). Gone from 14:33:27 on, and the file now imports `useMemo`; every later load
was clean. A tab that was already open in that window may still show the fallback until `Retry` or a reload.
