# qa2-dock: second dock QA pass (capture, samples, phone, pin, simulate, Chief voice)

Scripts and screenshots: `.agents/qa/qa2-dock/` (Playwright through installed Chrome, one browser at a time).
Source edits were made between 14:34 and 14:37, before the 14:42 cut. Everything after that is checking and reporting.
One real Gemini capture was used (sample photo, see below).

## Defects fixed

| # | Defect | Fix | Before | After |
| --- | --- | --- | --- | --- |
| 1 | The simulation's dashed area ring ran through the room title and its chip, so "UTILITIES · Glycol -4 °C", "BLENDING & CARBONATION" and "PARKING LOT · Attention" looked struck out. | `src/sim/SimLayer.tsx`: the ring is now drawn on three sides (left, bottom, right). The top side is the floor's own boundary, which already takes the attention / alarm colour and passes under the title. | `zoom-1440-dark-before-chiller-zone.png`, `zoom-1440-dark-before-wireless-zone.png`, `sim-1440-dark-3-end.png` | `zoom-1440-dark-after-chiller-zone.png`, `zoom-1440-dark-after-wireless-zone.png`, `wide-1920-dark-cip-comparison-open.png` |
| 2 | In Ammonia Release the reading tag "NH₃ 32 / 300 ppm" covered the NH3 zone name and its Alarm / Attention chip. | `src/sim/IncidentEffects.tsx`: the tag now hangs on the zone's lower edge, below the name row. | `zoom-1440-dark-before-ammonia-mid.png` | `zoom-1440-dark-after-ammonia-mid.png`, `wide-1920-dark-ammonia-mid.png` |
| 3 | At 1440 the dock outcome line was cut 7 px short: "…ZSC-311 hardwired permiss…", "…No exposed OT radio in ra…". | `src/sim/sim.css`: transport buttons 28 → 25 px wide, replay box right padding 8 → 6 px. The line now measures 257 px in a 257 px box for all four long outcomes. | `sim-1440-dark-0-end.png`, `sim-1440-dark-5-end.png` | `zoom-1440-dark-after-cip-dock.png` |
| 4 | Samples tray: the credit tooltip was a 140 px, five-line box that covered the card title and tabs. At 1280 the labels broke inside words ("IP camer / a", "Acces / s point"). | `src/capture/SamplePhotos.module.css`: tooltip up to 216 px wide (two or three lines, title stays visible), labels wrap on whole words only. | `cap-1440-dark-samples-credit-first.png`, `cap-1280-light-samples-credit-first.png` | `real-samples-credit.png`, `after-1280-dark-samples-credit.png`, `wide-1920-light-samples-credit.png` |

Checks after the edits: `npx tsc --noEmit` passes for the whole repo on the second run (about 14:55). The first run at 14:40 showed two errors in `src/escalation/**`, another task's files, which were gone by the second run.
`npx vitest run src/sim src/capture --maxWorkers=1`: 12 files, 55 tests pass. No console or page errors in any browser run.

## The one real capture (sample photo, with a pin)

Pin placed in Filler 3, Samples opened, "LTE router" clicked (`real.mjs`).
The browser sent `POST /api/analyze` with `input.kind: "photo"`, one `image/jpeg` image and `dropPoint {x: 774, y: 504, area: "filler3"}`, the same request an upload makes.
The stream returned 200, the dock showed Scout / Architect / Inspector / Chief progress with a stop button, and the run finished in about 37 s: "Cellular Wi-Fi router" (Huawei), risk 46 → 48, "Never here: Filler 3", Chief briefing shown.
Shots: `real-samples-credit.png`, `real-run-12s.png`, `real-result.png`.
During this run the input gate reported "Gate unavailable: continued without it". The panel showed that line as is. This is the pipeline's area, not changed.

## Checked, no change needed

- **Capture entries** (1440 dark and 1280 light in full, 1920 light for Describe, Samples and Pin): all seven tools have a tooltip and an accessible name. Empty Describe and empty Link keep Analyze disabled. "not a url" and "https://" give "Enter a valid http:// or https:// URL." and Enter does not submit. A `.txt` upload gives "Could not read a photo. Try a JPEG or PNG." and the card stays usable. No camera gives "Camera denied. Upload a photo." with Retry. Long text stops at 1200 with a `1200/1200` counter.
- **Keyboard**: Enter on a focused dock tool opens the card with the field focused. Tab goes to Pin location, then Analyze. Escape closes and returns focus to the tool. `C` reopens with the draft kept.
- **Pin**: arm shows "Click a zone to pin a device" and the tooltip "Cancel pin". Escape cancels. Re-arm and click places the pin, and the card chip reads "Filler 3 ×".
- **Phone QR**: QR plus LAN address `http://172.16.249.18:4119/capture?s=…` (not localhost), with an address picker for the second interface. The phone page at 390x844 loads with Take photo, Choose photos, three slots, a note field and Send to laptop, with no sideways scroll (`phone-page-390-dark.png`). Nothing was sent from the phone.
- **Simulate, Both lens**: six scenarios offered. All six ran to the end at 1440 dark and 1280 light, each with the SIMULATION tag in the dock and a "Contained in mm:ss · safeguard" line. Loss figures carry "est. · SIMULATION" (CIP $2.3k, Ammonia $2.3k, Chiller $79k, CO₂ $2.3k, Ransomware $3.4k, Wireless $2.3k).
- **Timeline**: clicking stage 4 mid-run jumps to 00:10 and pauses. Clicking stage 2 goes back to 00:04. Play resumes to the end.
- **Approve and re-run** (CIP): "Isolate CIP branch" projected 00:12 → 00:06. After Approve and Rerun the dock reads "Contained in 00:06 · CIP branch isolation", and the panel lists the card as "Applied · 6 s earlier 00:12 → 00:06" (`flow-1440-dark-rerun-2-rerun.png`). The awaiting list is recomputed against the new 00:06 result (4 cards → 2).
- **Reset**: no ring, route, marker or tag left in the drawing, and the transport closes. The launcher icon fades from amber for under two seconds after Reset. That is the colour transition, not stale state (`aria-pressed` is already false).

## Not fixed

1. **1280x720: the dock outcome line is still cut** ("Contained in 00:16 · Docu…", `sim-1280-light-1-end.png`). The replay box is about 228 px there. The full text is in the tooltip. Seen at 14:40 with under two minutes of edit time left. The only fix inside my folders was to hide the "Simulate" word at that width, and I judged that worse than the ellipsis. The other route is a narrower Chief button (shell).
2. **Voice with the mic blocked is not silent**: the button reads "Hold to retry" and a one-line bubble "Mic blocked. Allow it, then hold again." appears above it, over the lower row of the legend (`flow-1440-dark-voice-after.png`). No dialog and no console error. Seen at 14:45, after the cut. Grant the mic permission on the demo machine before 15:00.
3. **Mitigation cards exist for two of six scenarios**: CIP Crossover (4) and Ammonia Release (1). Chiller Trip, CO₂ Upset, Site Ransomware and Rogue Wireless end with the loss figure and the comparison only. I did not establish whether that is intended.
4. **The loss figure sits below the mitigation cards.** With CIP's four cards it is below the fold at 1440x900 until the panel is scrolled (panel).
5. **Phone QR can be slow or refuse**: once, at 14:45, the QR did not appear within 25 s while the dev server was busy (fine two minutes later). The pairing store also holds at most 12 sessions and frees them only after 10 minutes, so repeated opens answer "Phone pairing is busy. Try again shortly." This pass opened five sessions, the last at 14:47, which expires at 14:57.

## Not covered

- Sizes and themes not run: capture at 1920 dark, simulation at 1440 light, 1920 light and 1280 dark. At 1920 dark only CIP and Ammonia were run.
- Sending a photo from the phone (it would have been a second real capture), a real camera, and a real image through the Upload button. The real pipeline was exercised through the sample path only.
- Voice with a working microphone, and the true no-device case ("No microphone found."), which headless Chrome cannot produce.
- The Fit preview.
- Screenshots saved but not inspected by eye: `flow-1440-dark-scrub-*.png`, `flow-1440-dark-voice-hold.png`, `phone-pairing-dark.png`, `wide-1920-light-text-long.png`, `wide-1920-light-pin-armed.png`.
