# Demo video (task: demo-video)

## Output (final cut, recorded 2026-11-21 14:44-14:47 EST from the final build)

- `demo/out/pyre-witness-demo.mp4`. ffprobe gives **58.166667 s** (1745 frames at 30 fps), H.264 High, 1920x1080, yuv420p, faststart, no audio, 16,741,612 bytes.
- `demo/out/contact-sheet.jpg`: one frame every 3 s, 4 columns.
- `demo/out/timeline.json`: the exact timeline. `demo/out/manifest.json`: each take with its source URL, fps and timing marks.
- Every take was recorded **only from http://localhost:4120**, after `.agents/demo-build-live` appeared (14:43:27). The assembler refuses any take whose manifest `url` is not 4120.
- **One real capture** was used: a single Gemini run, not retried. Nothing is mocked or injected, and every answer on screen comes from that run.

## Shot list (times in the cut; 0.15 s crossfades between shots)

| Cut time (s) | Beat | Caption | Speed | What really happens |
|---|---|---|---|---|
| 0.00-4.00 | Title card | (tagline) | still | `demo/assets/title-card.png` with "Snap any device. See where it belongs in your plant and what risk it brings." |
| 3.85-7.18 | Capture: input | Pin by Filler 3, describe the device | **x3** | Click `Pin location`, then the floor beside FIL-3 (the pin reads "Filler 3"). Click `Describe device` and type the description with the real keyboard: "Wi-Fi IP camera with a default password sticker (admin/admin), cloud app, microSD slot". Click `Analyze`. |
| 7.18-10.66 | Capture: crew | The crew works it on Gemini 4 | **x9** | The real pipeline runs: Decisions gate, Scout (Hydrogen), Inspector (rules engine), Architect (Carbon), Chief (Neon). CAM-901 lands at the pin and risk goes 46 → 51 inside this sped-up piece. Analyze to answer took 30.4 s real time. |
| 10.66-14.48 | Capture: answer | CAM-901: where it goes, never here, T0860 | **x3** | The cursor tours the rail: Where it goes = Corporate office L4 ("Rules engine cleared"). Never here = Filler 3 L2. Risks include T0860 Wireless Compromise. Attack paths: 18 as dropped. |
| 14.48-16.71 | Capture: loss | Loss here $290k, there $2.7k per event | real time + 0.8 s freeze on the last frame | The app's line "Here $290k · There $2.7k est. per event". |
| 16.71-20.95 | Escalation | $290k crosses the threshold: alert raised | real time | The app's own escalation card: "Threshold crossed · $290k est. per event · CAM-901 at Filler 3 · Internet -> CAM-901 -> SW-F3 -> FIL-3 · Call on-call". Defaults are $100k / 60. No call was placed and no phone was paired. Shown in chronological order: it fired when the device landed, before `Move there`. |
| 20.95-27.05 | Move there | Move there: risk 51 → 47 | real time + 0.5 s freeze | Click `Move there`. CAM-901 slides to the Corporate office and the button reads "At recommended location". The panel shows "Moved · est. loss now $2.7k" and risk drops 51 → 47. The escalation card resolves and the chip returns to "Armed". |
| 26.90-34.50 | Lens | Keys 1 · 2 · 3: Material, Both, Data / Show more: the loss, itemized | real time | Keys `2` and `3` pressed on the focused lens slider. Click HMI-F3, then `Show more` on its $29k figure: the itemized calculation with asset drawings. A hard cut skips about 0.8 s between the click on HMI-F3 and `Show more`. |
| 34.35-40.22 | 2D / 3D | 2D \| 3D: the same live plant | real time | Click `3D`, one slow drag orbit with the real mouse, click `2D`. |
| 40.07-46.20 | Threat watch | Live advisories, matched to your assets / A sector recall, priced here: $3M | real time | Data lens rail. CISA ICS advisories matched to FW-DMZ / FW-EDGE ($7.7k est. per event). Then the openFDA recall "Voila! juice 100% SQUEEZED ORANGE": "Sector recall · what the same failure would cost here", FIL-3 / PLC-BL, $3M est. per comparable event. |
| 46.05-50.65 | /proof | Run 4 vs one Gemini call: +1.8 pp / Full table, losses included | real time | Click `Proof`. The comparison card shows Run 4, n=71, +1.8 pp with Wilson intervals. Then `Full baseline comparison` opens, including the rows where the baseline wins (radio recall 100% vs 33.3%). |
| 50.50-53.30 | Transcript | T: every prompt and response | real time | `T` opens the run transcript of this capture: description, Decisions gate, Scout steps. Recorded right after the capture, before /proof, and placed after /proof in the cut. |
| 53.15-58.17 | End card | (none) | still | Decisions gate · Hydrogen perception · Carbon reasoning · Neon briefing · Rules engine is not a model · github.com/FodelaO/Pyre-Witness |

Every sped-up piece shows its factor on screen (amber `x3 speed` / `x9 speed` badge). The two freezes (0.8 s and 0.5 s) hold the last frame still so a number can be read; they are not speed changes.

## What the real capture answered (from the rail, `demo/out/shots/capture-answer.txt`)

Wi-Fi IP camera (Wi-Fi, microSD, default credentials seen, cloud-connected, removable storage). Could not determine: vendor, model, power, IP rating. Where it goes: Corporate office, L4 (Rules engine cleared). Never here: Filler 3, L2 ("Unverified washdown/hygienic rating and cloud Wi-Fi exposes PLC-F3."). 5 risks, including T0860 Wireless Compromise and "T1694.001 Default Credentials". Attack paths: 18 as dropped, 0 at the recommendation. Chief: "Placement: Corporate office, Purdue 4. Rules engine: Placement cleared. Caution: verify Wireless and cloud exposure near safety PLC." Risk went 46 → 51 → 47.

## Re-cut

```
node demo/make.mjs --no-record          # re-assemble from the 4120 takes (no model calls)
node demo/make.mjs                      # re-record the cheap shots on 4120, reuse the capture
node demo/make.mjs --with-capture       # also redo the ONE real capture (spends a capture)
node demo/record.mjs --url=http://localhost:4119 --dry-capture --only capture,lens   # rehearsal, stops before Analyze
```

Rehearsal takes (any `--url` other than 4120) assemble to `demo/out/rehearsal-NOT-FINAL.mp4` and `contact-sheet-rehearsal.jpg`, never to the deliverable.

## Changes made this session (all under `demo/`)

- `lib/browser.mjs`: uses the installed Chrome headless on its default ANGLE Metal GPU path. `demo/fpsprobe.mjs` measured three options. The suggested SwiftShader flags gave **2-3 fps** (the 3D drag took 50 s). The bundled Chromium gave 0 screencast frames of the 3D canvas. Chrome default gave 54-57 fps with WebGL2.
- `lib/app.mjs`: the default URL is 4120 (`--url=` only for rehearsals), new selectors (describe textarea, placement loss line, escalation card, 2D/3D switch, watch desk rows), and the `--dry-capture` flag.
- `record.mjs`: stores the source `url` per take and deletes this run's own temporary screencast JPEGs once each take is encoded. The last render had died with "No space left on device". JPEG quality is 88.
- `assemble.mjs`: renders to `*.partial.mp4`, probes it, and only then renames it to the deliverable, so an interrupted render can no longer leave a corrupt `pyre-witness-demo.mp4`. It also refuses takes that were not recorded from 4120.
- `shots/capture.mjs` (rewritten: Describe device, landing, escalation, tour, loss, move), `shots/view3d.mjs` (new), `shots/lens.mjs`, `shots/watch.mjs`, `shots/proof.mjs`, `shots/transcript.mjs` (rewritten), `shots/index.mjs` (new order and end card text). `shots/sim.mjs` is kept but is not in this cut.
- Helpers: `explore2.mjs`, `explore3.mjs` (screenshots, no captures), `fpsprobe.mjs`, `frames.mjs` (frame strips for review).

## Things in the app that looked wrong while recording

1. **"T1694.001 Default Credentials"** is in the capture's risk list. That is not an ATT&CK for ICS ID; ICS Default Credentials is T0812. Check whether it passed `isKnownTechnique`. It is visible in the rail during the answer beat (small).
2. **The page stalled after `Move there`.** A 3.2 s wait in the recorder took about 33 s of wall time. The UI had already updated (risk 47 within about 2.6 s), but the main thread or compositor was blocked for half a minute after the move. This is worth profiling before the live demo.
3. **Two tooltips at once.** In the Data lens on 4119, "Describe dev…" and "Upload photos" tooltips overlapped at the bottom-left dock (`demo/out/explore2/03-data.png`).
4. The escalation card writes the path with ASCII arrows ("Internet -> CAM-901 -> SW-F3 -> FIL-3") while the rest of the UI uses "→".
5. The lens switched to `Both` by itself when the capture answer arrived. It may be intended, but it was unexpected.
6. Minor: the transcript take was captured at only 17 fps (the machine was busy). It is a static drawer, so it is not noticeable.

## Known gaps

- The CAM-901 landing moment is inside the x9 crew piece. My landing detector only saw the new floor asset when the answer arrived, so the "lands" beat did not get its own real-time piece.
- I could not remove the old 4119 takes in `demo/out/shots/` (deletion was denied). New takes overwrote the same filenames, and the manifest's `url` check keeps old takes out of the cut. `demo/out/rehearsal-NOT-FINAL.mp4` also remains.
- My first exploration run used an unescaped URL path and may have created a stray folder `/Users/pablo/Gemini%20Hackathon/demo/out/explore2/` outside the repo. I could not check because listing outside the repo is blocked.
- No audio track.
