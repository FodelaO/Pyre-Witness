# Fit Preview

`FitPreview` mounts without props in the results panel once the current run has a profile and an assessment. Each tile generates on click. The rules engine checks the device’s current position and supplies up to two blocking titles for the red tile. Moving to a clear position removes that tile. Generated images can be enlarged, regenerated, and downloaded.

## Prompt design

The prompt uses observed device shape, material, size, and visible port types. The live twin contributes the room’s conditions, overlapping zones, nearby equipment names and kinds, and measured offsets from the device. The Architect supplies its position hint and physical installation constraints. Both scenes use the first capture photo for device identity when available. The as-placed scene uses the current pin and keeps the findings in the UI overlay. The illustration is eye-level and photorealistic, with no people, text, logos, or warning graphics.

## API

`POST /api/fit` accepts `{ profile, image?, placement: { areaId, nearAssetId?, positionHint, constraints }, variant }`, where `variant` is `recommended` or `as_dropped`. The UI also supplies optional visual facts in `scene` so changes to the live twin reach the model. Requests without `scene` use the seed twin.

`MODEL_IDS.image` runs through the Gemini Interactions SDK. The request sends a text block and optional inline image block with `type`, `mime_type`, and base64 `data`. It requests a 4:3 1K JPEG with `response_format` and sets `store: false`. The response is `{ image: { mimeType, dataBase64 }, prompt }`. [Google’s image generation guide](https://aistudio.google.com/docs/image-generation.md)

The in-process LRU holds up to 24 completed results for 15 minutes. The key includes the profile hash, placement, variant, visual scene, and reference photo digest. `?regenerate=1` bypasses the cache and replaces the cached result only on success. The request abort signal and a 50-second deadline cancel generation. API errors are JSON.

## Verification

- `npm run typecheck` and six focused Vitest tests passed. The tests cover prompt grounding, reference-photo instructions, cache identity, and actual placement findings.
- The full suite passed with `npm run test -- --no-file-parallelism` (205 passed, 3 skipped). The standard parallel run missed the existing Inspector performance budget.
- The running route on port 4119 returned JSON HTTP 400 for malformed input and HTTP 503 for valid input with no server key. An intercepted SDK request verified the image model, inline photo, image format, header authentication, and cancellation before network transmission.
- An isolated Chrome fixture verified both tiles, the rules-engine finding, removal of the red tile after a move, and Escape dismissal and focus return for the lightbox. Live image generation and resemblance require a configured key.

## Integration

```tsx
import FitPreview from "@/fit/FitPreview";
```

Mount `<FitPreview />` in the results panel’s active assessment section.

The pipeline owner needs to expose `captureThumbnail: CaptureImage | null` on `RunState`. Initialize and reset it to `null`, set it from the first submitted photo after the matching `run.started`, and retain the photo on reassessment of that same asset. Clear it for a new text or link capture. Keep photo bytes in browser memory. Fit Preview already consumes the optional field.

The sandbox blocked writes to `.agents/ref/gemini-docs/` and `.agents/requests/`. The downloaded guide is at `/private/tmp/pyre-witness-image-generation.md`. The capture contract request is recorded above. The coordination bridge could not write its audit log, so delivery to the pipeline owner is unconfirmed.
