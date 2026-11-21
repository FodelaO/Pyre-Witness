# Fit Preview

The results panel mounts `FitPreview` once the current run has a profile and an assessment. It reads `captureThumbnail` directly from the run store. Tile actions become available when analysis finishes and generate on click with a loading skeleton. The rules engine checks the device’s current position and supplies up to two blocking titles for the red tile. Moving to a clear position removes that tile. Generated images can be enlarged, regenerated, and downloaded.

## Prompt design

The prompt uses observed device shape, material, size, and visible port types. The live twin contributes the room’s conditions, overlapping zones, nearby equipment names and kinds, and measured offsets from the device. The Architect supplies its position hint and physical installation constraints. Both scenes use the first capture photo for device identity when available. The as-placed scene uses the current pin and keeps the findings in the UI overlay. The illustration is eye-level and photorealistic, with no people, text, logos, or warning graphics.

## API

`POST /api/fit` accepts `{ profile, image?, placement: { areaId, nearAssetId?, positionHint, constraints }, variant }`, where `variant` is `recommended` or `as_dropped`. The UI also supplies optional visual facts in `scene` so changes to the live twin reach the model. Requests without `scene` use the seed twin.

`MODEL_IDS.image` runs through the shared `v1beta` Gemini Interactions client. Text-only requests use a plain string. Photo requests use a text block and an inline image block with `type`, `mime_type`, and base64 `data`. The route requests a 4:3 1K JPEG with `response_format`, uses `minimal` image thinking for latency, and sets `store: false`. The response is `{ image: { mimeType, dataBase64 }, prompt }`. [Google’s image generation guide](https://aistudio.google.com/docs/image-generation.md)

The in-process LRU holds up to 24 completed results for 15 minutes. The key includes the profile hash, placement, variant, visual scene, and reference photo digest. `?regenerate=1` bypasses the cache and replaces the cached result only on success. The request abort signal and a 50-second deadline cancel generation. SDK retries are disabled for this image request. API errors are JSON.

## Live verification on 2026-11-21

Both `/api/analyze` runs on port 4119 emitted a Chief briefing and completed before any `/api/fit` request for those runs. The photo briefing arrived at 190.3 s and the text briefing at 183.1 s. Fit generation uses a separate request initiated by the tile after analysis finishes.

| Capture | Recommended | As placed |
| --- | ---: | ---: |
| Photo-005, desktop Wi-Fi/4G gateway | 18.34 s | 24.36 s |
| Text-only wired Modbus gateway | 9.97 s | 9.70 s |

Times are single uncached requests measured from POST through response parsing, using `minimal` thinking. Cache checks returned identical image bytes in 38–170 ms. One earlier text request reached the 50-second deadline at the default thinking level and returned JSON HTTP 504. Both text variants succeeded with the final settings.

The saved JPEGs are 1200 × 896. Both retain the photographed gateway’s black housing, twin paddle antennas and silver indicator strip. The recommended shot shows a dry cabinet by the bottling hall and the as-placed shot shows the filler operator panel and washdown floor. Visual review found no people, legible text or recognizable logos. The saved recommended render used a tighter framing hint at the same assessed location and took 15.92 s.

- [Recommended](shots/fit-gateway-recommended.jpg)
- [As placed](shots/fit-gateway-as-placed.jpg)

AI-generated visualisations adapted from Kskhh’s dataset reference photo. [Huawei 4G+ Modem.jpg](https://commons.wikimedia.org/wiki/File:Huawei_4G%2B_Modem.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

`npm run typecheck` and `npx vitest run src/fit --maxWorkers=1` passed on the final tree, with six Fit Preview tests. An earlier typecheck picked up a transient eval snapshot. A fresh standard typecheck cleared it.

## Remaining verification

Chrome reached the live capture form and the local handoff endpoint accepted the dataset photo. Shared Chrome focus changes, a dev refresh and a subsequent ScreenCaptureKit failure interrupted the mounted results check. The final browser flow from capture to completed tiles and its live lightbox, download and regenerate actions remain unverified. The earlier isolated browser check covered both tile labels, the blocking finding, removal of the red tile after a move, and Escape dismissal of the lightbox.
