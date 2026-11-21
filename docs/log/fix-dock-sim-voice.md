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
