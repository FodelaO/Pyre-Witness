# Capture retry and asset identity

| Bug | Changed files | Verified on the development server at port 4119 |
| --- | --- | --- |
| CAP-02 | `src/pipeline/client.ts`, `src/pipeline/client.test.ts`, `src/capture/CaptureCard.tsx` | Interrupted the real stream after perception. Retry removed the draft's provisional PLC before sending the twin to the server. The original and retried placements each showed only PLC-901 at (700, 640), with risk 46.71. A separate unit assertion covers starting a fresh capture with identical input. |
| CAP-03 | `src/capture/usePhotoDraft.ts`, `src/capture/usePhotoDraft.test.ts`, `src/capture/CaptureCard.tsx` | Selected the PLC sample with a staged mug and with an empty draft, then interrupted the request. In both cases, the sample payload, restored thumbnail and Retry payload matched byte for byte (SHA-256 prefix `374fc4c804c17730`). |
| CAP-04 | `src/alternatives/captureContext.ts`, `src/alternatives/captureContext.test.ts`, `src/alternatives/BetterOptions.tsx` | Removed the assessed Siemens PLC, then selected its Allen-Bradley replacement at placement. The first alternatives request for reused tag PLC-901 named the MicroLogix 1100 and occurred after its own assessment. |

Run `npx tsc --noEmit` and `npx vitest run src/capture src/pipeline src/alternatives` from the repository root. Each regression was observed failing before its fix. No shared contract changes were needed.
