# Pyre Witness: live demo script

The 3-minute, 90-second and 30-second versions use the current controls. Run 5 figures are in the judge guide. The app timings marked `r1` come from the earlier rehearsal. [Judge guide](JUDGES.md) · [Rehearsal timings](../demo/rehearsal/timings-r1.json)

## Rehearsal record

- `r1` passed 22 of 22 steps on port 4119 at 1920 × 1080. A second browser sent a third-party iPhone photo through `Phone QR`, and the app ran one live capture. Two dry runs covered the lens, simulation, watch, transcript, service status and proof.
- `Proof` took 29.2 s to load on port 4119 in `r1`. The script uses a pre-opened tab and estimated tab-switch times.
- The current sequence, including the light 3D opening and the paired-phone dialer beat, still needs a full rehearsal. The measured records cover browser pairing and a 14.2 s Chief briefing WAV. Venue Wi-Fi, the physical handset, its carrier connection and the two shorter versions were unverified in rehearsal. [Call log](log/escalation-call.md)

## Before you walk on

1. Use **1920 × 1080** for the demo. On a narrow screen, the top bar's risk button (`Plant details`) opens the results rail.
2. **Tab 1.** Open the plant at `http://localhost:4120`. Open `Gemini` in the `AI crew` dock header to check the probes. Read the top bar's pulsing status dot tooltip to check Threat Watch. The dot opens the watch.
3. **Tab 2.** Preload `/proof` and check that it shows Run 5.
4. Start in light mode, with `3D` selected and the lens on `Material`. The top bar's `2D` / `3D` switch tooltip is `3D view · heights illustrative`. The app remembers earlier choices. Use `Switch to light mode` if the last session was dark.
5. Open `Phone QR` and check that the scan reaches the laptop on the same Wi-Fi and uses port 4120. Use `Samples` if the connection fails. Close the capture card before starting.
6. **Escalation.** Open the `Armed` bell chip, choose `Add your phone`, enter your own phone number with country code and click `Save phone`. In the bell menu click `Pair phone`. Have the collaborator scan the QR on the same Wi-Fi. Wait for `Phone paired` on the laptop and tap `Enable ringer` on the phone. Keep that page open. The link lasts 45 minutes. [On-call demo](CALL_DEMO.md)

## The 3-minute demo

The schedule gives 2:52 for the demo and 8 s of slack. App timings come from `r1` where measured. The current 3D and call beats use estimates.

| Time | Presenter clicks or says | The room sees | Criterion | App timing |
| --- | --- | --- | --- | --- |
| 0:00 to 0:10 | Say “Pyre Witness tells you where a device belongs in your plant and what risk it brings. Scan this.” Click `Pin location`, pick a spot beside the Filler 3 operator panel, then click `Phone QR`. | Light 3D plant. `Pin location` switches to 2D for the click and then returns to 3D. The QR opens on the capture card. | Live Demo 35 | pin 1.7 s, QR 2.8 s |
| 0:10 to 0:35 | Judge scans, photographs an object and taps `Send to laptop`. Say “This simulated bottling line has 92 assets. The crew is on idle patrol between runs.” | The photo appears in the capture card. | Live Demo 35, Creativity 20 | page load and send 11.0 s in browser rehearsal |
| (fallback for 0:10 to 0:35) | No judge device offered, or the phone cannot reach the laptop by 0:25: click `Samples`, pick `LTE router`. Say: "A credited photo, same real pipeline." | The sample starts analysis at the pin. Rehearsed result: Corporate office L4, never Filler 3, `−$290k est.` if moved, `25.3 s` (`docs/DEMO_KIT.md`). | Live Demo 35 | not rehearsed in this script |
| 0:35 to 1:02 | Click `Analyze` if using the judge's photo. `Samples` starts analysis when selected. Keep `3D` selected and use the crew cues below. | Scout's evidence, Inspector's checks, Architect's placement and Chief's briefing appear in the 3D drawing as events arrive. | Creativity 20, Gemini 4 + Decisions 20 | 25.8 s in `r1` (done at 24.4 s, first verdict at 13.7 s) |
| 1:02 to 1:14 | Point down the results rail: "Where it goes. Never here, and why. The risks. The attack paths." | `Where it goes` (room and Purdue level, "Rules engine cleared"), `Never here`, `Risks`, `Attack paths`, the Chief briefing card. | Live Demo 35 | 0 s, no click |
| 1:14 to 1:22 | Click `Show more` on the dollar figure. Say: "Every dollar is itemized: hours, rate, assets involved." | The loss figure expands into its line items (in `r1`: "−$31k est. if moved", 17 assets involved, "18 h x $5.3k/h x 15%"). | Proof 25, Creativity 20 | 1.3 s |
| 1:22 to 1:28 | Click `Move there`. Say: "Move it where the Architect said; the rules engine re-checks." | Device slides to the recommended room, "Rules check passed", button turns into "At recommended location", `Risk` changes (47 to 46 in `r1`). | Live Demo 35 | 0.9 s |
| 1:28 to 1:38 | Press `3`, then `2`, click `PLC-F3`. Say: "Same twin: pipes, network, both. This red path reaches a safety-critical PLC." | Lens morphs Material to Data to Both; PLC-F3 inspector: "Safety-critical asset is reachable", T0880, a dollar estimate, red attack path on the drawing. | Creativity 20, Live Demo 35 | 1.6 s, 1.8 s, 1.7 s |
| 1:38 to 1:43 | Hover the `2D` / `3D` switch. Drag once in 3D to rotate the view. | `3D view · heights illustrative`. The selection and the rules-engine arc stay in view. | Creativity 20 | estimate |
| 1:43 to 2:01 | In `Both`, click `CIP Crossover` in the `Simulate` rail. Click `1×` to switch to `4×`. On `Isolate CIP branch`, click `Approve`, then `Rerun simulation`. Click `Reset simulation` after showing the outcome. | The replay switches to 2D. In `r1` containment improved from `00:12` at `ZSC-311` to `00:06` with CIP branch isolation. | Live Demo 35, Creativity 20 | sim 5.6 s, approve 1.7 s, rerun 4.0 s |
| 2:01 to 2:11 | Click the small green pulsing status dot in the top bar. Say “Public advisories and recalls, matched to our assets, with a loss estimate and a human approval step.” | Threat Watch with CISA, NCSC and openFDA items. `Run now` refreshes the watch. | Gemini 4 + Decisions 20, Live Demo 35 | 2.0 s in `r1` with the earlier control |
| 2:11 to 2:36 | Open the bell chip and click `Run test alert`. Say “This labelled test adds a rogue LTE gateway to the twin. It uses no model call.” On `Incoming call`, the collaborator taps `Call [name] · [masked number]` and confirms if prompted. Answer the real call on your handset. | `TEST SCENARIO` on the laptop card. The paired phone opens its own dialer. The laptop shows `Calling on-call from the paired phone` when it receives the tap. | Live Demo 35, Creativity 20 | estimate |
| 2:36 to 2:46 | Switch to tab 2 (`/proof`). Say “Key-risk recall rose from 51.7 to 70 percent, a significant gain on one development set. We have no held-out result.” Switch back. | Run 5 vs the saved Hydrogen baseline, with the failure list. | Proof 25 | tab switches estimated |
| 2:46 to 2:52 | Click `Gemini` in the `AI crew` dock header. Say “Decisions gates, Hydrogen identifies, Carbon places, Neon briefs. T opens every run's transcript.” | The crew's model dots and the 10 service probes. | Gemini 4 + Decisions 20 | 1.4 s in `r1` with the earlier control |

Press `T` or click the transcript icon in the `AI crew` dock if asked. In `r1`, opening took 1.2 s and closing took 0.8 s. On the alert card, `Read call script` shows the prepared text. After the demo, use `Clear test` in the bell menu if the test gateway is still present.

If a judge's object produces a hold, or no `Move there` button, say so and go straight to the lens
row: the standing PLC-F3 path needs no capture.

### What to say while the models think (0:35 to 1:02)

Measured crew timeline from `demo/rehearsal/crew-r1.txt`:

| Seconds after `Analyze` | On screen | Say |
| --- | --- | --- |
| 0 to 2 | Capture card shows progress. | "A Decisions API gate checks this is worth a model's time." |
| 2 to 14 | Scout reads and displays evidence in the drawing. | “Scout is Gemini 4 Hydrogen. It looks for type, ports and evidence of radios or cloud connectivity.” |
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
| `Phone QR` | The phone cannot scan or reach the laptop. | After 20 s switch to `Samples` or use `Describe device` with the judge's words. |
| `3D` | The switch is hidden (no WebGL2) or 3D fails. | It falls back to 2D with a one-line notice. Say so and move on. |
| Escalation | The phone cannot reach the laptop, the browser call is quiet, or the handset shows an earlier alert. | `Read call script` on the laptop shows the alert text. If an earlier alert occupies the phone, clear its cause or use `Answer` → `Acknowledge`, then wait for `TEST SCENARIO`. An unpaired alert offers `Pair a phone to call you`. |
| `Camera` | Browser asks for camera permission, or denies it. | Click `Upload` or `Describe device`. |
| Gate | Decisions API slow or unavailable. | The gate falls back after 4 s and the capture continues; say so. If it rejects the photo (unreadable, not an object), say "that is the gate doing its job" and ask for another object. |
| Capture | A model times out or the run errors. | The card keeps the draft. Click `Retry` once. If only the Chief times out, show the checked result. If the capture fails twice, continue to the lens row. |
| Capture | Judge photographs a mug or another passive object. | It is admitted as a passive object and gets physical and food-safety answers with no cyber claims. Say "the plant is physical too" and continue. |
| Capture | Judge photographs a face or a person. | Not rehearsed. Whatever the gate returns, read it out; then ask for an object. |
| Answer | The rail shows a hold instead of a placement. | That is the rules engine refusing an unsafe spot. Say so, skip `Move there`, go to the lens row. |
| `Move there` | Risk does not change, or changes by one point. | Read the number as it is and point at the dollar line instead. |
| Simulation | The first `Approve` in the rail belongs to the capture, not the simulation. | Approve the card titled `Isolate CIP branch` (it shows "00:12 → 00:06"). If you approved the wrong one, the rerun still reads 00:12: say "that one was for the phone" and approve the right card. |
| Threat Watch status dot | The tooltip reports checking, partial results or offline feeds. | Read the displayed state and go to `/proof`. |
| Proof | Tab 2 was not pre-loaded. | Do not click `Proof` on port 4119 (29.2 s). Quote the two numbers and move on. |
| `T` | The drawer shows another run. | Select the capture from `Run`, or click a member in the `AI crew` dock for their steps. |
| `AI crew` → `Gemini` | A probe is pending or a service is degraded. | Open the board and name the service and its displayed state. |
| Voice (only if asked) | Microphone permission or no audio in the room. | Physical microphones were never tested. Say so and offer the transcript instead. |

## 90-second version

Not rehearsed. Uses `Describe device`, so there is no phone step.

| Time | Presenter | Room sees | App (from `r1`) |
| --- | --- | --- | --- |
| 0:00 to 0:10 | One sentence. "Name a device." Click `Describe device`, type what the judge says, click `Analyze`. | Capture card with the judge's words. | typing not measured |
| 0:10 to 0:37 | Crew cues from the table above. | Crew working; device lands; verdict. | 25.8 s |
| 0:37 to 0:49 | "Where, never here, risk, paths." Click `Show more`. | Answer rail; itemized dollars. | 1.3 s |
| 0:49 to 0:54 | Click `Move there`. | Device moves; risk and dollars update. | 0.9 s |
| 0:54 to 1:02 | Click the top bar's pulsing status dot. “Today's advisories, on our assets, in dollars.” | Threat Watch matches and approvals. | 2.0 s in `r1` |
| 1:02 to 1:12 | Tab 2. “Key-risk recall was 70 percent versus 51.7 percent for Hydrogen, a significant gain on one development set.” | Run 5 on `/proof`. | estimate |
| 1:12 to 1:22 | Back, press `T`. "Every prompt and raw response. Three Gemini 4 models, one job each, a Decisions gate, and a rules engine that is not a model." | Transcript drawer. | 1.2 s |

Leave out `Phone QR`, the lens changes, simulation, escalation and the `Gemini` services board.

## 30-second version

Not rehearsed. A capture takes about 25 s, so start it first and talk over it.

| Time | Presenter | Room sees |
| --- | --- | --- |
| 0:00 to 0:04 | Click `Analyze` on the device the judge just named (typed while being introduced). "Where does this belong in a plant, and what does it cost if you get it wrong?" | Crew starts moving. |
| 0:04 to 0:14 | "Decisions API gates it, Hydrogen sees it, Carbon places it, rules code audits it, Neon briefs." | Scout reading; device lands with the rules verdict at about 14 s. |
| 0:14 to 0:26 | “Key-risk recall rose from 51.7 to 70 percent versus one Hydrogen call, a significant gain on one development set.” | Architect and Chief finish and the answer rail fills. |
| 0:26 to 0:30 | Point at `Where it goes` and the dollar figure. "Every prompt is one key away: T." | The answer. |

If the capture has not finished at 0:30, stop talking and let the judges watch it land.

## Eleven likely judge questions

See the [judge guide](JUDGES.md) and the [Run 5 report](../eval/report/REPORT.md).

1. **Is anything mocked?** No. Every model, link fetch and CISA or NCSC feed call is live; press `T` for the raw responses.
2. **What is simulated?** The fictional plant, its 92-asset inventory and telemetry, and the 6 tabletop scenarios, each labelled in the UI.
3. **Where exactly is the Decisions API?** Four places: the capture admission gate, threat watch pair triage, the twin modeller gate, and the anonymized judge in the evaluation.
4. **Why three Gemini 4 models instead of one?** Hydrogen for fast vision, Carbon for placement reasoning and revision, Neon for short briefings; one narrow job each.
5. **What does the rules engine check?** Spatial, radio, washdown, hazard and food constraints. The server also validates ATT&CK IDs. Run 5 published 40 of 40 valid citations, versus 44 of 51 for Hydrogen. [Full report](../eval/report/REPORT.md)
6. **How do you know it works?** Both sides answered 68 of 71 captures in Run 5. Key-risk recall improved from 51.7% to 70.0%, a significant gain of 18.3 percentage points (95% paired bootstrap interval +9.3 to +26.9). Forbidden-area recommendations fell from 3 of 55 to 0 of 55, an inconclusive difference. The runs use one development set with no held-out set. [Full report](../eval/report/REPORT.md)
7. **What fails today?** Run 5 missed 36 of 120 labelled risks on shared answers. Hydrogen led on category accuracy (87.3% vs 80.0%, inconclusive). Pages that require JavaScript or block the fetcher can fail as product links. [Full report](../eval/report/REPORT.md)
8. **How fast is a capture?** Run 5 took 23.3 s median and 42.0 s p95, versus 13.3 s and 18.4 s for Hydrogen. The first rules verdict took 6.605 s p50 in the separate reliability batch. [Full report](../eval/report/REPORT.md) · [Reliability log](log/pipeline-speed.md)
9. **Are the dollar figures real?** A deterministic FAIR Monte Carlo, fixed seed, 10,000 draws, over assumed economics for a fictional plant, labelled as estimates. The seed plant reads $110k est. / yr after today's audit. The only published figure is the OSHA reference $165,514, which is not a model input.
10. **Does it really phone someone?** `Call [name] · [masked number]` in the paired phone's browser opens its dialer for a real call. This uses no carrier integration. `Answer` plays the optional Chief briefing using `gemini-3.8-flash-tts`. [On-call demo](CALL_DEMO.md)
11. **What happens when a service is down?** The gate falls back after 4 s. A Chief timeout leaves the checked result available. In `AI crew`, the model dots show crew health and `Gemini` in the header opens the services board.
