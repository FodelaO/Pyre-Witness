# qa-dock: bottom dock QA (capture, phone, pin, simulate, Chief voice)

Scripts: `.agents/qa/qa-dock/{shoot,cap,phone,sim,verify,verify2}.mjs` (Playwright + installed Chrome).
Checked at 1440x900, 1920x1080, 1280x720. One real Gemini capture used (phone → auto-run).

## Defects and fixes

| # | Defect | Status | Shots |
| --- | --- | --- | --- |
| 1 | The simulation timeline could not be scrubbed. Stage segments were 3 px `li` with no action. | **Fixed**: each stage is now a button with a 21 px hit area and a `00:04 · stage title` tooltip, and jumps the replay there. Jumping mid-run pauses; jumping to the last stage finishes and shows the outcome and mitigations. Play resumes from that point. New `seek()` in `simStore`, test in `src/sim/seek.test.ts`. | before `shots/qa-dock-sim-before.png`, after `shots/qa-dock-sim-scrub-after.png` |
| 2 | A photo sent from the phone only filled the draft. The presenter had to find and click Analyze on the big screen. | **Fixed**: a phone send into an empty, idle composer now submits through the normal path (pin and note included). If the laptop is busy, the existing "N from phone · Add photos" prompt is unchanged. Collapsing the card cancels the pending auto-run. | before `shots/qa-dock-phone-before.png`, after `shots/qa-dock-phone-autorun-after.png` |
| 3 | A photo error stayed visible after closing and reopening the card ("Could not read a photo…" appeared under the Phone QR pane). | **Fixed**: closing the card clears the draft error (`usePhotoDraft.clearError`). | before `shots/qa-dock-stale-error-before.png` |
| 4 | The Describe box cut text silently at 1200 characters. | **Fixed**: from 1000 characters a mono `1100/1200` counter appears next to the label. | after `shots/qa-dock-counter-after.png` |
| 5 | Microphone errors were sentences ("Microphone permission is required. Allow it in your browser and hold again."). | **Fixed**: now short: "Mic blocked. Allow it, then hold again." / "No microphone found." / "Mic busy in another app." / "Mic did not start. Hold again." | after `shots/qa-dock-voice-denied-after.png` |

## Verified OK (no change)
- Capture bar: all six entries have tooltips on hover and focus, an aria-label, and `aria-expanded` or `aria-pressed`. Escape closes the card. An empty submit is blocked (Analyze disabled). A bad URL or `ftp://` shows one inline line: "Enter a valid http:// or https:// URL.". A non-image file or an undecodable 30 MB file gives "Could not read a photo. Try a JPEG or PNG.".
- Phone QR: the QR encodes the LAN address (`http://172.16.249.18:4119/capture?s=…`), not localhost. An address picker appears when there are several interfaces. The phone page at 390x844 has two big thumb buttons, three slots and a full-width "Send to laptop" (`shots/qa-dock-phone-page.png`). The QR took about 7.5 s to appear while the dev server was busy.
- Pin: arming shows the "Click a zone to pin a device" banner and the button tooltip changes to "Cancel pin". A click drops a pin, and the card chip reads "Filler 3 ×" (`shots/qa-dock-pin.png`). `analyze()` receives the pin point.
- Simulate: Material offers 4 process scenarios, Data offers 2 cyber scenarios, Both offers all 6. All 6 run to a clear "Contained in mm:ss · safeguard" line (no bare 00:00), and SIMULATION is visible throughout. Reset removes every marker, route and area ring (0 left) and closes the transport. The panel shows the loss figure "$2.3k est. · SIMULATION" and the mitigation Approve / Reject at 1440 and 1920.
- Voice: holding with no mic grant stays quiet (back to idle). With a denied mic you get "Hold to retry" plus a short message. A failure of the voice token (HTTP 429) is swallowed without UI noise.

## Not fixed (outside my sector, written to `.agents/requests/qa-dock.md`)
1. Tab order reaches the dock only after >100 floor assets (shell / floor).
2. At 1280x720 the results panel is hidden, so the sim outcome card, loss and mitigations are invisible (shell).
3. The mitigation card shows "0 risk pts projected" beside a real time gain (panel).
4. The red Gemini health chip during rate-limited checks looks like an outage (health).

## Not covered
- The Fit preview was not reachable without a completed capture result plus an extra image-model call. Skipped to save quota.
- The listening, thinking and speaking voice states need a real microphone. Not testable headless.
- The real-mic permission prompt flow: if the user releases while the prompt is open, the denial is swallowed and the error shows only on the next hold.
