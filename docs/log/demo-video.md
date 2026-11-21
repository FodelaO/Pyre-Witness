# Pyre Witness demo video

The PLC cut was recorded on November 21, 2026 from `http://localhost:4120`, build marker `15:29:05`. `demo/out/pyre-witness-demo.mp4` is **58.000000 seconds**. FFprobe reports H.264 High, 1920 × 1080, 30 fps, 1,740 frames and yuv420p. The previous 58.166667-second cut is preserved as `demo/out/pyre-witness-demo.prev.mp4`.

## Shot list

| Video time | Speed | On-screen action |
| --- | --- | --- |
| 00:00–00:04 | Still | Title card. “Snap any device. See where it belongs and what risk it brings.” |
| 00:04–00:14 | 1× | Upload and submit the real Siemens SIMATIC S7-300 photo. The enlarged inset shows the uploaded image. The pin was set just inside Filler 3 near the visitor side of the packaging approach. The pin flow briefly opens 2D before the take and automatically returns to 3D. |
| 00:14–00:15 | 4× | Four seconds of waiting for the real pipeline, marked `x4` in the video. |
| 00:15–00:18 | 1× | Scout reads the image and displays its evidence beside the pinned spot. |
| 00:18–00:22 | 1× | The rules engine checks the plant and stamps the drawing. |
| 00:22–00:26 | 1× replay | PLC-901 drops into the plant. This replays the actual landing from slightly earlier in the same take. |
| 00:26–00:29.33 | 1× | The check flags exposed ports near visitor access. The rail also shows the washdown and unmanaged-device findings. |
| 00:29.33–00:32.67 | 1× | The app estimates $34k per event at the pin and $12k at the recommended placement. |
| 00:32.67–00:36 | 1× | Click `Move there` to relocate PLC-901 to water treatment. Risk drops from 47 to 46. |
| 00:36–00:45 | 1× | Show the 3D process view and pick finished syrup tank TK-203. The simulated readings are 62% full and 21.9 °C. |
| 00:45–00:54 | 1× | Open live monitoring from the green dot. A CISA result is matched to the plant firewall at $7.7k estimated per event. An openFDA orange juice recall is matched to the filler at $3M estimated per comparable event. |
| 00:54–00:58 | Still | End card with the crew's jobs and `github.com/FodelaO/Pyre-Witness`. |

The final video uses straight cuts through pauses and holds the caption across related views. `demo/out/timeline.json` records exact frame boundaries. `demo/out/manifest.json` records the build, take times, model classification and visible values. The video has no audio.

## Photo and recording notes

- `eval/dataset/images/photo-032.jpg` shows a Siemens SIMATIC S7-300 PLC panel. Run 4 and Run 5 each classified this file as `plc_cabinet`. The recording used one real photo Analyze request. The live result classified it as a Siemens SIMATIC S7-300 PLC (CPU 314C-2 DP). Analyze to completion took 18.55 seconds. The photo is credited during upload and displayed at preview scale. [GiovanniLibonati, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Plcmundi_clp_tipical_aplication.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
- The rules engine reported zero new attack paths for this PLC. The as-dropped panel said “passed placement” while the answer warned “Never here” and listed three findings. The cut shows the checked risks and the visible plant topology.
- The panel's feed status showed it was checked at 15:38 EST. The selected CISA entry displayed an age of nine days and the openFDA recall 24 days. The figures are the app's estimated losses for its simulated plant. The feed fetched during filming includes older active notices.
- The first attempt to frame the tank after the move failed to find its 3D label. The 3D process and watch footage came from a fresh live page on the same build marker. The browser runner used its installed WebGL2 headless-shell fallback after installed Chrome failed to launch in this session.

## Refresh and verification

`bash demo/loop.sh` polls the build marker and renders the newest pending build when the ten-minute cooldown expires. `bash demo/loop.sh --once` performs one refresh with the same cooldown. The watcher re-records the process and news and reuses the successful PLC take from the same New York calendar day. A fresh capture is explicit with `--once --with-capture`. `--once --no-record` recuts the verified takes already recorded for the current build. Each attempt appends its time, marker, render duration, and outcome to `demo/out/loop.log`. Successful attempts also log the media duration.

The assembly validates the complete candidate with `ffprobe` and stages its review artifacts before replacing the video. The release was rendered through `bash demo/loop.sh --once --no-record`, decoded end to end, and reviewed in `demo/out/contact-sheet.jpg` and at the title and speed-label frames. The nine captions contain at most eight words and hold for at least three seconds each. A failed test render retained the prior output. Successive marker changes during cooldown queued the newest build. `npm run typecheck` passed. Vitest passed 783 tests and skipped 3.

Changes are under `demo/` and this log. No shared contract changes were needed.
