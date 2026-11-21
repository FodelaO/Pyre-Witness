# qa2-panel: right-hand panel QA before the 15:00 demo

Session 14:28 to 14:50. Source edits stopped at 14:38 (cut was 14:42); everything after that is checks only.
Scripts, text dumps and screenshots are in `.agents/qa/qa2-panel/` (`run.mjs` + `steps.mjs`; paths below are relative to it).

## Fixed (4)

| # | Defect | Before | After | Change |
| --- | --- | --- | --- | --- |
| 1 | Old Threat watch proposals were repeated at the top of the panel as "Mitigations · Awaiting approval · 3", next to the three current ones inside Threat watch (same firewalls, different wording). | `home-full-1440.png` | `assetsA-PLC-F3-1440.png`, `capture-done-1440.png`, text in `watch-1440.out` | `src/panel/SidePanel.tsx`: a still-pending watch proposal that the current review no longer lists is not shown in the main queue. Decided ones stay as history. |
| 2 | Finding loss figures had no unit ("$94k est.") under a header that reads "/ yr". | `assetsA-PLC-F3-1440.png` | `quick-PLC-F3-1920.png`, `quick-PLC-F3-1280.png` | `src/econ/mountsFindings.tsx`: passes `qualifier="per event"` (findings and compliance gaps). |
| 3 | At 1280x720 "Session trend" was cut at the panel edge ("Session tren"). | `quick-PLC-F3-1280.png` | `after-quick-TK-201-1280.png`, `after2-quick-data-1280.png` | `src/panel/panel.css`: caption wraps to two lines when the viewport is under 1380 px (rail under 330 px). |
| 4 | Threat watch row header broke word by word ("CISA / ICS", "9 d / ago", "ICSA-26-316- / 04") at 1440 and 1280. | `quick-data-1440-light.png`, `after-quick-data-1280.png` (shot before this fix, despite its name) | `after-watch-data-1440.png`, `after2-quick-data-1280.png` | `src/watch/watchSignals.css`: header parts no longer break inside; "Decisions triage" drops to its own line when the rail is narrow. |

How I hit defect 1: my script seeds a fresh browser profile with a saved report from earlier today. The page then fetched the
server's newer review, and both sets of proposals ended up in the twin. Any browser that still holds an older report from today
gets the same thing, which is why I fixed it rather than treating it as a test artefact. I did not reproduce it in the
presenter's own browser.

Fix 4 was re-shot in dark at 1440 and 1280 only. Not re-shot in light or at 1920.

## Checked and found correct

- **Plant risk header** at 1440, 1920, 1280 dark and 1440 light: 46 / Elevated / 0 vs baseline / `Loss exposure $110k est. / yr`.
  After the capture: 47, +1, $120k. After `Move there`: 46, 0, $110k. Top-bar risk matched each time.
- **Loss arithmetic**, full ledger opened for two findings (`more-1440.out`, `more-PLC-F3-all-1440.png`, `more-HMI-F3-all-1440.png`):
  - PLC-F3: $42k × 17% = $7.1k; 15 h × $5.3k/h = $79.5k (15 rows of $5.3k); 2,486 bottles × 24¢ = $597; 37 h × $180 = $6.7k. Sum $93.9k, shown $94k.
  - HMI-F3: $8.9k × 17% = $1.5k; 15 h × $5.3k/h × 25% = $19.9k (15 rows of $1.3k); 2,496 × 24¢ = $599; $6.7k. Sum $28.6k, shown $29k.
  - HMI-F3 frequency: 0.6/yr × 14% is 1 in 11.9 yr, shown 1 in 12; $28.6k / 12 is $2.4k, shown $2.5k / yr (see "Not fixed" 10 for PLC-F3).
  - Units: "per event" on the figure and "Total single-event loss" in the ledger, both seen on screen. The batch, response, frequency,
    percentile and "Annualized loss (ALE) … / yr" rows were read from the DOM text only; on screen they are further down a scroll box that I did not scroll.
  - Drawings are present on the figure and on each asset row (`assetsA-PLC-F3-more-top-1440.png`).
  - Only two ledgers were opened in full, not three: FW-EDGE has no finding and so no loss figure, and I did not open HMI-F3's second finding or the capture's figure.
- **Inspector**: PLC-F3, HMI-F3, FW-EDGE, TK-201, C-1 (telemetry PT-411 / PT-412 in band), LT-101 and CT-210 (sensor telemetry in band).
  Identity, floor and network links, assumed software and matched advisories render without clipping.
- **Threat watch, Data lens**: "Live · checked hh:mm:ss · 4 sources", next check time, "Inventory assumed (simulated plant) · matched by rule",
  7 matched rows first with chips and `est. · per event` / `per comparable event`, "39 other items today" collapsed, 3 recommendations
  with Approve / Reject. Link targets are CISA advisory and openFDA URLs (read from the DOM, not opened).
- **Model the twin**: one real ingest of `demo/kit/new-assets.csv`: 5 rows gave 5 proposals with room, level, cell and the cited line;
  accepting one shows "Add accepted · 1" (`csv-accepted-full-1440.png`). I did not apply it.
- **Capture** (one real run, "LTE cellular gateway with an external antenna for vendor remote support", `capture-1440.out`):
  Control room near FW-DMZ, L3.5 DMZ, "Rules engine cleared"; never Filler 3; 2 risks, one with T0860 Wireless Compromise;
  `Here $31k · There $0 · est. per event`; three-line Chief briefing; queue order relocate, disable radio, enroll.
  `Move there` gives "At recommended location", "Moved · est. loss now $0 per event", and the relocation row reads "Already resolved by the move".

## Not fixed

Outside my folders, or found after the cut:

0. **Overlapping text in the fully opened ledger** (found 14:51, after the cut; `more-PLC-F3-all-top-1440.png`). After `Show more` and then
   `+13 more`, the row list becomes a scroll box and the "Show less" / "Total single-event loss" footer sits on top of the last visible row:
   "CV-P1 · Bottle accumulation" shows through beside "Show less" and "$29k installed" shows below the total. The first level (`Show more` only)
   is clean (`assetsA-PLC-F3-more-top-1440.png`). The CSS is in my lane (`src/econ/LossFigure.module.css`) but the edit window had closed.
   For the demo: open `Show more`, do not press `+13 more`.
1. **Loss breakdown, collapsed list** (`src/econ/LossBreakdown.tsx`): the rows visible before "+13 more" add to $87k while the total
   line says $94k. The missing $600 (batch held) and $6.7k (response) are below the fold. Correct, but it reads as an error if someone adds it up.
2. **"Assets involved · 17 · $2.5M"** is installed value shown beside a loss, with no word saying so. The rounded rows add to about $2.58M;
   I could not tell from the UI whether $2.5M is exact.
3. **Capture attack paths** read "0 paths" for both checks while the risk list says the gateway bypasses the OT perimeter and the loss is $31k. Rules engine output, not changed.
4. **RULE / PROFILE provenance** on risks: not visible in the collapsed risk rows. I did not open a risk row, so I cannot say how it reads.
5. **TK-201** shows no telemetry in the inspector although the drawing shows 64 %.
6. **Sensor click target** (`src/floor/**`): a click at the centre of an instrument's box lands on the floor and selects nothing;
   a click on the glyph works. Seen by script only.
7. **"Awaiting check · checked 14:43:34 · 4 sources"** with a grey "Ready" pill, once (`after2-quick-data-1280.png`). Every other load said "Live".
   My guess is a hot reload reset the watch store while the row kept its data; I did not confirm that.
8. At 1280 the live line wraps as "… · 4 / sources".
9. Three matched rows carry the same feed title, "Siemens RUGGEDCOM APE1808", for FW-DMZ (PAN-OS) and FW-EDGE (FortiOS). Shown with "Applicability uncertain".
10. **PLC-F3 frequency line** reads `TEF 0.7/yr × Vuln 14% ≈ 1 in 11 yr`. The numbers as displayed give 1 in 10.2. The annual figure ($8.6k / yr)
    agrees with 1 in 11, so the inputs are probably rounded for display (0.65 would give 11); I did not confirm that in the model, which I may not edit.

## Not checked

- Hover on a watch row highlighting the asset, and Approve / Reject on a watch recommendation (buttons seen, not clicked).
- Capture answer block at 1920, 1280 and in light. Inspector in light for PLC-F3 (screenshot timed out).
- Expanding the "39 other items" list, the Antigravity comparison, the modeler error state.

## Other things seen

- 14:33, one load: `ReferenceError: useMemo is not defined` in `src/floor/AssetLayer.tsx` when switching to the Data lens; the panel disappeared.
  The import was there a minute later and no later run logged an error. Last clean load 14:45.
- Element screenshots timed out several times in the Data lens. The script now pauses animations for panel shots.
- One run finished its steps but the process did not exit and was killed by the 3 minute limit. No browser was left running.

## Model calls

- Deliberate: 1 capture, 1 CSV ingest.
- Not deliberate: my five loads before 14:34 carried a saved watch report older than five minutes, so each asked the server for a review.
  The "Model review" time moved from 02:19 PM to 02:28 PM in that window, so at least one of those was probably a real review.
  From 14:34 the script stamps the saved report as fresh and no review is requested.

## Verification

- `npx tsc --noEmit` once at 14:40, after the last source edit: no output.
- `npx vitest run src/panel src/watch src/modeler src/econ --maxWorkers=1` at 14:40: 25 files, 121 passed, 3 skipped.

## Files changed

- `src/panel/SidePanel.tsx`, `src/panel/panel.css`
- `src/watch/watchSignals.css`
- `src/econ/mountsFindings.tsx`
