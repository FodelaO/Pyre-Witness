# Pyre Witness demo storyboard (60 s maximum)

> **Final cut (2026-11-21, 58.17 s, recorded from the final build on port 4120):** the shot list, with
> timestamps and which parts are real time and which are sped up, is in `docs/log/demo-video.md`. The
> cut order is in `demo/shots/index.mjs`. The sections below are the earlier v0 plan and are kept for history.

This storyboard is the source of truth for the cut. Shot modules live in `demo/shots/*.mjs`, and their order is set in `demo/shots/index.mjs`. Every shot is a real interaction with the running app at http://localhost:4119. Shots marked PENDING are recorded only once the feature they need works for real.

## Cut v0 (recorded 2026-11-21, 37.6 s)

Each crossfade between shots lasts 0.15 s. Captions fade in after 0.25 s and fade out before each cut.

| # | Shot id | Time in cut (s) | Length | Caption (7 words max) | Real interaction |
|---|---|---|---|---|---|
| 0 | title | 0.00-2.00 | 2.0 | (none) | `demo/assets/title-card.png` |
| 1 | hook | 1.85-7.85 | 6.0 | A living twin of bottling Line 3 | The floor runs live: pipes animate and the crew walks on idle patrol. The cursor glides to Filler 3 (`FIL-3`) and clicks it, and the app opens its selection card. |
| 2 | linked | 7.70-15.20 | 7.5 | Floor and Purdue map stay linked | Click **Split**, then click `PLC-F3` on the floor. The Purdue node and the inspector highlight it. Then click `HMI-F3` on the Purdue map, and the floor highlights it. |
| 3 | scenario | 15.05-22.55 | 7.5 | Simulate a CIP caustic crossover | Click **CIP Crossover** in the Simulate dock at 4× speed. The deterministic replay runs and the ZSC-311 permissive contains it at 00:12. Four mitigations appear in the panel, awaiting approval. |
| 4 | mitigate | 22.40-29.40 | 7.0 | Approve the fix, rerun: contained sooner | Approve **Isolate CIP branch**, then click **Rerun**. The replay is now contained at 00:06 by CIP branch isolation. |
| 5 | risk | 29.25-34.75 | 5.5 | Approve isolation: plant risk drops | Approve **Isolate controller access**. The rules engine re-scores the plant from 46 (Elevated) to 22 (Guarded), shown as -24 in the top bar. |
| 6 | end | 34.60-37.60 | 3.0 | (none) | `demo/assets/end-card.png` |

## Target arc (full cut, once the pending shots exist)

| Slot | Seconds | Shot | Caption idea |
|---|---|---|---|
| 0-6 | 6 | hook | A living twin of bottling Line 3 |
| 6-24 | 18 | **capture** (PENDING) | Snap a device, the crew investigates |
| 24-32 | 8 | **landing** (PENDING) | New device, new attack path |
| 32-38 | 6 | **recommended-move** (PENDING) | Move it where it belongs: risk drops |
| 38-43 | 5 | linked (trimmed) | Floor and Purdue map stay linked |
| 43-52 | 9 | scenario + mitigate (trimmed) | Simulate, approve, rerun: contained |
| 52-57 | 5 | **threat-watch** / **proof** (PENDING) | Daily threat watch, measured accuracy |
| 57-60 | 3 | end card | |

The full cut will need cuts to fit 60 s. Shorten the scenario, mitigate and linked shots, and fold the risk shot into the move shot.

## Pending shots

| Shot | Needs |
|---|---|
| capture | `GEMINI_API_KEY` in `.env` and a real, openly licensed device photo in `eval/dataset/images/`. That folder does not exist yet. The take uses the capture dock's **Upload** control, then **Analyze**, and the crew walks on real pipeline events. |
| landing | The real `/api/analyze` result: the device lands on the floor with a red outline, a new attack path and a risk jump. |
| recommended-move | A real assessment that includes a recommended placement. The take moves the device there and shows the risk drop. |
| threat-watch | `GEMINI_API_KEY`. The take records a real watch run (**Run now**) and its human-approval step. |
| proof | A real evaluation report. `/proof` currently says "No evaluation report yet" and needs `npm run eval` with the key and a labeled dataset. |
