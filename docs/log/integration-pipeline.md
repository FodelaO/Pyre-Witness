# Pipeline integration and hardening

## Recovery and grounding

- Product fetch, Decisions, Scout, Carbon, revision, and Chief retry HTTP 429 and 5xx once after an abortable 350 ms delay. Model stages share that retry with schema correction. SDK retries are disabled for these calls.
- Carbon can use completion text or fetch the completed stored interaction when the stream carries no text deltas. When revision lacks an interaction ID or fails, the Inspector records the reason and Chief receives the original grounded assessment.
- The server assigns risk, path and mitigation IDs, path provenance, proposal status and proposer. Each mitigation gets a separate rules-engine score delta against the twin at the device's current position. Proposed effects still require engineer approval. `add_protection` is accepted, and installed safeguards survive request validation.
- Carbon receives the overlapping zone IDs and combined restrictions at the candidate and every existing asset. The candidate retains its physical home room and exact coordinates.

## Capture and crew

- Link captures emit the fetch start before downloading HTML and the product image. Cancellation stops waiting on DNS and interrupts fetches and body reads. Validated image bytes travel on the SSE link event to the thumbnail store. Photo captures use the first image, and reassessment restores the selected device's thumbnail.
- Scout shows product-page progress. Architect and Inspector visit the actual reassessment pin while Scout stays in place. Chief starts walking on `summary.started` and presents the briefing on arrival. Final proposals enter the browser queue when the briefing starts, including when revision was skipped.

## Files

- Gemini request and response handling in `src/gemini/{transport,capture,assess,schemas}.ts`.
- Runner, grounding, validation and streaming in `src/pipeline/server/{run,groundAssessment,requests,sse}.ts`. Browser integration in `src/pipeline/{client,assetFromProfile}.ts`.
- Link cancellation in `src/link/{safeFetch,fetchProductPage,image}.ts` and crew cues in `src/crew/{director,crewStore}.ts`.
- Added coverage in `src/gemini/{capture,transport}.test.ts`, `src/pipeline/{assetFromProfile,client}.test.ts`, `src/pipeline/server/{groundAssessment,selfCheck,run}.test.ts` and `src/pipeline/server/__fixtures__/placement.ts`. Extended `src/link/fetchProductPage.test.ts` and the director and crew-store tests.
- Added product links to `scripts/smoke-pipeline.ts`. The shared contracts needed no change requests.

## Verification

- `npm run typecheck` and lint on the touched TypeScript files passed. The required focused Vitest run passed 130 tests across 14 files. The full suite passed 262 tests across 42 files with 3 skipped.
- A live POST to `http://localhost:4119/api/analyze` emitted `run.started`, `link.started` and `link.fetched`, then stopped at the gate with the missing-key error. The real product page and PNG took 215 ms to fetch. [AXIS M3085-V Dome Camera](https://www.axis.com/products/axis-m3085-v)
- The smoke CLI reached the missing-key gate in text, `photo-002.jpg` and link modes. The direct link fetch took 318 ms.
- `.env` was absent at the start and the final recheck. Gemini admission, perception, Carbon generation and continuation, Chief briefing, provider-side schema acceptance, and model latencies remain unverified. The link fetcher still has the socket-level DNS pinning gap recorded in the link handoff.

```sh
npx tsx --env-file=.env scripts/smoke-pipeline.ts "Industrial Ethernet pressure transmitter with a 4–20 mA output"
npx tsx --env-file=.env scripts/smoke-pipeline.ts "Identify the pictured device" eval/dataset/images/photo-002.jpg
npx tsx --env-file=.env scripts/smoke-pipeline.ts --link https://www.axis.com/products/axis-m3085-v
```
