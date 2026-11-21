# Capture

The capture card gives the plant one place to take up to three laptop photos, choose files, drop or paste images, enter an HTTP(S) product link, or describe a device. The camera opens on demand and releases its tracks on tab change, collapse, phone pairing, and analysis. Both devices use the same encoder, which keeps the original aspect ratio and emits JPEG at quality 0.85 with a long edge of at most 1600 px.

The location chip arms the floor and resolves the chosen area name. Analysis sends the pinned location or `DEFAULT_DROP`, then shows crew progress from the run store. Cancel restores the form and retry keeps the draft. A completed run shows the device type and a New capture action.

The Phone button opens a same-network QR with a six-character code. The standalone `/capture` route serves its controls directly over HTTP, independent of Next's development WebSocket. The phone page uses native camera and library file inputs, with an optional note. A separate desktop key protects the SSE receiver. Each session retains its latest batch in memory for reconnects and expires after ten minutes. Batches hold one to three JPEGs, each capped at 4 MiB of base64. Photos that arrive during analysis or with a full draft wait for the user to add or replace them.

## Files

- `src/capture/` contains the desktop card, camera, location chip, progress, photo draft, QR receiver, shared JPEG encoder, and sizing tests.
- `src/app/capture/` contains the standalone phone page and its local assets.
- `src/app/api/handoff/` exposes LAN discovery, photo upload, and SSE. `src/handoff/` contains the wire format, bounded request reader, stream client, mailbox, and store tests.

## Verification

- `npm run typecheck` and scoped ESLint passed.
- `npm run test -- --maxWorkers=1` passed with 102 tests and 3 skips. The default parallel run exceeded the existing rules engine's 15 ms p95 threshold.
- Chromium on the running app exercised camera controls with canvas-backed video, permission fallback, file upload, drop, paste, pinning, Enter, Escape, progress, a staged error, retry, cancel, and the completion chip. Analysis used lifecycle fixtures for transport checks.
- A phone-sized Chromium page opened the generated QR URL over the laptop's LAN address, resized a 2500 × 1400 image to 1600 × 896, and sent it with a note. The photo and note appeared on the desktop and were included in the analysis request. Live HTTP checks also covered upload limits, receiver isolation, and SSE replay.

## Known gaps

Physical laptop cameras, Safari, and iOS and Android devices need hands-on checks. Native Safari access was unavailable, and the automated WebKit browser could not launch in this environment. A successful live Gemini run was outside the capture verification. Phone reachability at the venue depends on its Wi-Fi allowing device-to-device connections.
