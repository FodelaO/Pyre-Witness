# Pyre Witness: judge's 2-minute guide

**Snap any device. See where it belongs in your plant, and what risk it brings, before you plug it in.**
Built today (Nov 21, 2026) on a fictional plant, *Bebidas del Norte, Line 3*: `92` assets, `13` areas, `6` entry points (`docs/log/plant-design.md`). Demo build: `http://localhost:4120` (dev server: `4119`).

Every number below cites its source. Eval numbers come only from `eval/report/SUMMARY.md` and `eval/report/REPORT.md` (Run 4 against the saved fair single-call baseline).

## 1. Live demo (35%)

| Click | You see | Source |
| --- | --- | --- |
| Capture rail: `Camera`, `Upload`, `Samples`, `Product link`, `Describe device`, `Phone QR`, then `Pin location` on the floor | Gate, Scout, rules engine, Architect, Chief run live. Rules verdict at the pin first (`6.605 s` p50), full result `28.905 s` p50 | `docs/log/pipeline-speed.md` |
| `Samples`: six credited photos (IP camera, LTE router, USB drive, access point, phone, mug) | The real pipeline on a known photo. Hover a thumbnail for its credit | `docs/DEMO_KIT.md`, `public/demo/credits.json` |
| `Move there` in the placement answer (or drag the device) | `POST /api/reassess` re-checks. Wi-Fi camera at Filler 3: `Here $280k · There $2.7k` per event, then `Moved · est. loss now $2.7k` | `docs/log/loss-panel-demo.md` |
| Lens slider `Material / Both / Data` (keys `1` `2` `3`) | Same twin as pipes, both, or network. Hover `FIL-3` in Both: `15` assets light up | `docs/log/lens-integration.md` |
| `2D` / `3D` switch (top bar) | The same live twin in 3D: same stores, same selection, attack arcs from the rules engine. Heights are illustrative | `docs/log/view3d.md` |
| Bell chip (`Armed $100k / 60`): `Add your phone`, `Pair phone`, `Run test alert` (or a real capture), then `Call on-call` on the alert card | A threshold crossing raises a call to a paired phone. It rings, `Answer` plays the Chief briefing, `Approve action` changes the twin | `docs/CALL_DEMO.md`, `docs/log/escalation-call.md` |
| `Simulate` rail (Both lens): `CIP Crossover`, speed `4×` | Simulated replay stops at `ZSC-311` at `00:12`. Approve the `V-311` interlock: containment `00:10` | `docs/log/simulation.md` |
| `Watch` (top bar), then `Run now` | Live feeds: CISA KEV `21`, CISA ICS `19`, NCSC `2`, openFDA `4` recall events. `7` rows matched to plant assets, `39` other items collapsed. `Approve` / `Reject` per proposal | `docs/log/watch-relevance.md` |
| `Hold to talk` (or Space) | Live voice. Tool call `select_asset` selected `P-101` `2,009 ms` after release | `docs/log/voice.md` |
| `Model the twin` (results panel): drop a CSV, photos, video or PDF | Ghost assets to review, then apply. CSV `17.704 s`, 35 s MP4 via Files API `23.981 s` | `docs/log/modeler.md` |

## 2. Proof it works (25%)

Run 4: `71` captures, `66` answered by both. Shared answers, one Hydrogen call vs Pyre Witness (`eval/report/SUMMARY.md`, `REPORT.md`):

| Metric | Single call | Pyre Witness | Test |
| --- | --- | --- | --- |
| Recommended a labeled forbidden area | `5.6%` (3/54) | `0.0%` (0/54) | exact `p=0.250` |
| Key-risk recall | `51.7%` (61/118) | `58.5%` (69/118) | `+6.8 pp` [`-1.8`, `+16.1`] |
| Equipment kind | `94.8%` (55/58) | `98.3%` (57/58) | exact `p=0.625` |
| Plant area (`n=57`) | `87.7%` | `89.5%` | McNemar `p=1.00` |
| Purdue level (`n=54`) | `96.3%` | `94.4%` | |
| Device vs non-device (`n=66`) | `100%` | `100%` | |
| Valid ATT&CK IDs | `86.0%` (`n=50`) | `100.0%` (`n=28`) | |
| Rule consistency | `84.5%` (`n=58`) | `98.4%` (`n=64`) | |
| Median / p95 per capture | `13.3 s` / `18.4 s` | `24.6 s` / `42.0 s` | |

- **The story.** One Gemini 4 Hydrogen call is a strong baseline. Run 3 lost to it on equipment kind and key-risk recall. The fix: kind definitions in the Scout prompt, and a final risk list that is complete by construction. Run 4 ties or leads on every accuracy metric above except Purdue level.
- **Caveats.** On the headline metrics (area, kind, Purdue level, forbidden areas, key-risk recall) no difference is statistically significant on `71` items (`p=1.00` / `0.625` / `0.250`; key-risk interval `[-1.8, +16.1]` pp). The single call is significantly better on radio recall (`100.0%` vs `33.3%`) and cloud flags (`88.5%` vs `23.1%`), and slightly better on device category and device-type naming (`eval/report/REPORT.md`). One development set that informed the iterations; no held-out set.
- `Proof` (top bar, `/proof`): runs, baseline next to system, failures with images.
- `Gemini OK` chip (top bar): `10` live service probes, all healthy at 18:06 UTC. It turns amber when an auxiliary service fails and red only when a capture-pipeline service fails, and names it (`docs/log/gemini-health.md`).
- Press `T`: every prompt, raw response, tokens, timing; export JSON or Markdown (`src/transcript/`).

Reliability batch: `61/63` completed at `6` workers, `2` correct rejections, `0` operational failures (`docs/log/pipeline-speed.md`).

## 3. Creativity (20%)

| Click | You see | Source |
| --- | --- | --- |
| Watch the floor during a capture | Scout, Architect, Inspector, Chief walk to where the work is, driven by pipeline events. Between runs: `idle patrol` | `docs/log/crew-presence.md` |
| `/gallery` | `29` hand-drawn parametric SVG equipment kinds | `src/equipment/kinds/` |
| `2D` / `3D` | 3D drawn by a hand-written WebGL2 renderer. No 3D library, no new dependency | `docs/log/view3d.md` |
| The escalation call | A loss or risk threshold rings a paired phone; the Chief speaks the finding; the phone approves the change | `docs/CALL_DEMO.md` |
| Select `PLC-F3`, open its loss figure, `Show more` | Asset drawing, one number (`$94k est.` per event), then the itemized calculation | `src/econ/README.md` |
| Under the risk dial | `$110k est. / yr` for the seed plant (`43` detections, each asset and consequence counted once) | `src/econ/README.md`, `docs/log/loss-model.md` (Audit) |
| `Watch`: beverage recalls | openFDA recalls priced for this plant, per comparable event: Voila juice on `FIL-3` `$3M est.`; 7up and Wawa on `LBL-3` `$2.8M est.` each | `docs/log/watch-relevance.md` |
| `Describe device`: "coffee mug" | Passive object: `FOOD-02` / `FOOD-03` food-safety findings, no cyber claims (`0/8` non-devices) | `eval/report/REPORT.md` |
| `Fit preview` tiles after a capture | AI-generated image of the device at the recommended and dropped spots, `1200 × 896`, `9.70–24.36 s` | `docs/log/fit-preview.md` |
| Theme button (top bar, "Switch to light mode") | Dark and light theme | `src/theme/` |

## 4. Gemini 4 and Decisions API (20%)

| Where | What | Source |
| --- | --- | --- |
| Capture gate | `gemini-decision-1`, `6` questions, `1.125 s` p50. Unusable captures stop here | `src/gemini/capture.ts`, `docs/log/pipeline-speed.md` |
| Threat Watch triage | `3` questions per advisory and asset pair | `src/watch/triage.ts` |
| Twin modeller gate | `3` questions. Rejected a shopping list in `0.399 s` | `src/modeler/gemini.ts`, `docs/log/modeler.md` |
| Eval judge | Device-type match on anonymized answers | `eval/judge.ts` |
| Rules engine vs Architect | On a blocked or invalid recommendation the server asks Carbon for one revision via `previous_interaction_id`. `5` of `61` runs in the batch; Run 4: `4.7%` (3/64) | `docs/log/pipeline-speed.md`, `eval/report/SUMMARY.md` |
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

- **New work:** built today; `498` Vitest tests passed, `3` skipped at 13:37 EST (not re-run since). Timeline: `docs/BUILD_LOG.md`.
- **Security:** single-user demo, no login. What is defended and what is not: `docs/SECURITY.md`.
- **Nothing mocked:** every Gemini, Decisions, Live, TTS, image, Files, Antigravity and feed call is live. The plant is labelled `Simulated plant` in the top bar.
- **Gemini 4 use:** Hydrogen, Carbon, Neon each have one job, plus `gemini-decision-1`. The UI is a visual twin, not a text box.

## Bonus tracks

- **Managed Agents:** `Watch` → `Antigravity comparison` → `Run Google-hosted watch`. Antigravity `72.05 s` next to the local Decisions + Neon loop `16.60 s`, same public feeds. The hosted run was `partial`: its sandbox could not fetch CISA ICS (`docs/log/threat-watch.md`).
- **Shopify:** not integrated.

## Questions you might ask

- **What is simulated?** The plant, its inventory and telemetry, the `6` what-if scenarios, and the dollar figures. All labelled.
- **Does it beat one Gemini call?** Run 4 ties or leads on the headline metrics (area, kind, key risks, device vs non-device) and trails on Purdue level, with `0/54` forbidden-area recommendations vs `3/54`. The single call is significantly better on radio recall and cloud flags; on the headline metrics no difference is significant on `71` items; one development set, no held-out set. Non-device physical-safety coverage `75.0%` vs `0.0%` (`eval/report/REPORT.md`).
- **What does the rules engine add?** Spatial, RF, washdown, hazard and food checks the model can miss. Rule consistency `98.4%` vs `84.5%`. Unresolved blockers produce a hold, not an unsafe placement.
- **How fast?** First rules verdict `6.605 s` p50; full capture `24.6 s` median in Run 4 (single call `13.3 s`), `28.905 s` p50 in the reliability batch.
- **Is the call a real phone call?** The app rings the paired phone's browser over the LAN. A real cellular call can be placed from that phone with its own dialer. No carrier integration.
- **When a service is down?** The gate times out at `4 s` and the run continues, labelled (`3` of `63` in the batch, all completed). The `Gemini` chip names the degraded service.
- **Are the dollar numbers real?** Deterministic FAIR Monte Carlo, fixed seed, `10,000` draws, on assumed plant economics (simulated plant). Audited today: PERT replaced triangular, the plant figure fell from `$280k` to `$110k est. / yr`. The only published figure is the OSHA reference `$165,514`, shown for context, not a model input (`src/econ/README.md`).
- **Real plant?** Replace `src/twin/seed.ts` or use `Model the twin`; calibrate costs and RF data.

## Honest limits

- Radio recall `33.3%`, cloud-flag accuracy `23.1%`, key-risk recall `58.5%` (Run 4, `eval/report/REPORT.md`).
- Headline differences against the baseline are not statistically significant; the baseline is significantly better on radio recall and cloud flags; no held-out set.
- Loss priors are not calibrated: read them as order of magnitude and ranking.
- Call: phone audio, vibration and a carrier connection unverified on a physical handset (`docs/log/escalation-call.md`).
- Watch relevance: interactive browser check pending (`docs/log/watch-relevance.md`).
- Product links: no JavaScript rendering, WAF pages can fail (`docs/log/link-fetch.md`).
- Physical mic, speaker, Safari and phone hardware untested; tested in headless Chromium (`docs/log/voice.md`).
- Risk score `0–100` and loss figures are decision-support heuristics, not certifications.
