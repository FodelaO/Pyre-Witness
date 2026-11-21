# Pipeline lens

The `/lens` review uses the Bebidas del Norte Line 3 seed and preserves equipment coordinates across Material, Both and Data. Material is the initial stop, and the last committed mode persists in the browser. During a drag the exposed layers cross-fade continuously. The slider snaps on release and accepts `1`, `2`, `3`, arrow keys, Home and End while focused.

## Derivation

- The seed draws 41 declared network cables, nine IEC 62443 zone hulls, ten conduit gates, 61 nominal flow legs and 33 process taps. Routes use the shortest active cable path by hop count and follow any declared waypoints. An isolated or offline segment carries no modeled packets. Offsite legs and hardwired I/O use separate schematic line styles.
- Signal taps use explicit references, telemetry tags, pipe adjacency, tag suffixes and geometry to associate equipment with field devices. The controller comes from the device's network cell. Hover publishes the ordered chain through the existing shared twin highlight state.
- Software comes from the watch inventory helper and falls back to the twin's cyber profile. Seed chips are labelled assumed for the simulated plant. Badges count distinct cyber findings and advisory IDs grounded in finished watch reports against the current inventory identity. Unsupported inventory has no invented version or advisory.
- The model is memoized by twin identity. Telemetry-only updates reuse the same drawing when topology and signal inputs are unchanged. CSS animates network and process flow, honors reduced motion, and pauses hidden data packets.

## Mounting

| Element | Lens treatment |
| --- | --- |
| Blueprint, instrument symbols, crew, placement pin | Shared |
| Physical zones and entries, process readings and process/utility pipes | `lens-material-only` |
| Process equipment | `lens-ghost-in-data` |
| Control and IT equipment | `lens-ghost-in-material` |
| Digital entries, software, findings, conduit gates and packets | `DataLayer` |
| Risk-report paths | `lens-data-only` |
| Process-to-control taps | `ConnectorLayer` |
| Simulation | Material or Data class by scenario family |

The [integration guide](../../src/layers/README.md) gives exact mounts, camera detail threshold, and mode behavior for the results rail, simulation launcher and capture control. This workstream owns the new layers and review route. The app-shell integration is a separate workstream.

## Verification

Run `npm run typecheck` and `npx vitest run src/layers --maxWorkers=1`. Open `http://localhost:4119/lens`, drag across the track and try the keyboard stops. In Both, hover `FIL-3` to trace the filler, instruments, PLC, supervisory and historian chain. In Data, hover or select a node with an assumed inventory identity to see its software chip, or zoom in to see nearby chips.

Typecheck, scoped ESLint and all 12 lens tests passed. The full suite passed 344 tests with three skipped. Live Chromium checks covered pointer drag, stop clicks, keyboard stops, persistence on reload, bidirectional equipment/controller highlighting, digital-entry selection, reduced motion and software zoom detail. A 120-frame sample at 1920 × 1080 in Both measured about 16.7 ms per frame. The browser reported zero page errors.

| Mode | 1440 × 900 | 1920 × 1080 |
| --- | --- | --- |
| Material | [Screenshot](shots/lens-material-1440x900.png) | [Screenshot](shots/lens-material-1920x1080.png) |
| Both | [Screenshot](shots/lens-both-1440x900.png) | [Screenshot](shots/lens-both-1920x1080.png) |
| Data | [Screenshot](shots/lens-data-1440x900.png) | [Screenshot](shots/lens-data-1920x1080.png) |
| Both with filler chain highlighted | | [Screenshot](shots/lens-chain-1920x1080.png) |

## Model boundaries

Gate state represents the twin's declared enforcement. Flow direction and protocol are nominal twin interpretations. Packet animation represents those flows symbolically. Advisory badges require evidence from a matched Threat Watch run. The standalone review opens with the seed and makes no provider calls.

The review route includes its static CSS directly because the shared Turbopack development loader intermittently served a stylesheet with another file's transformed content. The floor integration uses the regular component imports. Verify that the mounted utilities and overlay inks are present in the browser.
