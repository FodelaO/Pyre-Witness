# Dock, simulation, voice, and phone pairing

| Defect | Cause and fix | Before | After |
| --- | --- | --- | --- |
| Outcome clipped at 1280×720 | The replay row carried the full safeguard name. The dock shows `Contained 00:16` and the tooltip and Simulation comparison carry the full outcome. | [Light 2D](shots/fix-dock-sim-voice-before-outcome-light-2d.png) | [Light 2D](shots/fix-dock-sim-voice-after-outcome-light-2d.png), [dark 2D](shots/fix-dock-sim-voice-after-outcome-dark-2d.png) |
| Blocked mic covered the legend | The notice used the wide transcript popover. `Allow mic access` now sits above the Chief button within its column and fades after four seconds. | [Dark 2D, 1440×900](shots/fix-dock-sim-voice-before-voice-dark-2d.png) | [Dark 2D, 1440×900](shots/fix-dock-sim-voice-after-voice-dark-2d-1440x900.png), [light 2D](shots/fix-dock-sim-voice-after-voice-light-2d.png), [dark 2D](shots/fix-dock-sim-voice-after-voice-dark-2d.png), [light 3D](shots/fix-dock-sim-voice-after-voice-light-3d.png), [dark 3D](shots/fix-dock-sim-voice-after-voice-dark-3d.png) |
| Four seeded scenarios lacked mitigation cards | The candidate controls could not improve on seeded containment. Independent standby, local setpoint approval, endpoint isolation, and restricted parking access now improve the corresponding simulated replay. | [Chiller baseline](shots/fix-dock-sim-voice-before-chiller-light-2d.png) | [Chiller approval](shots/fix-dock-sim-voice-after-chiller-light-2d.png), [chiller rerun](shots/fix-dock-sim-voice-after-chiller-rerun-light-2d.png) |
| Reopening the QR consumed session slots | The receiver credentials lived only in the mounted component, and unused sessions occupied slots for ten minutes. The tab now reuses its live code across reloads, deduplicates replayed packets, and retires unused codes after two minutes. | [Original QR preview](shots/fix-dock-sim-voice-before-qr-dark-2d.png) | [Reused QR preview, code masked](shots/fix-dock-sim-voice-after-qr-dark-2d.png) |

The before images are from the preceding QA pass. Playwright checked the running app in light first and then dark, on 2D and 3D at 1280×720. The mic notice stayed inside its column and clear of the legend, disappeared after four seconds, and returned on retry. The installed Chrome channel aborted in the restricted environment. The cached Chrome Headless Shell with SwiftShader handled the captures. The checks used zero Gemini captures and intercepted voice-session requests.

The browser approval and rerun measured Chiller Trip at 00:12 → 00:06, CO₂ Upset at 00:04 → 00:00, Site Ransomware at 00:08 → 00:04, and Rogue Wireless at 00:04 → 00:00. At 00:00 the approved control holds at the modeled report stage. All times come from the simulation engine. The test suite exercises approval and rerun on all six seeded scenarios.

The browser reused the same QR through three reopens and a reload. A separate light-mode run expired an unscanned QR in 120.0 seconds and replaced it with **Get new code**. The mailbox tests cover slot release and preservation of the original ten-minute deadline after a scan. The phone route still needs to report page opens. Until then, an accepted upload is what promotes the session to the longer lifetime. [Live expiry screenshot](shots/fix-dock-sim-voice-after-qr-expired-light-2d.png)

## Contract request

In `src/app/capture/route.ts`, import `handoffStore` from `@/handoff/store` and call `handoffStore.markScanned(code)` for a validated code in `GET`. This route is outside the assigned paths. The workspace rejected the request file under `.agents/requests/`, so the exact change is recorded here.

## Verification

- `npx vitest run src/sim src/voice src/capture src/handoff --maxWorkers=1` passed all 79 tests.
- `npm run typecheck` passed on the second run after a concurrent crew type error cleared.
- `git diff --check` passed for the assigned source folders.

## Opus review corrections

| Defect | Cause | Fix |
| --- | --- | --- |
| A phone that scanned the QR but took more than two minutes to send got "This link expired" | No route reports a page open, so `markScanned` only ran on upload. The two-minute timer closed every code without an upload, including codes a phone was still using. | `src/handoff/store.ts`: a code keeps its ten-minute life. After two minutes without an upload it gives its slot to a new pairing only when the store is full, oldest first. The store key moved to `pyreHandoffStoreV4` so the running server uses the new logic. Tests cover the slot release and a send at five minutes. |
| Longer Chief errors still covered the legend's lower row | The bubble wrapped. Errors such as "Gemini Live is taking too long to connect. Hold to try again." took three lines at 1280×720 and covered the legend. Below 920 px the column is one button wide, so even "Allow mic access" took three lines over the legend. | `src/voice/voice.css`: the bubble stays on one line with an ellipsis. The Chief button tooltip carries the full text. Below 920 px the line extends left from the column and sits 3 px higher, clear of the legend and the simulation box. |
| An uncontained Rogue Wireless summary read "parking_lot reached HMI-F3" | Pre-existing. The summary took its endpoint from the report stage instead of the RF-reach stage. This text is now the full outcome in the tooltip and the Simulation comparison. | `src/sim/scenarios/wireless.ts` reads stage 1, so the summary now reads "EXERCISE-RADIO reached HMI-F3". |

Verified in the running app with Playwright and the installed Chrome. The checks made no model calls: voice, watch, and escalation requests were blocked. At 1280×720 in light and dark, 2D and 3D, all six outcomes fit at 135 px. Every scenario offers a `SIMULATION ·` card. Approval and rerun moved CO₂ Upset from 00:04 to 00:00, Site Ransomware from 00:08 to 00:04, and Rogue Wireless from 00:04 to 00:00. "Allow mic access" measures 91×18 inside the Chief column, clear of the legend. It fades to opacity 0 after four seconds and returns on retry. A blocked microphone was stubbed as `NotAllowedError`, because headless Chrome leaves the prompt pending. The same QR code survived two reopens and a reload. After 130 seconds without a scan, the server still held the code: an invalid upload probe returned 400, not 410. Screenshots are in `.agents/qa/opus-correct/fix-dock-sim-voice/`. The QR images are masked. Another agent then moved the Chief column next to the simulation controls. The bubble was rechecked at 1280 and 900 px and stays on one line above the Chief button (`bubble-now-light-*.png`).

Open items:
- Between about 1050 and 1200 px, the replay timeline collapses to 0 px and hides the outcome line. This is pre-existing: `.pw-sim-launch[data-replaying] { min-width: 280px }` leaves the replay box about 60 px.
- On the seeded plant, CO₂ Upset and Rogue Wireless are already contained at their first check. Their new controls can only hold at the 0 s report stage, so the engine no longer rejects a control on stage 0. Each time comes from the re-run. The loss figure reports "$0 avoided".
- The `src/app/capture/route.ts` request above is still open. Phones no longer need it. It would stop a scanned code from being reclaimed when the store is full.
