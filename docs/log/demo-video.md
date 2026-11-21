# Demo video pipeline (task: demo-video)

## Output (cut v0)

The file is `demo/out/pyre-witness-demo.mp4`. ffprobe reports a duration of **37.60 s**. It is 1920x1080, H.264 High, yuv420p, 30 fps, with faststart and no audio track. The file is 10.6 MB (10,572,521 bytes).

`demo/out/contact-sheet.jpg` holds one frame every 3 s in 4 columns, for quick review.

To re-cut, run this from the repo root with the dev server running:

```
node demo/make.mjs
```

It records each shot, then assembles the cut, then writes the contact sheet. At the end it prints the output path, the duration, the timeline, and the skipped and pending shots. `assemble` fails if the duration is over 60.0 s.

Variants:
- `node demo/make.mjs --only risk` re-records one shot and re-assembles. A comma list also works.
- `node demo/make.mjs --no-record` only re-assembles.
- `node demo/record.mjs --only <shot>` re-records a shot without assembling.

## Storyboard as recorded

| Time in cut (s) | Shot | Caption | What really happens |
|---|---|---|---|
| 0.00-2.00 | title card | (none) | `demo/assets/title-card.png` |
| 1.85-7.85 | hook | A living twin of bottling Line 3 | The floor is live and the crew is on idle patrol. The cursor glides to FIL-3 and clicks it, and the selection card opens. |
| 7.70-15.20 | linked | Floor and Purdue map stay linked | Split view. Clicking PLC-F3 on the floor highlights the Purdue node and opens the inspector. Clicking HMI-F3 on the Purdue map highlights the floor. |
| 15.05-22.55 | scenario | Simulate a CIP caustic crossover | The CIP Crossover scenario runs at 4×. The ZSC-311 permissive contains it at 00:12, and 4 mitigations wait for approval. |
| 22.40-29.40 | mitigate | Approve the fix, rerun: contained sooner | After approving "Isolate CIP branch" and clicking Rerun, the replay is contained at 00:06 by CIP branch isolation. |
| 29.25-34.75 | risk | Approve isolation: plant risk drops | After approving "Isolate controller access", the risk score drops from 46 (Elevated) to 22 (Guarded), shown as -24. |
| 34.60-37.60 | end card | (none) | `demo/assets/end-card.png` |

Each crossfade lasts 0.15 s. The full shot list and the target 60 s arc are in `demo/storyboard.md`.

## Pending shots

| Shot | Needs |
|---|---|
| capture | `GEMINI_API_KEY` in `.env`. There is no `.env` today, only `.env.example`. It also needs a real, openly licensed device photo in `eval/dataset/images/`, and that folder does not exist yet. The take uploads with the dock's Upload control, then clicks Analyze, and the crew walks on real pipeline events. |
| landing | The same as capture. The device lands with a red outline, a new attack path and a risk jump, all from the real `/api/analyze` result. |
| recommended-move | The same as capture. It needs a real recommended placement to move the device to, then shows the risk drop. |
| threat-watch | `GEMINI_API_KEY`. The take records a real Threat watch run ("Run now") and its human approval. |
| proof | A real evaluation report. `/proof` shows "No evaluation report yet" and needs `npm run eval` with the key and a labeled dataset. |

None of the recorded shots were skipped.

## Problems seen in the app (most important first)

1. **Unrounded float in the crew patrol bubble.** The bubble reads "idle patrol · LT-301 60.00026772523983 % · in band". It appears often, on top of the floor, and it is in almost every take. Round it to 0 or 1 decimal places. See `demo/out/explore/01-home.png` (new UI) and `demo/out/explore/final-9.png`.
2. **Simulation buttons ignored real mouse clicks.** This happened in both the old launcher cards and the first version of the new Simulate dock. A Playwright mouse click on "CIP Crossover", "4×" or "Rerun" did nothing, while keyboard Enter worked. `elementFromPoint` returned the button, so a pointer handler higher up probably swallowed the click. Pointer capture in `useFloorGestures` is a likely cause, through React portal bubbling. In the final takes, mouse clicks worked, so this looks fixed in the latest UI, but it should be confirmed. The recorder still falls back to keyboard activation and logs it if clicks stop working again. See `demo/out/explore/06-sim-7.png`, where the click had no effect.
3. **Two `section.pw-sim-controls` render at once.** One has `data-mount="floor"` and one has `data-mount="shell"`, so the launchers are duplicated in the DOM, with one copy hidden. This seems to be what broke mouse clicks for a while. Check `SimFloorAdditions` / `SimControls` mounting.
4. **Split view wastes the floor pane.** The floor is scaled to fit the pane's width, which leaves about 230 px of empty space above it and about 250 px below it. The plant becomes small and hard to read. See `demo/out/explore/final-11.5.png`.
5. **Runtime errors on the main page during the session.** The page raised "ctx.hasDisabledLink is not a function" (4 times) and "Unexpected token '['". The red Next.js "1 Issue" badge showed over the capture dock. See `demo/out/explore/20-sim-start.png`. The dev badge also shows "-10" issues at other times. The recorder hides `nextjs-portal`, so the badge does not appear in the video.
6. **Floor labels overlapped mid-session.** During one hot reload, tag labels were drawn twice and overlapped across the whole floor. See `demo/out/shots/mitigate-failed.png`. This looked transient, so check the label placement change.
7. **The SIMULATION tag and outcome icon sit on top of PLC-BL.** In the Blending area, the floating "SIMULATION" tag and the shield icon hide the PLC-BL label. See `demo/out/explore/final-33.png`.
8. **The "Isolate CIP branch" mitigation projects and measures "0".** It is the fix that halves time-to-containment, yet the panel shows 0 risk delta. Viewers may read that as useless. Consider showing the containment-time gain as well. See `demo/out/explore/final-33.png`.
9. **Old UI only, so likely obsolete.** The capture card covered the Purdue L0/L1 labels, and the labels in the Purdue level gutter were truncated ("Vendor clouds, re…"). The NH3 area label overlapped the "UTILITIES" title. The screenshots of these were overwritten when I explored the app again, so this matters only if those components come back.

## How it is built (all under `demo/`)

- **`record.mjs`** opens a fresh browser context for each shot. It runs `setup` unrecorded: these are real clicks that reproduce the earlier state. It then records `run` with a CDP `Page.startScreencast` (JPEG q92, 1920x1080, real timestamps). `lib/recorder.mjs` turns the frames into a constant-30-fps H.264 clip with the ffmpeg concat demuxer, holding each frame until the next one arrives. Capture averaged about 90 fps.
  - A missing selector raises `MissingFeature`. The shot is skipped and logged in `out/manifest.json`, and recording carries on without crashing.
- **`shots/*.mjs`** holds one module per shot: `{id, caption (7 words max), duration, setup, run}`. `shots/index.mjs` sets the order and lists the PENDING shots.
- **`lib/app.mjs`** holds the selectors and shared actions. The selectors are roles, `data-floor-asset`, `.pw-purdue-node[data-asset]` and the aria-labels. They work with both the old and the new sim UI.
- **`lib/cursor.mjs`** adds a cosmetic cursor overlay (`pointer-events: none`) that only mirrors the real mouse events Playwright sends, plus a click ripple. Glides use time-based easing. It also hides the Next.js dev badge.
- **`assemble.mjs`** renders the caption plates as transparent PNGs with Playwright, because this ffmpeg 8 build has no `drawtext`. Plates are lower-left, Helvetica Neue 36 px semibold, on a dark plate with an ember accent bar. The script trims each shot to its storyboard duration, holding the last frame if a shot runs short. It adds the 2 s title card and 3 s end card, crossfades everything with `xfade` (0.15 s), and encodes with x264 CRF 17. It writes `out/timeline.json`, runs ffprobe, and fails if the result is over 60 s.
- **`contact-sheet.mjs`** writes `out/contact-sheet.jpg` with one frame every 3 s.
- **`lib/browser.mjs`** falls back to the newest Chromium in `~/Library/Caches/ms-playwright`. Playwright 1.65 expects build 1255, which is not downloaded, and nothing was installed.
- **`explore.mjs`** is an exploration helper that writes screenshots to `out/explore/`.

## Honesty notes

- Every frame comes from the real app. Nothing is mocked, injected or typed into the DOM.
- The two overlays are only the cosmetic cursor and the hidden dev-tools badge.
- Captions are added after recording, outside the app.
- The scenario caption says "Simulate", and the app labels the replay "SIMULATION".
- On the stock plant, the scenario is contained, so the caption does not claim a catastrophe.

## Known gaps

- Shots depend on asset IDs (FIL-3, PLC-F3, HMI-F3) and on the mitigation titles "Isolate CIP branch" and "Isolate controller access". If the seed or the mitigation engine renames them, the shot is skipped with a clear message.
- The cut is 37.6 s because 5 of the target shots are pending.
- The frame times in this log are approximate.
