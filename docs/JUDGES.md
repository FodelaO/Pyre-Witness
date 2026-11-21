# Pyre Witness: judge's 2-minute guide

**Snap any device. See where it belongs in your plant, and what risk it brings, before you plug it in.**
Built Nov 21, 2026. The fictional plant, *North Beverage Facility, Line 3*, has `92` assets, `13` areas and `6` entry points. The demo build is at `http://localhost:4120` (dev port `4119`). [Plant design](log/plant-design.md)

Light mode is the default. The app opens in 3D on browsers with WebGL2. The `2D` / `3D` switch and theme control are in the top bar.

## 1. Live demo (35%)

| Click | You see | Source |
| --- | --- | --- |
| Capture rail `Pin location` → pick a spot → `Camera`, `Upload`, `Samples`, `Product link`, `Describe device` or `Phone QR` | Pinning uses the 2D floor and returns to 3D. The gate, Scout, rules engine, Architect and Chief run live. In the reliability batch, the first rules verdict took `6.605 s` p50 and the full result `28.905 s` p50 | `docs/log/pipeline-speed.md`, `src/shell/AppShell.tsx` |
| `Samples`: six credited photos (IP camera, LTE router, USB drive, access point, phone, mug) | The real pipeline on a known photo. Hover a thumbnail for its credit | `docs/DEMO_KIT.md`, `public/demo/credits.json` |
| `Move there` in the placement answer, or drag the device in `2D` | `POST /api/reassess` rechecks. A Wi-Fi camera at Filler 3 showed `Here $280k · There $2.7k` per event, then `Moved · est. loss now $2.7k` | `docs/log/loss-panel-demo.md` |
| Lens slider `Material / Both / Data` (keys `1` `2` `3`) | Same twin as pipes, both, or network. Hover `FIL-3` in Both: `15` assets light up | `docs/log/lens-integration.md` |
| Hover the top bar's `2D` / `3D` switch | `3D view · heights illustrative`. Both views keep the same selection and draw paths from the rules engine | `src/view3d/View3DToggle.tsx`, `docs/log/view3d.md` |
| Bell chip (`Armed` or `Escalation`) → `Add your phone` → `Save phone` → `Pair phone`. Scan the QR and tap `Enable ringer` on the phone. Reopen the bell chip → `Run test alert` | A `TEST SCENARIO` rogue LTE gateway triggers the alert without a model call. On the paired phone, tap `Call [name] · [masked number]` to use its dialer. The laptop records the tap. No carrier integration for this flow | `docs/CALL_DEMO.md`, `src/escalation/EscalationCall.tsx` |
| `Both` lens → `Simulate` rail → `CIP Crossover` → click `1×` to switch to `4×` | The replay switches to 2D and stops at `ZSC-311` at `00:12`. In rehearsal, `Isolate CIP branch` → `Approve` → `Rerun simulation` cut that to `00:06` | `docs/DEMO_SCRIPT.md`, `src/view3d/View3DStage.tsx` |
| Small green pulsing status dot in the top bar → `Run now` | Opens Threat Watch. In the logged check, `7` items matched plant assets and `39` were collapsed. Use `Approve` or `Reject` on proposals | `docs/log/watch-relevance.md`, `src/shell/TopBar.tsx` |
| `Hold to talk to the Chief` (or Space) | Live voice. Tool call `select_asset` selected `P-101` `2,009 ms` after release | `src/voice/TalkToChief.tsx`, `docs/log/voice.md` |
| `Model the twin` (results panel): drop a CSV, photos, video or PDF | Ghost assets to review, then apply. CSV `17.704 s`, 35 s MP4 via Files API `23.981 s` | `docs/log/modeler.md` |

## 2. Proof (25%)

**Run 5** uses the same saved fair baseline as Run 4, one Gemini 4 Hydrogen call with a prose plant description. Both answered 68 of 71 captures. Scores use shared answers. End-to-end timings use all 71 attempts. Significance uses the 5% level. [Summary](../eval/report/SUMMARY.md) · [Full report](../eval/report/REPORT.md)

| Metric | Single-call Hydrogen | Pyre Witness | Paired result |
| --- | ---: | ---: | --- |
| Plant area accuracy | 86.4% (51/59) | 91.5% (54/59) | Inconclusive (`p=0.549`) |
| Equipment kind accuracy | 95.0% (57/60) | 98.3% (59/60) | Inconclusive (`p=0.625`) |
| Purdue level accuracy | 94.5% (52/55) | 94.5% (52/55) | Tie |
| Device vs non-device accuracy | 100.0% (68/68) | 100.0% (68/68) | Tie |
| Key-risk recall | 51.7% (62/120) | 70.0% (84/120) | Significant gain of 18.3 pp (95% paired bootstrap interval +9.3 to +26.9 pp, 56 pairs) |
| Forbidden-area recommendations | 5.5% (3/55) | 0.0% (0/55) | Inconclusive (`p=0.250`) |
| Radio recall | 100.0% (12/12) | 100.0% (12/12) | Tie |
| Cloud flag accuracy | 88.5% (23/26) | 88.5% (23/26) | Tie |
| Device category accuracy | 87.3% (48/55) | 80.0% (44/55) | Hydrogen leads, inconclusive |
| Device-type naming match | 67.3% (37/55) | 78.2% (43/55) | Inconclusive |
| Median time per capture | 13.3 s | 23.3 s | Significantly slower |
| p95 time per capture | 18.4 s | 42.0 s | Significantly slower |

- Run 3 trailed Hydrogen on equipment kind and key-risk recall. Run 4 fixed those gaps with kind guidance and a risk list that combines model risks, rules findings and Scout evidence.
- Run 4 trailed on radio recall (33.3%) and cloud flags (23.1%). Asking Scout for explicit connectivity evidence brought Run 5 up to Hydrogen's rates on both.
- **Held-out test.** `20` new captures, labelled before their single run and never tuned on. Key-risk recall rose from `40.8%` to `61.2%`, a significant `+20.4 pp` (`+8.3` to `+34.0`). Device-type naming rose from `57.1%` to `92.9%`, also significant. The rules check passed `20/20` vs `15/18` (inconclusive), and neither side made a forbidden placement. Hydrogen led on area (`88.9%` vs `83.3%`) and Purdue level (`85.7%` vs `78.6%`), both inconclusive. [Held-out report](../eval/heldout/REPORT.md) · [Held-out log](log/heldout-eval.md)
- `Proof` in the top bar opens `/proof` for run history, comparisons and failure images.
- `AI crew` dock → `Gemini` in the header opens the `10` service probes. Each model-backed crew member has a dot for its model. The Inspector's dot shows local rules-engine status. [Crew dock](../src/crew/CrewDock.tsx)
- Press `T` or use the transcript icon in the `AI crew` dock to see prompts, raw responses, tokens and timing. Export JSON or Markdown. [Transcript](../src/transcript/)

Reliability batch: `61/63` completed at `6` workers, `2` correct rejections, `0` operational failures (`docs/log/pipeline-speed.md`).

## 3. Creativity (20%)

| Click | You see | Source |
| --- | --- | --- |
| Leave `3D` active during `Analyze` | The crew draws its work on the plant from pipeline events. Scout shows evidence, the Inspector marks checks, the Architect shows placement, and the Chief posts the briefing. `idle patrol` appears between runs | `src/view3d/crewWork.ts`, `src/view3d/Overlay.tsx` |
| `/gallery` | `29` hand-drawn parametric SVG equipment kinds | `src/equipment/kinds/` |
| `2D` / `3D` | 3D drawn by a hand-written WebGL2 renderer. No 3D library, no new dependency | `docs/log/view3d.md` |
| On the paired phone, tap `Answer` on an incoming app alert | The optional Chief briefing is spoken using Gemini TTS. `Approve action` applies the offered change to the twin and `Acknowledge` records receipt | `docs/CALL_DEMO.md` |
| Select `PLC-F3`, open its loss figure, `Show more` | Asset drawing, one number (`$94k est.` per event), then the itemized calculation | `src/econ/README.md` |
| Under the risk dial | `$110k est. / yr` for the seed plant (`43` detections, each asset and consequence counted once) | `src/econ/README.md`, `docs/log/loss-model.md` (Audit) |
| Top bar's pulsing status dot → beverage recalls | openFDA recalls priced per comparable event for this plant. Voila juice on `FIL-3` was `$3M est.`. 7up and Wawa on `LBL-3` were `$2.8M est.` each | `docs/log/watch-relevance.md` |
| `Describe device`: "coffee mug" | Passive object: `FOOD-02` / `FOOD-03` food-safety findings, no cyber claims (`0/8` non-devices) | `eval/report/REPORT.md` |
| `Fit preview` tiles after a capture | AI-generated image of the device at the recommended and dropped spots, `1200 × 896`, `9.70–24.36 s` | `docs/log/fit-preview.md` |
| Top bar's `Switch to dark mode` | Dark theme. `Switch to light mode` returns to the default palette | `src/theme/ThemeToggle.tsx` |

## 4. Gemini 4 and Decisions API (20%)

| Where | What | Source |
| --- | --- | --- |
| Capture gate | `gemini-decision-1`, `6` questions, `1.125 s` p50. Unusable captures stop here | `src/gemini/capture.ts`, `docs/log/pipeline-speed.md` |
| Threat Watch triage | `3` questions per advisory and asset pair | `src/watch/triage.ts` |
| Twin modeller gate | `3` questions. Rejected a shopping list in `0.399 s` | `src/modeler/gemini.ts`, `docs/log/modeler.md` |
| Eval judge | Device-type match on anonymized answers | `eval/judge.ts` |
| Rules engine vs Architect | On a blocked or invalid recommendation the server can ask Carbon for one revision via `previous_interaction_id`. Run 5 revised `6/69` checked initial recommendations (`8.7%`, all attempts) | `eval/report/REPORT.md` |
| Watch Chief summary | `gemini-4-neon` over the Decisions answers, `17.9 s` | `docs/log/watch-relevance.md` |
| Escalation call | The Chief's spoken briefing: `gemini-3.8-flash-tts`, a `14.2 s` WAV in rehearsal | `docs/log/escalation-call.md` |
| Deterministic, no model | Rules engine, 3D view, loss model, simulation, recall pricing, call thresholds | `docs/log/view3d.md`, `src/econ/README.md` |

## Which model does what (`src/gemini/models.ts`)

| Job | Engine | Measured |
| --- | --- | --- |
| Gate, triage, modeller gate, eval judge | `gemini-decision-1` (Decisions API, `v1beta`) | gate `1.125 s` p50 |
| Scout: perception | `gemini-4-hydrogen`, thinking `low` | `8.969 s` p50 |
| Architect: placement, risk, revision; passive objects | `gemini-4-carbon`, thinking `low` | `12.542 s` p50 |
| Chief: briefing, Watch reassessment | `gemini-4-neon`, thinking `low` | `4.117 s` p50 (`10/10` briefings) |
| Voice | `gemini-3.8-live`, `gemini-3.8-flash-tts` | `setupComplete` `931 ms`; first audio `549–778 ms` |
| Fit preview | `gemini-nano-banana-2.1` | `9.70–24.36 s` |
| Watch comparison | `antigravity-preview-09-2026` (managed agent) | `72.05 s` |
| Twin modeller | Files API + Decisions + Hydrogen + Neon | see `docs/log/modeler.md` |
| **Inspector** | **Rules engine, deterministic TypeScript. Not a model.** `16` rules + `PLACE-01`; 6-step attack-path search | `0.175 ms` warmed median |

Latencies: `docs/log/pipeline-speed.md` (6-worker batch), `docs/log/voice.md`, `docs/log/fit-preview.md`, `docs/log/threat-watch.md`, `docs/log/rules-engine.md`.

## Rules check

- **New work.** The 13:37 EST run logged `498` Vitest tests passed and `3` skipped. [Build log](BUILD_LOG.md)
- **Security:** single-user demo, no login. What is defended and what is not: `docs/SECURITY.md`.
- **Nothing mocked:** every Gemini, Decisions, Live, TTS, image, Files, Antigravity and feed call is live. The plant is labelled `Simulated plant` in the top bar.
- **Gemini 4 use.** Hydrogen identifies, Carbon assesses placement, Neon briefs and `gemini-decision-1` gates captures.

## Bonus tracks

- **Managed Agents.** Top bar's pulsing status dot → `Antigravity comparison` → `Run Google-hosted watch`. Antigravity took `72.05 s` and the local Decisions + Neon run took `16.60 s`. The hosted run was `partial` because its sandbox could not fetch CISA ICS. [Watch log](log/threat-watch.md)
- **Shopify:** not integrated.

## Questions you might ask

- **What is simulated?** The plant, its inventory and telemetry, the `6` what-if scenarios, the cost inputs and the labelled rogue LTE test alert.
- **Does it beat one Gemini call?** On shared answers, Run 5 significantly improved key-risk recall from `51.7%` to `70.0%`. The drop from `3/55` to `0/55` forbidden-area recommendations was inconclusive, as were the area, kind and naming differences. Purdue level, device vs non-device, radio recall and cloud flags tied. Hydrogen's category lead was inconclusive. It was significantly faster. On the `20`-capture held-out set, the key-risk recall gain held (`40.8%` to `61.2%`, significant) and naming rose from `57.1%` to `92.9%` (significant). Area and Purdue level trailed Hydrogen, inconclusively. [Full report](../eval/report/REPORT.md) · [Held-out report](../eval/heldout/REPORT.md)
- **What does the rules engine add?** Spatial, radio, washdown, hazard and food checks. The offline check passed `100.0%` of 66 Pyre Witness recommendations and `85.0%` of 60 baseline recommendations in the shared-answer cohort. [Full report](../eval/report/REPORT.md)
- **How fast?** Run 5 took `23.3 s` median and `42.0 s` p95, versus `13.3 s` and `18.4 s` for Hydrogen. The first rules verdict took `6.605 s` p50 in the separate reliability batch. [Full report](../eval/report/REPORT.md) · [Reliability log](log/pipeline-speed.md)
- **Is the call a real phone call?** Tap `Call [name] · [masked number]` on the paired phone to use its own dialer for a real call. Confirm if the phone asks. The app records the tap and uses no carrier integration for this flow. [On-call demo](CALL_DEMO.md)
- **When a service is down?** The capture continues with a labelled fallback if the gate exceeds its `4 s` wait (`3` of `63` in the reliability batch, all completed). `AI crew` dock → `Gemini` shows the degraded service. [Reliability log](log/pipeline-speed.md)
- **Are the dollar numbers real?** Deterministic FAIR Monte Carlo, fixed seed, `10,000` draws, on assumed plant economics (simulated plant). Audited today: PERT replaced triangular, the plant figure fell from `$280k` to `$110k est. / yr`. The only published figure is the OSHA reference `$165,514`, shown for context, not a model input (`src/econ/README.md`).
- **Real plant?** Replace `src/twin/seed.ts` or use `Model the twin`; calibrate costs and RF data.

## Honest limits

- One development set informed all runs. The held-out set has only `20` captures, one labeller and one reviewer. A pre-run label review decided its drone item. Under the original labels Hydrogen passes `14/20` cases and Pyre Witness `12/20`, instead of `13/20` each. Placement accuracy did not beat the single call there. [Held-out log](log/heldout-eval.md)
- Run 5 missed `36` of `120` labelled risks on shared answers. Radio recall (`12/12`) and cloud flags (`23/26`) matched Hydrogen on their labelled subsets. [Full report](../eval/report/REPORT.md)
- Hydrogen's observed category lead (`87.3%` vs `80.0%`) is inconclusive, as are the area, kind, forbidden-placement and naming differences. Only the key-risk recall gain and the slower median and p95 times were significant among the metrics in the table. [Full report](../eval/report/REPORT.md)
- Loss priors are not calibrated: read them as order of magnitude and ranking.
- Call: phone audio, vibration and a carrier connection unverified on a physical handset (`docs/log/escalation-call.md`).
- Watch relevance: interactive browser check pending (`docs/log/watch-relevance.md`).
- Product links: no JavaScript rendering, WAF pages can fail (`docs/log/link-fetch.md`).
- Physical mic, speaker, Safari and phone hardware untested; tested in headless Chromium (`docs/log/voice.md`).
- Risk score `0–100` and loss figures are decision-support heuristics, not certifications.
