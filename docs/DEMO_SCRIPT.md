# Pyre Witness: live demo script

Three versions of the same demo (3 minutes, 90 seconds, 30 seconds), the measured rehearsal behind
them, the failure plan and eleven judge questions. Everything shown is the app's real behaviour.
Numbers quoted to judges come from `docs/JUDGES.md`; timings come from
`demo/rehearsal/timings-r1.json`.

## What was rehearsed, and what was not

- **One real end-to-end run** (`r1`, 1920 x 1080, dev server on port 4119, 13:47 to 13:50 on Nov 21):
  phone QR handoff from a second phone-sized browser, one real capture (a third-party photo of an
  iPhone, `eval/dataset/images/photo-009.jpg`), then every click below. 22 of 22 steps passed.
  It used 1 of the 3 allowed captures.
- **Two dry runs without a capture** (1280 x 720 and 1920 x 1080) for the lens, simulation, threat
  watch, transcript, chip and proof steps.
- **The order in the table below was not re-run with a capture.** Run `r1` clicked the `Proof` link
  on port 4119, which took 29.2 s; the table replaces that with a pre-opened proof tab and names
  the simulation card to approve. The table's budget is `r1`'s measured app times plus speech
  windows, added up; the two tab switches are estimated, not measured.
- **Not rehearsed at all:** a physical phone on venue Wi-Fi, a human scanning the QR, the laptop
  camera, the microphone, the stable build on port 4120 in a browser, the 90-second and 30-second
  versions.
- **New beats, not rehearsed in this order:** the `Samples` tray fallback, the `2D` / `3D` switch
  and the escalation call. Their own logs measured them separately: Samples rows `18.6` to `31.8 s`
  to checked placement (`docs/DEMO_KIT.md`), the call in a two-page Playwright test and a `14.2 s`
  Chief briefing WAV (`docs/log/escalation-call.md`). Physical handset audio and vibration are
  unverified.

## Before you walk on (do all of this, it is not optional)

1. Screen at **1920 x 1080**. At 1280 x 720 the results rail is closed until you click `Risk 46`
   and the approve buttons are unreachable (dry run step 06 failed for that reason).
2. **Tab 1:** the plant. Load it at least a minute before: the first load took 50.7 s in `r1` on
   port 4119. Wait until the chip reads `Gemini 10/10` and `Watch` no longer says "Checking" (the watch
   starts by itself on load; in `r1` it had 3 approvals waiting by the time that step came, about
   two minutes after load).
3. **Tab 2:** `/proof`, already loaded and scrolled to the top.
4. Present from the stable build on port 4120 (`http://localhost:4120`, answered in 0.17 s during
   rehearsal while 4119 returned one HTTP 500 and one 20 s timeout). Check on 4120 that `Phone QR`
   and `Pair phone` show links with port 4120 before you rely on them; that was not rehearsed.
5. Lens on `Material`, nothing selected, capture card closed, no capture in the session (reload
   resets the session).
6. Phone and laptop on the same network. Open `Phone QR` once with your own phone and send a test
   photo. If the phone cannot reach the laptop, plan to open with `Samples` instead.
7. **Call phone (collaborator).** Follow `docs/CALL_DEMO.md` "Before the demo": bell chip,
   `Pair phone`, scan, wait for `Phone paired`, tap `Enable ringer`, raise media volume, save the
   `On-call contact`. Leave the phone page in the foreground. The pairing link lasts 45 minutes, so
   pair after 14:15.
8. `2D` selected in the `2D` / `3D` switch; escalation bell reads `Armed`.

## The 3-minute demo

Budget: 2:52 of the 3:00, 8 s of slack. "App" is the measured time the app took to answer that
click in `r1`. Rows marked **not rehearsed** are new and their times are estimates.

| Time | Presenter clicks or says | The room sees | Criterion | App (measured) |
| --- | --- | --- | --- | --- |
| 0:00 to 0:10 | Say: "Pyre Witness tells you where a device belongs in your plant, and what it costs you, before you plug it in. Hand me anything; scan this." Click `Pin location`, click the floor beside the Filler 3 operator panel, click `Phone QR`. | The plant drawing, a pin in Filler 3, a QR code. | Live Demo 35 | pin 1.7 s, QR 2.8 s |
| 0:10 to 0:35 | Judge scans, photographs any object, taps `Send to laptop`. Say: "This is a simulated bottling line, 92 assets. The crew on the floor is on idle patrol; it only moves when a real pipeline step starts." | Phone page on the judge's phone; the photo appears in the capture card. | Live Demo 35, Creativity 20 | page load and send 11.0 s by machine; a human was not timed |
| (fallback for 0:10 to 0:35) | No judge device offered, or the phone cannot reach the laptop by 0:25: click `Samples`, pick `LTE router`. Say: "A credited photo, same real pipeline." | The sample starts analysis at the pin. Rehearsed result: Corporate office L4, never Filler 3, `−$290k est.` if moved, `25.3 s` (`docs/DEMO_KIT.md`). | Live Demo 35 | not rehearsed in this script |
| 0:35 to 1:02 | Click `Analyze`. Talk through the wait (cues below). | Scout walks and reads the label; at about 14 s the device lands on the pin with the rules verdict; Architect walks to the recommended room; Chief briefs. | Creativity 20, Gemini 4 + Decisions 20 | 25.8 s (done at 24.4 s; device and first verdict on the floor at 13.7 s) |
| 1:02 to 1:14 | Point down the results rail: "Where it goes. Never here, and why. The risks. The attack paths." | `Where it goes` (room and Purdue level, "Rules engine cleared"), `Never here`, `Risks`, `Attack paths`, the Chief briefing card. | Live Demo 35 | 0 s, no click |
| 1:14 to 1:22 | Click `Show more` on the dollar figure. Say: "Every dollar is itemized: hours, rate, assets involved." | The loss figure expands into its line items (in `r1`: "−$31k est. if moved", 17 assets involved, "18 h x $5.3k/h x 15%"). | Proof 25, Creativity 20 | 1.3 s |
| 1:22 to 1:28 | Click `Move there`. Say: "Move it where the Architect said; the rules engine re-checks." | Device slides to the recommended room, "Rules check passed", button turns into "At recommended location", `Risk` changes (47 to 46 in `r1`). | Live Demo 35 | 0.9 s |
| 1:28 to 1:38 | Press `3`, then `2`, click `PLC-F3`. Say: "Same twin: pipes, network, both. This red path reaches a safety-critical PLC." | Lens morphs Material to Data to Both; PLC-F3 inspector: "Safety-critical asset is reachable", T0880, a dollar estimate, red attack path on the drawing. | Creativity 20, Live Demo 35 | 1.6 s, 1.8 s, 1.7 s |
| 1:38 to 1:43 | Click `3D` in the `2D` / `3D` switch, drag once, click `2D`. Say: "Same live twin in 3D, hand-written WebGL, no 3D library." | The plant in 3D with the selection and red arc kept; back to 2D. | Creativity 20 | **not rehearsed** |
| 1:43 to 2:01 | Click `CIP Crossover`, then the speed button to 4x. In the rail find **`Isolate CIP branch`**, click its `Approve`, click `Rerun simulation`. Say: "A tabletop on real pipes; I approve one safeguard and it contains faster." | Fault travels the pipes, "Contained in 00:12 · ZSC-311 hardwired permissive"; after approval the rerun reads "Contained in 00:06 · CIP branch isolation". | Live Demo 35, Creativity 20 | sim 5.6 s, approve 1.7 s, rerun 4.0 s |
| 2:01 to 2:11 | Click `Watch`. Say: "Today's public advisories and beverage recalls, matched to our assets, in dollars, waiting for a human." | Threat watch: CISA, NCSC and openFDA items matched to named assets with a dollar estimate each; unrelated items collapsed; `Approve` buttons (3 waiting in `r1`). | Gemini 4 + Decisions 20, Live Demo 35 | 2.0 s (`r1`, before the recall feed) |
| 2:11 to 2:36 | If no alert card is up: bell chip, `Loss threshold (USD)` `90000`, save. On the alert, click `Call on-call`. Say: "Above a loss or risk threshold, it calls the engineer on call." Collaborator taps `Answer`, lets the Chief speak, taps `Acknowledge` (or `Approve action`). | Phone rings; laptop shows `Answered`; the Chief reads the finding, the estimate (`PLC-F3`, about `$94k est.`) and the action; the receipt appears. | Live Demo 35, Creativity 20 | **not rehearsed**; briefing WAV `14.2 s` |
| 2:36 to 2:46 | Switch to tab 2 (`/proof`). Say: "71 paired items against one Gemini call, a strong baseline. Zero forbidden-area recommendations against three, and more of the key risks found. Not significant on 71 items, and one development set." Scroll once. Switch back. | Run 4, system vs single-call baseline, the failure list. | Proof 25 | scroll 1.0 s; tab switches not measured |
| 2:46 to 2:52 | Click the `Gemini 10/10` chip. Say: "Decisions gates, Hydrogen sees, Carbon places, Neon briefs and speaks. The rules engine, 3D, simulation and dollars are plain code. Press T for every prompt." | The ten live services with their latest probe. | Gemini 4 + Decisions 20 | 1.4 s |

Cut to fit the new beats: the `T` transcript row (open 1.2 s, close 0.8 s in `r1`). Show it only if
asked. If the call beat fails, use the fallbacks in `docs/CALL_DEMO.md` (`Read call script`).

If a judge's object produces a hold, or no `Move there` button, say so and go straight to the lens
row: the standing PLC-F3 path needs no capture.

### What to say while the models think (0:35 to 1:02)

Measured crew timeline from `demo/rehearsal/crew-r1.txt`:

| Seconds after `Analyze` | On screen | Say |
| --- | --- | --- |
| 0 to 2 | Capture card shows progress. | "A Decisions API gate checks this is worth a model's time." |
| 2 to 14 | Scout: "Reading the label…" | "Scout is Gemini 4 Hydrogen: it only sees. Type, radios, ports, and what it could not determine." |
| 14 | Device lands on the pin; Inspector: "As dropped · 2 findings" (113 ms). | "That verdict is the Inspector: deterministic rules, not a model." |
| 14 to 20 | Architect: "Checking where this fits…" | "Architect is Carbon: it reasons over the whole twin and the Inspector audits its answer." |
| 20 to 25 | Chief walks, briefing card opens (5.3 s). | "Chief is Neon: three lines a shift lead can act on." |

### What a phone gave in rehearsal (so you are not surprised)

Identified as "Smartphone, Apple"; recommended Corporate office, Purdue L4; never Filler 3; 2 risks;
**0 attack paths**; plant risk 46 to 47 as dropped and back to 46 after `Move there`. The risk
swing is one point and there is no new attack path, so carry those two beats with the dollar
figure ("−$31k est. if moved") and the PLC-F3 path in the lens row. Do not promise a big swing
before you see it.

## Failure plan

| Step | What can go wrong | Recovery (real behaviour only) |
| --- | --- | --- |
| Loading | Port 4119 slow or returning an error while agents edit (seen: 50.7 s load, one HTTP 500, `/proof` 29.2 s). | Present from port 4120. Never reload on stage. |
| `Phone QR` | Venue Wi-Fi blocks phone to laptop, or the judge's phone will not scan. | After 20 s say "the room's Wi-Fi isolates phones" and click `Samples` (or `Describe device` and type what the judge names). Same pipeline. |
| `3D` | The switch is hidden (no WebGL2) or 3D fails. | It falls back to 2D with a one-line notice. Say so and move on. |
| Call | No shared Wi-Fi, no audio, or no alert card. | `docs/CALL_DEMO.md` fallbacks: `Read call script`; read the script and tap `Acknowledge`; or lower `Loss threshold (USD)` to `90000` for the `PLC-F3` alert. |
| `Camera` | Browser asks for camera permission, or denies it. | Click `Upload` or `Describe device`. |
| Gate | Decisions API slow or unavailable. | The gate falls back after 4 s and the capture continues; say so. If it rejects the photo (unreadable, not an object), say "that is the gate doing its job" and ask for another object. |
| Capture | A model times out or the run errors. | The card shows the error with retry; the draft is kept. Click retry once. If the Chief alone times out, the checked result is still usable: carry on. If it fails twice, say so, skip to the lens row and continue from the standing plant. |
| Capture | Judge photographs a mug or another passive object. | It is admitted as a passive object and gets physical and food-safety answers with no cyber claims. Say "the plant is physical too" and continue. |
| Capture | Judge photographs a face or a person. | Not rehearsed. Whatever the gate returns, read it out; then ask for an object. |
| Answer | The rail shows a hold instead of a placement. | That is the rules engine refusing an unsafe spot. Say so, skip `Move there`, go to the lens row. |
| `Move there` | Risk does not change, or changes by one point. | Read the number as it is and point at the dollar line instead. |
| Simulation | The first `Approve` in the rail belongs to the capture, not the simulation. | Approve the card titled `Isolate CIP branch` (it shows "00:12 → 00:06"). If you approved the wrong one, the rerun still reads 00:12: say "that one was for the phone" and approve the right card. |
| `Watch` | Feeds unreachable or the watch still says "Checking". | Say "it is reading CISA right now" and go to proof; come back if it completes. |
| Proof | Tab 2 was not pre-loaded. | Do not click `Proof` on port 4119 (29.2 s). Quote the two numbers and move on. |
| `T` | Drawer opens on the simulation run. | Change `RUN` to the capture, or click a crew card in the AI crew dock. Neither was rehearsed: `r1` only opened and closed the drawer, and it showed the simulation's rules-engine steps. Try it by hand once before going on. |
| Chip | It reads fewer than 10 of 10, in red. | It was seen at 0, 2 and 3 of 10 shortly after loading and at 10 of 10 two minutes later. Click it and read the list aloud; do not claim 10 of 10 unless it says so. |
| Voice (only if asked) | Microphone permission or no audio in the room. | Physical microphones were never tested. Say so and offer the transcript instead. |

## 90-second version

Not rehearsed. Uses `Describe device`, so there is no phone step.

| Time | Presenter | Room sees | App (from `r1`) |
| --- | --- | --- | --- |
| 0:00 to 0:10 | One sentence. "Name a device." Click `Describe device`, type what the judge says, click `Analyze`. | Capture card with the judge's words. | typing not measured |
| 0:10 to 0:37 | Crew cues from the table above. | Crew working; device lands; verdict. | 25.8 s |
| 0:37 to 0:49 | "Where, never here, risk, paths." Click `Show more`. | Answer rail; itemized dollars. | 1.3 s |
| 0:49 to 0:54 | Click `Move there`. | Device moves; risk and dollars update. | 0.9 s |
| 0:54 to 1:02 | Click `Watch`. "Today's advisories, on our assets, in dollars." | Threat watch matches and approvals. | 2.0 s |
| 1:02 to 1:12 | Tab 2. "71 paired items against one Gemini call: zero forbidden-area recommendations against three. Not significant, one development set." | Proof page. | not measured |
| 1:12 to 1:22 | Back, press `T`. "Every prompt and raw response. Three Gemini 4 models, one job each, a Decisions gate, and a rules engine that is not a model." | Transcript drawer. | 1.2 s |

Cut from the 3-minute version: phone QR, lens, simulation, chip.

## 30-second version

Not rehearsed. A capture takes about 25 s, so start it first and talk over it.

| Time | Presenter | Room sees |
| --- | --- | --- |
| 0:00 to 0:04 | Click `Analyze` on the device the judge just named (typed while being introduced). "Where does this belong in a plant, and what does it cost if you get it wrong?" | Crew starts moving. |
| 0:04 to 0:14 | "Decisions API gates it, Hydrogen sees it, Carbon places it, rules code audits it, Neon briefs." | Scout reading; device lands with the rules verdict at about 14 s. |
| 0:14 to 0:26 | "On 71 paired items it never recommended a forbidden area; one single call did three times. One development set, not yet significant." | Architect and Chief finish; answer rail fills. |
| 0:26 to 0:30 | Point at `Where it goes` and the dollar figure. "Every prompt is one key away: T." | The answer. |

If the capture has not finished at 0:30, stop talking and let the judges watch it land.

## Eleven likely judge questions

All figures are from `docs/JUDGES.md`.

1. **Is anything mocked?** No. Every model, link fetch and CISA or NCSC feed call is live; press `T` for the raw responses.
2. **What is simulated?** The fictional plant, its 92-asset inventory and telemetry, and the 6 tabletop scenarios, each labelled in the UI.
3. **Where exactly is the Decisions API?** Four places: the capture admission gate, threat watch pair triage, the twin modeller gate, and the anonymized judge in the evaluation.
4. **Why three Gemini 4 models instead of one?** Hydrogen for fast vision, Carbon for placement reasoning and revision, Neon for short briefings; one narrow job each.
5. **What does the rules engine catch that the model missed?** Spatial, radio, washdown and hazard blockers from 17 rules, and invalid ATT&CK IDs: 0.0% invalid (n=28) against 14.0% for the baseline (n=50), Run 4.
6. **How do you know it works?** A paired 71-item benchmark against one Gemini 4 Hydrogen call (Run 4, shared answers): 0 of 54 forbidden-area recommendations against 3 of 54; key-risk recall 58.5% against 51.7%; equipment kind 98.3% against 94.8%; area 89.5% against 87.7%; Purdue level 94.4% against 96.3%. None is statistically significant, and it is one development set with no held-out set. `/proof` shows it.
7. **What fails today?** Radio recall 33.3% and cloud flags 23.1%, where the single call leads; product links behind a WAF or rendered client-side can fail to fetch.
8. **How fast is a capture?** First rules verdict in about 6.6 to 6.8 s p50, full capture 24.6 s median in Run 4 (single call 13.3 s); our rehearsal run took 24.4 s.
9. **Are the dollar figures real?** A deterministic FAIR Monte Carlo, fixed seed, 10,000 draws, over assumed economics for a fictional plant, labelled as estimates. The seed plant reads $110k est. / yr after today's audit. The only published figure is the OSHA reference $165,514, which is not a model input.
10. **Does it really phone someone?** It rings a paired phone's browser over the LAN, with the Chief's briefing from `gemini-3.8-flash-tts`. A real cellular call can be placed from that phone's own dialer. No carrier integration.
11. **What happens when a service is down?** The gate falls back after 4 s, a Chief timeout leaves the checked result usable, and the chip reports degraded services live.
