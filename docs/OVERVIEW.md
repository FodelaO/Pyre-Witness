# Pyre Witness: overview

See the [README](../README.md), [architecture](ARCHITECTURE.md), [build log](BUILD_LOG.md) and [judge guide](JUDGES.md).

**Snap any device. See where it belongs in your plant, and what risk it brings, before you plug it in.**

An engineer gives 1 to 3 photos, a product link, or a description. Gemini 4 identifies the item and reasons over a digital twin of the plant. The app answers:

1. Where should it go? Plant area and Purdue level.
2. Where must it never go?
3. What risk does it bring? Physical, cyber, compliance; MITRE ATT&CK for ICS.
4. Which new attack paths does it open?

The twin updates live: the device appears on the floor and the Purdue map, new paths are drawn, the risk score changes.

> **Demo plant:** *North Beverage Facility, Line 3*, a fictional 36,000 bottle/h cola line. `92` assets, `13` areas, `6` entry points, `75` connections. Seed risk score `46.09` (elevated). Source: `docs/log/plant-design.md`.

## What is on the screen

| Part | What it does | Code |
| --- | --- | --- |
| Plant floor | Light theme by default. The floor opens in 3D with WebGL2. `2D` / `3D` switches views. Both show equipment, pipes and paths | `src/floor`, `src/equipment`, `src/view3d` |
| Lens | `Material` / `Both` / `Data` (keys `1` `2` `3`). `Levels` in Data shows Purdue levels | `src/layers` |
| Purdue map | L0 to L5 and the L3.5 DMZ, conduits, linked selection | `src/purdue` |
| Capture rail | `Camera`, `Upload`, `Product link`, `Describe device`, `Pin location`, `Phone QR` | `src/capture`, `src/handoff` |
| `AI crew` dock | Model status dots on crew cards. `Gemini` in the dock header opens the services board. Select a crew member for their transcript | `src/crew`, `src/health` |
| Results panel | Risk dial, plant loss exposure, placement answer, `Move there`, risks, paths, mitigations, `Model the twin`, `Fit preview` | `src/panel`, `src/econ`, `src/modeler`, `src/fit` |
| Simulate | `6` tabletop scenarios, `1×` / `4×`, approval of safeguards | `src/sim` |
| Top bar | Small green pulsing status dot opens Threat Watch. Also has `Proof`, view and theme controls, and the risk score | `src/shell/TopBar.tsx` |
| Voice | `Hold to talk` (or Space); briefing read aloud | `src/voice` |
| Transcript | `T`: every prompt and raw response | `src/transcript` |

## Models and their jobs

Ids from `src/gemini/models.ts` only.

| Job | Model | Why this one |
| --- | --- | --- |
| Input gate (`6` questions), Watch triage, modeller gate, eval judge | `gemini-decision-1` (Decisions API) | Calibrated answers, no generated text; gate `1.125 s` p50 |
| Scout: perception | `gemini-4-hydrogen` (`low`) | Fast vision; `8.969 s` p50 |
| Architect: placement, risk, revision | `gemini-4-carbon` (`low`) | Deep reasoning over the twin; `12.542 s` p50 |
| Chief: briefing, Watch reassessment | `gemini-4-neon` (`low`) | Short grounded text; `4.117 s` p50 |
| Inspector | Rules engine (not a model) | Deterministic checks; `0.175 ms` warmed median |
| Voice | `gemini-3.8-live`, `gemini-3.8-flash-tts` | Push-to-talk with `5` tools; streamed speech |
| Fit preview | `gemini-nano-banana-2.1` | Image of the device in place, labelled AI-generated |
| Watch comparison | `antigravity-preview-09-2026` | Managed agent on the same feeds |
| Twin modeller | Files API + Decisions + Hydrogen + Neon | Video, photos, PDF, CSV to proposed assets |

Latencies: 6-worker reliability batch (`docs/log/pipeline-speed.md`) and `docs/log/rules-engine.md`.

## How a capture runs

1. Optional product page fetch (SSRF-guarded).
2. Decisions gate and Scout start together. A gate rejection stops the run; a gate timeout continues, labelled.
3. Rules engine checks the device at the pinned spot (`as-dropped`). First verdict `6.605 s` p50.
4. Architect proposes placement, risks, mitigations. Server grounding removes unknown asset and ATT&CK ids.
5. Rules engine checks the recommendation. If it disagrees, Carbon gets one revision through `previous_interaction_id`. Still blocked: hold.
6. Chief writes 2 to 3 lines from the checked facts.

The crew, panel, transcript and twin read the same event stream. The crew's work appears directly on the 3D drawing during a capture. Run 5 took `23.3 s` median and `42.0 s` p95 end to end. The separate reliability batch took `28.905 s` p50. [Full report](../eval/report/REPORT.md) · [Reliability log](log/pipeline-speed.md)

Passive objects (a mug, a chair) get physical and food-safety findings only, no cyber claims.

## Beyond one capture

- **Simulation** (simulated): process mass and energy model; `6` replays: `CIP Crossover`, `Ammonia Release`, `Chiller Trip`, `CO₂ Upset`, `Site Ransomware`, `Rogue Wireless`. Mitigations wait for approval; the rerun is compared with the original.
- **Threat Watch**: CISA KEV, CISA ICS, UK NCSC and openFDA beverage recalls; each item scored against the plant inventory; Decisions triage; Neon summary; human `Approve` / `Reject`. Live check: `21` KEV, `19` ICS, `2` NCSC, `4` openFDA events gave `7` rows matched to plant assets and `39` other items behind one disclosure. Recalls are mapped to plant consequences with a loss figure (Voila juice on `FIL-3`, `$3M est.` per comparable event). Source: `docs/log/watch-relevance.md`.
- **Escalation call.** A threshold crossing raises an alert (defaults `$100,000` per event, risk `60`, or `8` points over baseline). Use the bell chip's `Add your phone` and `Pair phone` controls. `Run test alert` adds a rogue LTE gateway labelled `TEST SCENARIO` without a model call. Tap `Call [name] · [masked number]` on the paired phone to open its dialer for a real call. This flow uses no carrier integration. The app's separate `Answer` control plays the optional Chief briefing using Gemini TTS. [On-call demo](CALL_DEMO.md)
- **3D view.** A WebGL2 renderer draws the same twin, including crew work such as evidence, placement and checks. The top bar's `2D` / `3D` switch has the tooltip `3D view · heights illustrative`. Pinning and simulation use the 2D drawing. [3D log](log/view3d.md) · [View switch](../src/view3d/View3DToggle.tsx)
- **Samples tray**: `Samples` on the capture rail, six credited photos that run the real pipeline (`docs/DEMO_KIT.md`).
- **Theme.** Light is the default. The top bar's `Switch to dark mode` control changes the palette. [Theme control](../src/theme/ThemeToggle.tsx)
- **Managed-agent comparison**: Antigravity on the same feeds, `72.05 s`, marked partial when a feed failed.
- **Twin modeller**: drop CSV, photos, PDF or video; review ghost assets; apply.
- **Fit preview**: image of the device at the recommended and dropped spots.
- **Health.** `Gemini` in the `AI crew` dock opens the `10` live service probes. [Crew dock](../src/crew/CrewDock.tsx)
- **Economic loss**: see below.

## Rules engine and risk score

`17` rule ids: `16` registered rules plus `PLACE-01` (`src/rules/registry.ts`). List and references: README and `docs/log/rules-engine.md`. Attack paths: breadth-first search up to `6` steps from `6` entry points to critical or safety targets; techniques from ATT&CK for ICS v20.1 (`104` techniques). Compliance references: `58` clauses (`src/data/compliance.ts`).

Score `0–100`: `round(100 × E / (600 + E), 2)`, `E` from finding severities and path likelihoods. Bands: low < 20, guarded 20 to 39, elevated 40 to 59, high 60 to 79, critical ≥ 80. A screening heuristic, not a certification.

## Economic loss estimate

Deterministic, Open FAIR structure (`src/econ`, `docs/log/loss-model.md`):

- Frequency from the rules-engine route × a vulnerability prior. Magnitude = downtime + repair + product + response + liability (PERT three-point estimates).
- `10,000` fixed-seed draws; same input, same number.
- Each loss figure shows the asset drawing, one estimated USD number, and `Show more` with every line of the calculation.
- Plant total under the risk dial: `$110k est. / yr` (seed: `43` detections, each asset and consequence counted once). Audited today; it read `$280k / yr` before the audit.
- Worked examples (seed): `HMI-F3` USB finding `$29k` per event, `$2.5k / yr`; `PLC-F3` safety finding `$94k` per event, `$8.6k / yr`; ammonia tabletop evacuation `$2.3M` per event, `$37k / yr` (`src/econ/README.md`).
- Published: only the OSHA reference `$165,514`, shown for context, not a model input. Everything else is assumed (simulated plant).

## Evaluation

Run 5 uses the same saved fair baseline as Run 4, one `gemini-4-hydrogen` call with a prose plant description. Both answered 68 of 71 captures (54 Wikimedia Commons photos, 9 descriptions and 8 product links). Scores use shared answers. End-to-end timings use all 71 attempts. Significance uses the 5% level. Run 5 recorded zero system execution errors. [Summary](../eval/report/SUMMARY.md) · [Full report](../eval/report/REPORT.md)

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

One development set informed the iterations. No held-out set has been evaluated. See `/proof` for failure cases and the build log for run history. [Build log](BUILD_LOG.md)

Reliability batch: `61/63` completed at 6 workers, `2` correct rejections, `0` operational failures (`docs/log/pipeline-speed.md`).

## Run it

```bash
npm install
cp .env.example .env     # set GEMINI_API_KEY (server only)
npm run dev              # http://localhost:4119
```

| Command | Does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript |
| `npm run test` | Vitest; `498` passed, `3` skipped at 13:37 EST |
| `npx tsx eval/validate.ts` | Validates the 71-item dataset |
| `npm run eval` | Paired evaluation (needs the key) |
| `npx tsx --env-file=.env scripts/smoke-pipeline.ts "<description>"` | One live capture from the CLI |
| `npx tsx --env-file=.env scripts/bench-pipeline.ts --suite reliability --workers 6` | Reliability batch |
| `npx tsx --env-file=.env scripts/health.ts --all` | Service probes |
| `npx tsx --env-file=.env scripts/daily-watch.ts` | Headless Threat Watch |

Pages: `/` app, `/gallery` symbols, `/proof` evaluation, `/capture` phone capture (QR), `/lens` lens reference, `/crew-review` crew review.

## Real and simulated

| Real | Simulated and labelled |
| --- | --- |
| Every model call; product page fetch; CISA, NCSC and openFDA feeds; evaluation runs | The plant, inventory, telemetry; tabletop replays; cost inputs |
| Rules engine and attack-path search (deterministic code) | Crew `idle patrol` between runs |

## Limits

- The shared-answer recall gain leaves `36` of `120` labelled risks missed. Hydrogen still leads in observed category accuracy (`87.3%` vs `80.0%`, inconclusive). [Full report](../eval/report/REPORT.md)
- Escalation call: physical handset audio, vibration and a carrier connection unverified.
- Security: single-user demo, no login, plain HTTP on the LAN (`docs/SECURITY.md`).
- Rules and replays are screening tools, not RF surveys, ACL parsers or dispersion models.
- Product links: no JavaScript rendering; WAF and CAPTCHA pages fail.
- Physical cameras, microphones, speakers, Safari and phones not tested; headless Chromium only.
- Loss figures depend on assumed costs; calibration needs site data.

## Credits

- **MITRE ATT&CK for ICS** v20.1 in `src/data/attack-ics.ts`, from the official STIX bundle. © The MITRE Corporation, reproduced with permission.
- **Feeds:** [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [CISA ICS advisories](https://www.cisa.gov/news-events/cybersecurity-advisories), [UK NCSC](https://www.ncsc.gov.uk/).
- **Compliance:** `src/data/compliance.ts` links to official pages (ISA/IEC, NIST, OSHA, FDA/eCFR, NFPA, IIAR, EHEDG, 3-A and others).
- **Dataset photos:** `54` Wikimedia Commons works (CC0, public domain, CC BY, CC BY-SA); attribution in `eval/dataset/SOURCES.md`.
